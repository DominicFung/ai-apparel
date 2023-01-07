import { Configuration, OpenAIApi } from 'openai'

import { auth } from '@googleapis/sheets'
import { v4 as uuidv4 } from 'uuid'

import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager"
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall } from '@aws-sdk/util-dynamodb'

import { generatePrompt, getSheetTab, head, HeadersDrillDown, Month, Prompt, _headersDrillDown, _headersMaster, _masterSheetTitle, _months, _promptChoices } from "./global"

const TABLE_NAME = process.env.TABLE_NAME || ''
const TTL_KEY = process.env.TTL_KEY || ''

/**
 * Main processor for a single "<Month><Year>" page.
 * Will add 
 * 
 * @param event 
 * @returns 
 */
export const handler = async (event: any): Promise<{statusCode: number, body: string}> => {
  console.log(event)
  if (!event.body)        return { statusCode: 400, body: "bad request" }
  const body = JSON.parse(event.body) as { month: Month, year: string }

  if (!body.month)  return { statusCode: 400, body: "missing month" }
  if (!_months.includes(body.month)) 
    return { statusCode: 400, body: "month is not an acceptable value" }

  if (!body.year)   return { statusCode: 400, body: "missing year" }
  if (Number.parseInt(body.year) < 2022) return { statusCode: 400, body: "year needs to be a number larger than 2022" }
  
  const b = {
    month: body.month as Month,
    year: Number.parseInt(body.year)
  }
  
  console.log(`TABLE_NAME ${TABLE_NAME}`)
  const dynamo = new DynamoDBClient({})

  const smc = new SecretsManagerClient({})
  const command = new GetSecretValueCommand({
    SecretId: "aiapparel/secret"
  })
  const rawsecret = (await smc.send(command)).SecretString

  if (rawsecret) {
    const secret = JSON.parse(rawsecret) as any

    const authClient = await (new auth.GoogleAuth({ 
      credentials: secret.google,
      scopes: [ "https://www.googleapis.com/auth/spreadsheets" ]
    })).getClient()

    const tabName = `${b.month}${b.year}`

    const masterTab = await getSheetTab(authClient, { tabName: _masterSheetTitle, lastRow: 200, lastColumn: "Z" })
    const tab = await getSheetTab(authClient, { tabName, lastRow: 200, lastColumn: "Z" })

    if (tab && tab.data && masterTab && masterTab.data) {
      const grid = masterTab.data[0] // should only be one, since we always submit only 1 range
      if (!grid) { return { statusCode: 500, body: `Tab ${_masterSheetTitle} range could not be found` } }
      
      const headers = head(_headersMaster, grid.rowData![0]) // wr

      for (const t of tab.data!) {
        if (!t.rowData || t.rowData.length <= 1) { console.warn(`This sheet, "${tabName}", has no rows. Skipping.`); continue }
        const drilldownHeaders = head(_headersDrillDown, t.rowData[0] )

        for (const {r, i} of t.rowData!.map((r, i) => ({r, i}))) { 
          if (i === 0) { continue /** skip first row */ }
          else {
            const a = r.values![drilldownHeaders["row"]].effectiveValue?.numberValue
            if (!a) { console.warn(`"${tabName}" did not have a column for row: a = ${i}`); return { statusCode: 400, body: ``} }

            const holiday1 = grid.rowData![a].values![headers["holidy"]].effectiveValue?.stringValue
            const holiday2 = r.values![drilldownHeaders["holiday"]].effectiveValue?.stringValue

            if (!( holiday1 && holiday2 && holiday1 === holiday2 )) {
              console.warn(`"Holidy" between Master sheet: "${_masterSheetTitle}" and "${tabName}" are different. 
                They are "${holiday1}" and "${holiday2}" respectively. Skipping.`); continue
            }

            let ex = {} as {[k: Prompt]: string[]}
            for (const k of _promptChoices) {
              let columnName = capitialize(k)
              let data = grid.rowData![a].values![drilldownHeaders[columnName]].effectiveValue?.stringValue?.split(",")
              if (data) ex[k] = data.map( v => v.trim())
              else { console.warn(`"${tabName}", row: ${i}, column: "${columnName}" is empty. Could be intentional.`) }
            }
            
            const p: { prompt: string, choice: { [k: Prompt]: string } } = generatePrompt(ex)
            console.log(`PROMPT: ${p}`)

            const joke = getJoke(secret, { subject: p.choice.subject, holiday: holiday1 })
            console.log(`JOKE: ${joke}`)

            let post = { postId: uuidv4()} as {[k: HeadersDrillDown|string]: any}
            for (const k of _headersDrillDown) {
              post[k] = r.values![drilldownHeaders[k]].effectiveValue?.numberValue
              if (post[k] === undefined || null)
                post[k] = r.values![drilldownHeaders[k]].effectiveValue?.stringValue || ""
            }

            let month =  _months.indexOf( post.Month )
            post[TTL_KEY] = Math.floor(new Date(post.year, month, post.day, post.hour, post.minute).getTime() / 1000)
            console.log(`post: ${JSON.stringify(post, null, 2)}`)

            const command = new PutItemCommand({
              TableName: TABLE_NAME,
              Item: marshall(post)
            })
            await dynamo.send(command)

            return { statusCode: 200, body: "OK" }
          }
        }
      }
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

  const response = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: prompt,
    n: 1,
    stop: "."
  })

  const jokes = response.data.choices[0].text?.split("\n")
  return jokes?.slice(0, 5)
}

const capitialize = (string: string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
}