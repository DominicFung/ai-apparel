import { AWS_API_KEY } from "./secret"

const setupTrigger = () => { 
  let sheet = SpreadsheetApp.getActive()

  ScriptApp.newTrigger("myFunction")
    .forSpreadsheet(sheet)
    .onChange().create()
}

const helloWorld = () => console.log("Hello World")

const aiapparelprocessall = () => {
  let endpoint = "https://ppdkjyy2x7.execute-api.us-east-1.amazonaws.com/prod/"
  let path = "api/social"
  
  let fetchOptions = {
    headers: {
      "x-api-key": AWS_API_KEY
    },
    method: 'post' as any,
    payload: { "month": "Jan" }
  }
  
  let uri = endpoint + path

  console.log(fetchOptions)
  console.log(uri)
  UrlFetchApp.fetch(uri, fetchOptions)
}

export {}