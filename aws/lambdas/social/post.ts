
import fetch from 'node-fetch'
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager"

export const handler = async (event: any): Promise<{statusCode: number, body: string}> => {
  console.log(event)

  if (!event.body)        return { statusCode: 400, body: "bad request" }
  const body = JSON.parse(event.body) as { id: string }

  const smc = new SecretsManagerClient({})
  const command = new GetSecretValueCommand({
    SecretId: "aiapparel/secret"
  })
  const rawsecret = (await smc.send(command)).SecretString

  if (rawsecret) {
    const secret = JSON.parse(rawsecret) as any

    const pageToken = await getPageAccessToken(secret.fb.appId, secret.fb.secret)
    if (!pageToken) return { statusCode: 500, body: "Server Error" }

    const res = await postToFacebookPage(pageToken, "This is a test", "https://aiapparel-s3stack-aiapparelbucket7dbbd1c7-1b3nybqrm38se.s3.amazonaws.com/public/printify-mockup/hi6dr6qntnhatnmsx7fqsiotie/74902/full/original.png")
    console.log(res)
  }
  return { statusCode: 500, body: "Server Error" }
}

const getPageAccessToken = async (appId: string, appSecret: string): Promise<string> => {
  // Get the app access token
  const appTokenResponse = await fetch(
    `https://graph.facebook.com/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`
  );
  const appTokenJson = await appTokenResponse.json();
  const appAccessToken = (appTokenJson as any).access_token;

  // Get the page access token
  const pageTokenResponse = await fetch(
    `https://graph.facebook.com/v7.0/me/accounts?access_token=${appAccessToken}`
  );
  const pageTokenJson = await pageTokenResponse.json();
  const pageAccessToken = (pageTokenJson as any).data[0].access_token;

  return pageAccessToken;
}


// https://developers.facebook.com/docs/pages/publishing/
const postToFacebookPage = async (pageAccessToken: string, message: string, imageUrl: string) => {
  // Set up the GraphQL query
  const query = `
    mutation {
      createPost(input: {
        message: "${message}",
        image_url: "${imageUrl}",
      }) {
        post {
          id
        }
      }
    }
  `;

  // Set up the request headers
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${pageAccessToken}`,
  };

  // Set up the request body
  const body = {
    query: query,
  };

  // Send the GraphQL query to the GraphQL endpoint
  const response = await fetch('https://graph.facebook.com/v7.0/100088965992234/feed?', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body),
  });

  // Return the response
  return response;
}