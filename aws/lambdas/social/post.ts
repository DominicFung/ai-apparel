import SocialPost from 'social-post-api'
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager"
import { DynamoDBStreamEvent } from 'aws-lambda'
import { unmarshall } from '@aws-sdk/util-dynamodb'
import { HeadersDrillDown, sleep } from './global'
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import { AttributeValue, DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb'
import { fromUtf8 } from '@aws-sdk/util-utf8-node'

const TABLE_NAME = process.env.TABLE_NAME || ''
const IMAGE_FUNCTION_NAME = process.env.IMAGE_FUNCTION_NAME || ''

export const handler = async (event: DynamoDBStreamEvent): Promise<{statusCode: number, body: string}> => {
  console.log(JSON.stringify(event, null, 2))

  const smc = new SecretsManagerClient({})
  const command = new GetSecretValueCommand({
    SecretId: "aiapparel/secret"
  })
  const rawsecret = (await smc.send(command)).SecretString

  if (rawsecret) {
    const secret = JSON.parse(rawsecret) as any
    const social = new SocialPost(secret.ayrshare.token)

    const lambda = new LambdaClient({})
    const dynamo = new DynamoDBClient({})

    console.log(event.Records[0].dynamodb?.Keys)
    if (!event.Records[0].dynamodb?.Keys) { return { statusCode: 500, body: "Server Error" } }

    //const raw = event.Records[0].dynamodb?.Keys as Record<string, any>
    const raw = event.Records[0].dynamodb?.OldImage as Record<string, any>
    
    let r = unmarshall(raw) as {[k: HeadersDrillDown]: any}
    console.log(`Record: ${JSON.stringify(r, null, 2)}`)

    if (!r.socialId) { console.error(`Missing socialId: ${r.socialId}`); return { statusCode: 500, body: "r.socialId missing." } }
    if (!r.month || !r.year) {
      console.error(`Missing r.month = "${r.month}" or r.year = "${r.year}".`)
      return { statusCode: 500, body: "Missing r.month or r.year" }
    }
    
    const joke = parseJoke(r.joke as string, 1)
    if (!r.link || !r.image0 || !r.image1 || !r.image2) {
      // invoke lamda to fill this void
      const lRes = await lambda.send(new InvokeCommand({
        FunctionName: IMAGE_FUNCTION_NAME,
        Payload: fromUtf8(JSON.stringify({
          queryStringParameters: {
            socialId: r.socialId,
            tabName: `${r.month}${r.year}`
          }
        }))
      }))

      console.log(lRes)
    }

    const _TRIES = 10
    let dResItem = undefined as Record<string, AttributeValue>|undefined
    for (let i=0; i<_TRIES; i++) {
      await sleep(1000)

      // The DB entry is already gone :O ... the lambda above will make a new one for us to read
      dResItem = (await dynamo.send(new GetItemCommand({
        TableName: TABLE_NAME, Key: r.socialId
      }))).Item
      if (dResItem) { break }
    }

    if (!dResItem) {
      console.error(`Undable to find dResItem with socialId: ${r.social} after ${_TRIES} tries.`)
      return { statusCode: 500, body: `Undable to find dResItem with socialId: ${r.social} after ${_TRIES} tries.` } 
    }

    let item = unmarshall(dResItem) as { socialId: string, link: string, image0: string, image1: string, image2: string }
    console.log(`dResItem: ${JSON.stringify(dResItem)}`)
    if (item && item.link && item.image0 && item.image1 && item.image2) {
      r.link = item.link; r.image0 = item.image0; r.image1 = item.image1; r.image2 = item.image2
    } else {
      console.error(`missing in items: ${item.link} ${item.image0} ${item.image1} ${item.image2}`)
      return { statusCode: 500, body: "missing key items." }
    }

    if (!joke || !r.link || !r.prompt || !r.platform) { 
      console.error(`r.platform = "${r.platform}" or joke = "${joke}" or r.link = "${r.link}" or r.prompt = "${r.prompt}" is empty.`); 
      return { statusCode: 500, body: `r.platform or joke or r.link or r.prompt is empty. Cannot post with missing information` } 
    }

    const postText = `"${joke}" - ChatGPT
    
    Prompt: ${r.prompt}

    ---

    BUY NOW!
    ${r.link}`

    console.log("Posting to social ...")
    console.log(postText)
    const post = await social.post({
      post: postText,
      platforms: [r.platform],
      mediaUrls: [r.image0, r.image1, r.image2]
    }).catch(console.error)
    console.log(post)
  }

  return { statusCode: 500, body: "Server Error" }
}

/**
 * @param text list of 5 jokes, usually has numbers (1,.. 5).
 */
const parseJoke = (text: string, p: 1|2|3|4|5): string => {
  let j1 = text.split(p+". ")
  if (j1.length >= 2) {
    if (j1.length != 2) { console.warn(`j1 lenght is > 2 when parsing for "${p+". "}" :: ${j1}`) }
    
    if (p === 5) return j1[1]
    
    let q = p+1
    let j2 = j1[1].split(q+". ")
    if (j2.length >= 2) {
      if (j2.length != 2) { console.warn(`joke lenght is > 2 when parsing for "${q+". "}" :: ${j2}`) }
      return j2[1]
    }
  }
  return ""
}