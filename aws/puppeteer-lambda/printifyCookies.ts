import puppeteer from 'puppeteer'
import puppeteerCore from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import { S3Client, S3ClientConfig, PutObjectCommand } from '@aws-sdk/client-s3'

export const handler = async (event: any): Promise<any> => {
  console.log(event)
  let browser

  try {
    if (process.platform === 'darwin') {
      console.log("This is MacOS Function ..")
      browser = await puppeteer.launch()
    } else {
      console.log("This is a Lambda Function ..")
      browser = await puppeteerCore.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      })
    }

    const page = await browser.newPage()
    await page.goto('https://printify.com/app/editor/77/29')
    console.log("here")

    await page.$x("/html/body/pfa-app-root/pfa-designer/pfa-designer-loader/designer-root/div/div/div[1]/edit-main/div/div/div/positioner-main/div[1]/div")
    let cookies = await page.cookies()
    console.log(cookies)

    let config = {} as S3ClientConfig
    const client = new S3Client(config)
    const command = new PutObjectCommand({
      Bucket: event.bucketName,
      Key: 'settings/cookies.json',
      Body: JSON.stringify(cookies, null, 2)
    })
    let s3Res = await client.send(command)
    console.log(s3Res)
  } catch(error) {
    console.log(error)
  } finally {
    await browser?.close()
    return {"status": "OK"}
  }
}

// handler({dev: "test"})