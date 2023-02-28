import { Configuration, OpenAIApi } from 'openai'

import { auth, sheets } from '@googleapis/sheets'
import { v4 as uuidv4 } from 'uuid'

import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager"
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
import { fromUtf8 } from '@aws-sdk/util-utf8-node'
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall } from '@aws-sdk/util-dynamodb'

import { generatePrompt, getSheetTab, head, HeadersDrillDown, Month, Prompt, _alphabet, _headersDrillDown, _headersMaster, _masterSheetTitle, _months, _promptChoices, _spreadsheet } from "./global"
import { APIGatewayEvent, EventBridgeEvent } from 'aws-lambda'

let TABLE_NAME = process.env.TABLE_NAME || ''
let TTL_KEY = process.env.TTL_KEY || ''
let IMAGE_FUNCTION_NAME = process.env.IMAGE_FUNCTION_NAME || ''

/**
 * Main processor for a single "<Month><Year>" page.
 * Will add 
 * 
 * @param event 
 * @returns 
 */
export const handler = async (event: APIGatewayEvent | EventBridgeEvent<string, {
  TABLE_NAME: string, TTL_KEY: string, IMAGE_FUNCTION_NAME: string
}>): Promise<{statusCode: number, body: string}> => {
  console.log(JSON.stringify(event, null, 2))

  let month: Month | undefined = undefined
  let year: number | undefined = undefined

  const now = new Date()
  if ((event as APIGatewayEvent).body) {
    const body = JSON.parse((event as APIGatewayEvent).body!) as { month: Month, year: string }
    if (body.month && !_months.includes(body.month)) 
      return { statusCode: 400, body: "month is not an acceptable value" }
    else month = body.month

    if (body.year && Number.parseInt(body.year) < now.getFullYear()) 
      return { statusCode: 400, body: `year needs to be a number larger than or equal to ${now.getFullYear()}` }
    else year = Number.parseInt(body.year)
  } else {
    if (!TABLE_NAME && (event as EventBridgeEvent<string, {TABLE_NAME: string, TTL_KEY: string, IMAGE_FUNCTION_NAME: string}>).detail.TABLE_NAME)
      TABLE_NAME = (event as EventBridgeEvent<string, {TABLE_NAME: string, TTL_KEY: string, IMAGE_FUNCTION_NAME: string}>).detail.TABLE_NAME
    if (!TTL_KEY && (event as EventBridgeEvent<string, {TABLE_NAME: string, TTL_KEY: string, IMAGE_FUNCTION_NAME: string}>).detail.TTL_KEY)
      TTL_KEY = (event as EventBridgeEvent<string, {TABLE_NAME: string, TTL_KEY: string, IMAGE_FUNCTION_NAME: string}>).detail.TTL_KEY
    if (!IMAGE_FUNCTION_NAME && (event as EventBridgeEvent<string, {TABLE_NAME: string, TTL_KEY: string, IMAGE_FUNCTION_NAME: string}>).detail.IMAGE_FUNCTION_NAME)
      IMAGE_FUNCTION_NAME = (event as EventBridgeEvent<string, {TABLE_NAME: string, TTL_KEY: string, IMAGE_FUNCTION_NAME: string}>).detail.IMAGE_FUNCTION_NAME
  }

  if (!month) { month = _months[(now.getMonth() + 1) % 11 ] }
  if (!year) { year = now.getFullYear() }

  console.log(`updateSchedule month: ${month}, year: ${year}`)
  
  console.log(`TABLE_NAME ${TABLE_NAME}`)
  const dynamo = new DynamoDBClient({})
  const lambda = new LambdaClient({})

  const smc = new SecretsManagerClient({})
  const rawsecret = (await smc.send(new GetSecretValueCommand({
    SecretId: "aiapparel/secret"
  }))).SecretString

  const rawcdkoutput = (await smc.send(new GetSecretValueCommand({
    SecretId: "aiapparel/cdk"
  }))).SecretString

  if (rawsecret && rawcdkoutput) {
    const secret = JSON.parse(rawsecret) as any
    const cdk = JSON.parse(rawcdkoutput) as any

    const authClient = await (new auth.GoogleAuth({ 
      credentials: secret.google,
      scopes: [ "https://www.googleapis.com/auth/spreadsheets" ]
    })).getClient()

    const tabName = `${month}${year}`
    const client = sheets({ version: "v4", auth: authClient })

    const masterTab = await getSheetTab(authClient, { tabName: _masterSheetTitle, lastRow: 200, lastColumn: "Z" })
    const tab = await getSheetTab(authClient, { tabName, lastRow: 200, lastColumn: "Z" })

    if (tab && tab.data && masterTab && masterTab.data) {
      const grid = masterTab.data[0] // should only be one, since we always submit only 1 range
      if (!grid) { return { statusCode: 500, body: `Tab ${_masterSheetTitle} range could not be found` } }
      
      const headers = head(_headersMaster, grid.rowData![0])

      // Should only be 1 tab with "<Month><Year>"
      for (const t of tab.data!) {
        if (!t.rowData || t.rowData.length <= 1) { console.warn(`This sheet, "${tabName}", has no rows. Skipping.`); continue }
        const drilldownHeaders = head(_headersDrillDown, t.rowData[0] )

        let values = [ _headersDrillDown ] as string [][]
        let dynamoPromises = []
        let imageRequests = [] as { socialId: string, tabName: string }[]

        for (const {r, i} of t.rowData!.map((r, i) => ({r, i}))) { 
          if (i === 0) { continue /** skip first row */ }
          else {
            console.log("getting Row ...")
            const a = r.values![drilldownHeaders["Row"]]?.effectiveValue?.numberValue
            console.log(a)
            if (!a) { console.warn(`"${tabName}" did not have a column for row: a = ${i}`); return { statusCode: 400, body: ``} }

            console.log("getting Holidays ...")
            const holiday1 = grid.rowData![a].values![headers["Holidy"]]?.effectiveValue?.stringValue
            console.log(`holiday1 OK: ${holiday1}`)
            const holiday2 = r.values![drilldownHeaders["Holiday"]]?.effectiveValue?.stringValue
            console.log(`holiday2 OK: ${holiday2}`)

            if (!( holiday1 && holiday2 && holiday1 === holiday2 )) {
              console.warn(`"Holidy" between Master sheet: "${_masterSheetTitle}" and "${tabName}" are different. 
                They are "${holiday1}" and "${holiday2}" respectively. Skipping.`); continue
            }

            let include = {} as {[k: Prompt]: string[]}
            for (const k of _promptChoices) {
              let columnName = capitialize(k)
              console.log(`column name: ${columnName}`)

              let rawdata = grid.rowData![a].values![headers[columnName]]
              console.log(rawdata)

              if (rawdata) {
                let data = rawdata.effectiveValue?.stringValue
                if (data) include[k] = data.split(",").map( v => v.trim())
                else { console.warn(`"${tabName}", row: ${i}, column: "${columnName}" is empty. Could be intentional.`) }
              }
            }
            
            console.log(`include: ${JSON.stringify(include, null, 2)}`)
            const p: { prompt: string, choice: { [k: Prompt]: string } } = generatePrompt(include)
            console.log(`PROMPT: ${JSON.stringify(p, null, 2)}`)

            const joke = getJoke(secret, { subject: p.choice.subject, holiday: holiday1 })
            console.log(`JOKE: ${JSON.stringify(joke, null, 2)}`)

            let post = { SocialId: uuidv4() } as {[k: HeadersDrillDown|string]: any}
            let dynamoPost = { socialId: post.SocialId, ...p.choice } as {[k: HeadersDrillDown|string]: any}

            for (const k of _headersDrillDown) {
              console.log(JSON.stringify(r.values!, null, 2))
              console.log(k)
              console.log(drilldownHeaders[k])
              if (r.values![drilldownHeaders[k]]) {
                if (k === "SocialId") { continue; /** skip */ }
                post[k] = r.values![drilldownHeaders[k]].effectiveValue?.numberValue
                dynamoPost[lowercase(k)] = r.values![drilldownHeaders[k]].effectiveValue?.numberValue

                if (post[k] === undefined || null) {
                  post[k] = r.values![drilldownHeaders[k]].effectiveValue?.stringValue || ""
                  dynamoPost[lowercase(k)] = r.values![drilldownHeaders[k]].effectiveValue?.stringValue || ""
                }   
              }
            }

            let month =  _months.indexOf( post.Month )
            console.log(`new Date(${post.Year}, ${month}, ${post.Day}, ${post.Hour}, ${post.Min})`)

            console.log(new Date(post.Year, month, post.Day, post.Hour, post.Min).getTime())
            dynamoPost[TTL_KEY] = Math.floor(new Date(post.Year, month, post.Day, post.Hour, post.Min).getTime() / 1000)
            //post[TTL_KEY] = Math.floor(new Date(post.Year, month, post.Day, post.Hour, post.Min).getTime() / 1000)
            
            post.Prompt = p.prompt
            post.Joke = (await joke) as string
            
            post.Vibe = p.choice.vibe
            post.Format = p.choice.format
            post.Subject = p.choice.subject
            post.Perspective = p.choice.perspective
            post.Artist = p.choice.artist
            post.Style = p.choice.style
            post.Booster = p.choice.booster

            dynamoPost.prompt = p.prompt
            dynamoPost.joke = post.Joke

            console.log(`post: ${JSON.stringify(dynamoPost, null, 2)}`)
            imageRequests.push({ socialId: post.SocialId, tabName })

            let GATEWAY_URI = ""
            for (const k of Object.keys(cdk["AIApparel-APIGatewayStack"])) {
              if (k.startsWith("SocialAPIEndpoint")) { GATEWAY_URI=cdk["AIApparel-APIGatewayStack"][k]; break }
            }
            if (!GATEWAY_URI) return { statusCode: 500, body: "Missing Gateway URI." }

            let v = Array(_headersDrillDown.length).fill("")
            for (const h of Object.keys(post)) {
              if (h === "SocialId") {
                v[drilldownHeaders[h]] = `=HYPERLINK("${GATEWAY_URI}/api/social/schedule/update/post?socialId=${post[h]}&tabName=${tabName}","${post[h]}")`
              } else if (_headersDrillDown.includes(h)) {
                v[drilldownHeaders[h]] = post[h]
              }
            }
            values.push(v)
          
            const command = new PutItemCommand({
              TableName: TABLE_NAME,
              Item: marshall(dynamoPost)
            })
            dynamoPromises.push(dynamo.send(command))
          }
        }

        console.log(JSON.stringify(values, null, 2))
        console.log( await client.spreadsheets.values.update({
          spreadsheetId: _spreadsheet,
          valueInputOption: "USER_ENTERED",
          range: `${tabName}!A1:${_alphabet.charAt(_headersDrillDown.length-1)}${values.length}`,
          requestBody: { values },
        }) )

        console.log(`image requests: ${JSON.stringify(imageRequests)}`)
        let lambdaPromises = []

        // generate first batch of images.
        for (const p of imageRequests) {
          console.log(JSON.stringify({
            socialId: p.socialId,
            tabName: p.tabName
          }))

          lambdaPromises.push(
            lambda.send(new InvokeCommand({
              FunctionName: IMAGE_FUNCTION_NAME,
              Payload: fromUtf8(JSON.stringify({
                queryStringParameters: {
                  socialId: p.socialId,
                  tabName: p.tabName
                }
              }))
            }))
          )
        }

        await Promise.all(dynamoPromises)
        await Promise.all(lambdaPromises)
      }
      return { statusCode: 200, body: "OK" }
    }
    return { statusCode: 500, body: "Server Error" }
  }
  return { statusCode: 500, body: "Server Error" }
}

const getJoke = async (
  secret: { openai: { organization: string, apiKey: string }},
  p: { subject: string, holiday: string }
) => {
  // Open AI
  const configuration = new Configuration({
    organization: secret.openai.organization,
    apiKey: secret.openai.apiKey,
  })

  const openai = new OpenAIApi(configuration)

  const prompt = `What are the top 5 funniest jokes about ${p.subject} for ${p.holiday}?`
  console.log(prompt)

  // https://beta.openai.com/playground/p/default-chat?model=text-davinci-003
  const response = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: `"The following is a conversation with an AI assistant. The assistant is helpful, creative, clever, and very friendly.\n\nHuman: Hello, who are you?\nAI: I am an AI created by OpenAI. How can I help you today?\nHuman: ${prompt} \n`,
    temperature: 0.9,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0.6,
    best_of: 1,
    max_tokens: 150,
    stop: [" Human:", " AI:"]
  })
  console.log(JSON.stringify(response.data, null, 2))

  return response.data.choices[0].text
}

const capitialize = (string: string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

const lowercase = (string: string) => {
  return string.charAt(0).toLowerCase() + string.slice(1);
}

