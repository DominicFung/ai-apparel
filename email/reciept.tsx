import { MJMLParseError } from "mjml-core"
import fs from 'fs'

import { 
  Mjml, MjmlHead, MjmlTitle, MjmlPreview, MjmlBody, MjmlSection, MjmlColumn,
  MjmlImage, MjmlAll, MjmlAttributes, MjmlText, MjmlStyle, MjmlWrapper,
  MjmlDivider, MjmlSocialElement, MjmlSocial, MjmlGroup
} from "@faire/mjml-react"

import { render } from "@faire/mjml-react/dist/src/utils/render"
import { OrderItem } from "../types/order"
import { PaymentRequest, PaymentResponse } from "../types/square"
import { LocationBasedVariant } from "../types/printify"

import { StaticImageData } from "next/image"

import { fromIni } from '@aws-sdk/credential-provider-ini'
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client, S3ClientConfig } from "@aws-sdk/client-s3"

import cdk from '../cdk-outputs.json'
import config from "../src/aws-exports"
import { join } from "path"
import { Customer } from "../types/customer"
import { Conversion, Currency } from "../utils/utils"

const imgs = ["banner1", "banner2", "logo"] as const
type ImgKey = typeof imgs[number]
type Imgs = {
  [k in ImgKey]: {
    file: StaticImageData
    key: string,
    path: string
  }
}

const images = {
  banner1:  { key: 'static/banner1.png',  path: 'assets/email/image_part_001.png' },
  banner2:  { key: 'static/banner2.png',  path: 'assets/email/image_part_002.png' },
  logo:     { key: 'static/logo.png',     path: 'assets/Logo-v2.png' }
} as Imgs


const ensureImages = async (): Promise<{ [key in ImgKey]: string }> => {
  let result = { banner1: "", banner2: "", logo: "" }

  let s3Config = {} as S3ClientConfig
  if (process.env.AWS_PROFILE) { config["credentials"] = fromIni({ profile: process.env.AWS_PROFILE }) }
  else { 
    s3Config["credentials"] = { 
      accessKeyId: cdk["AIApparel-IamStack"].AccessKey, 
      secretAccessKey: cdk["AIApparel-IamStack"].SecretKey 
    }
    s3Config.region = 'us-east-1'
  }
  const s3 = new S3Client(s3Config)

  for (let i of imgs) {
    try {
      await s3.send(new HeadObjectCommand({
        Bucket: cdk["AIApparel-S3Stack"].bucketName,
        Key: images[i].key
      }))
    } catch {
      if (process.env.NODE_ENV === 'development') {
        await s3.send(new PutObjectCommand({
          Bucket: cdk["AIApparel-S3Stack"].bucketName,
          Key: images[i].key,
          Body: fs.createReadStream(join(process.cwd(), images[i].path))
        }))
      } else { console.error("PRODUCTION ENV! Upload to Order Email Denied. Please run locally to update emails.") }
      
    } finally {
      result[i] = `https://${cdk["AIApparel-S3Stack"].bucketName}.s3.amazonaws.com/${images[i].key}`
    }
  }

  return result
}

export const convertUSDtoCustomerRate = async (currency: Currency): Promise<number> => {
  let s3Config = {} as S3ClientConfig
  if (process.env.AWS_PROFILE) { config["credentials"] = fromIni({ profile: process.env.AWS_PROFILE }) }
  else { 
    s3Config["credentials"] = { 
      accessKeyId: cdk["AIApparel-IamStack"].AccessKey, 
      secretAccessKey: cdk["AIApparel-IamStack"].SecretKey 
    }
    s3Config.region = 'us-east-1'
  }
  const s3 = new S3Client(s3Config)
  const command = new GetObjectCommand({
    Bucket: cdk["AIApparel-S3Stack"].bucketName,
    Key: `settings/conversions-usd.json`
  })
  let res = await (await s3.send(command)).Body?.transformToString()
  if (res) {
    let conversion = JSON.parse(res) as Conversion
    return conversion.rates[currency]
  }
  return -1
}

export const generateEmail = async (
  customer: Customer, orderItems: OrderItem[], total: number,
  request: PaymentRequest, response: PaymentResponse,
): Promise<{ html: string, errors: MJMLParseError[] | undefined }> => {
  let output: JSX.Element[] = []
  let d = 0

  const im = await ensureImages()
  console.log(im)
  const rate = await convertUSDtoCustomerRate(customer.geo.currency.code)
  console.log(rate)

  for (let o of orderItems) {
    for (let c of o.choice) {
      let v:LocationBasedVariant|null = null
      for (let i of o.varients) {
        if (i.id === c.variantId) { v = i; break }
      }
      if (!v) { continue }

      let mockupUrl = `public/printify-mockup/${o.itemId}/${v.mockup.cameras[0].camera_id}/preview/original.png`
      let convertedPrice = ((v.price * rate * c.quantity) / 100).toFixed(2)

      if (d % 2 === 0) {
        output.push(
          <MjmlSection background-color="#ffffff" padding-left="15px" padding-right="15px" padding-top="0" key={d}>
            <MjmlColumn width="40%">
              <MjmlImage align="center" src={`https://${cdk["AIApparel-S3Stack"].bucketName}.s3.amazonaws.com/${mockupUrl}`} alt="" />
            </MjmlColumn>
            <MjmlColumn width="60%" verticalAlign="middle">
              <MjmlText align="center" verticalAlign="middle">{v.title}</MjmlText>
              <MjmlText align="center" verticalAlign="middle">
                <small>Price: </small>{convertedPrice} {customer.geo.currency.code} <br/>
                <small>Quantity: </small>{c.quantity}<br/>
                { c.notes.map((e, i) => <small style={{color: "#2f2f2f"}}>Note {i}: <small style={{fontStyle: "italic"}}>{e}</small><br/></small>) }
              </MjmlText>
            </MjmlColumn>
          </MjmlSection>
        )
      } else {
        output.push(
          <MjmlSection background-color="#ffffff" padding-left="15px" padding-right="15px" padding-top="0" key={d}>
            <MjmlColumn width="60%" verticalAlign="middle">
              <MjmlText  align="center" verticalAlign="middle">{v.title}</MjmlText>
              <MjmlText align="center" verticalAlign="middle">
                <small>Price: </small>{convertedPrice} {customer.geo.currency.code} <br/>
                <small>Quantity: </small>{c.quantity}
              </MjmlText>
            </MjmlColumn>
            <MjmlColumn width="40%">
              <MjmlImage align="center" src={`https://${cdk["AIApparel-S3Stack"].bucketName}.s3.amazonaws.com/${mockupUrl}`} alt="" />
            </MjmlColumn>
          </MjmlSection>
        )
      }
      d++
    }
  }

  const convertedTotal = ((total * rate) / 100).toFixed(2)
  const {html, errors} = render(
    <Mjml>
      <MjmlHead>
        <MjmlTitle>Thank you for your Purchase!</MjmlTitle>
        <MjmlPreview>Thank you for your Purchase at AI Apparel!</MjmlPreview>
        <MjmlAttributes>
          <MjmlAll font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"></MjmlAll>
          <MjmlText font-weight="400" font-size="16px" color="#000000" line-height="24px" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"></MjmlText>
        </MjmlAttributes>
        <MjmlStyle inline={true}>
          {`.body-section {
          -webkit-box-shadow: 1px 4px 11px 0px rgba(0, 0, 0, 0.15);
          -moz-box-shadow: 1px 4px 11px 0px rgba(0, 0, 0, 0.15);
          box-shadow: 1px 4px 11px 0px rgba(0, 0, 0, 0.15);
          }`}
        </MjmlStyle>
        <MjmlStyle inline={true}>
          {`.text-link {
          color: #5e6ebf
          }`}
        </MjmlStyle>
        <MjmlStyle inline={true}>
          {`.footer-link {
          color: #888888
          }`}
        </MjmlStyle>

      </MjmlHead>
      <MjmlBody background-color="#E7E7E7" width="600px">
        <MjmlSection full-width="full-width" background-color="#748DA6" padding-bottom="0">
          <MjmlColumn width="100%">
            <MjmlImage src={im["logo"]} alt="" align="center" width="150px" />
            <MjmlText color="#ffffff" font-weight="bold" align="center" text-transform="uppercase" font-size="16px" letter-spacing="1px" padding-top="30px">
              Thank you for your purchase!
            </MjmlText>
            <MjmlImage src={im["banner1"]} width="600px" alt="" padding="0" href="https://google.com" />
          </MjmlColumn>
        </MjmlSection>
        <MjmlSection background-color="#1f2e78" padding={"0px"}>
          <MjmlColumn width="100%" padding={"0px"}>
            <MjmlImage src={im["banner2"]} width="600px" alt="" padding="0px" href="https://google.com" />
          </MjmlColumn>
        </MjmlSection>
        <MjmlWrapper padding-top="0" padding-bottom="0" css-class="body-section">
          <MjmlSection background-color="#ffffff" padding-left="15px" padding-right="15px">
            <MjmlColumn width="100%">
              <MjmlText color="#637381" font-size="16px">
                Hi {request.addressTo.firstname}!
              </MjmlText>
              <MjmlText color="#637381" font-size="16px">
                Thank you for purchasing at AI Apparel Store! The team is currently reviewing your order and you should get a print confirmation shortly.
                <br /><br />
                <small style={{ color: "#637381", fontSize: "10px" }}> Order ID: {response.orderId}</small><br />
                <small style={{ color: "#637381", fontSize: "10px" }}> Square: {response.squareId}</small><br />
                <small style={{ color: "#637381", fontSize: "10px" }}> Printify: {response.printifyId}</small><br />
              </MjmlText>
            </MjmlColumn>
          </MjmlSection>
          <MjmlSection background-color="#ffffff" padding-left="15px" padding-right="15px" padding-top="0">
            <MjmlColumn width="100%">
              <MjmlDivider border-color="#DFE3E8" border-width="1px" />
            </MjmlColumn>
          </MjmlSection>
          {output}
          <MjmlSection background-color="#ffffff" padding-left="15px" padding-right="15px" padding-top="0">
            <MjmlColumn width="100%">
              <MjmlDivider border-color="#DFE3E8" border-width="1px" />
            </MjmlColumn>
          </MjmlSection>
          <MjmlSection background-color="#ffffff" padding-left="15px" padding-right="15px">
            <MjmlColumn width="40%">
            </MjmlColumn> 
            <MjmlColumn width="60%">
              
              <MjmlText color="#637381" font-size="14px" padding-top="0">
                Shipping: FREE
                <br />
                Sub Total: {convertedTotal} {customer.geo.currency.code}
              </MjmlText>
              <MjmlText color="#212b35" font-size="15px" text-transform="uppercase" font-weight="bold" padding-bottom="0">
                <small>Total: </small> {customer.geo.currency.symbol} {convertedTotal} {customer.geo.currency.code}
              </MjmlText>
            </MjmlColumn>
          </MjmlSection>
        </MjmlWrapper>

        <MjmlWrapper full-width="full-width">
          <MjmlSection>
            <MjmlColumn width="100%" padding="0">
              <MjmlSocial font-size="15px" icon-size="30px" mode="horizontal" padding="0" align="center">
                <MjmlSocialElement name="facebook" href="https://www.facebook.com/profile.php?id=100088965992234" background-color="#A1A0A0">
                </MjmlSocialElement>
                <MjmlSocialElement name="instagram" href="https://www.instagram.com/aiap.parel" background-color="#A1A0A0">
                </MjmlSocialElement>
                <MjmlSocialElement name="linkedin" href="https://www.aiapparelstore.com" background-color="#A1A0A0">
                </MjmlSocialElement>
              </MjmlSocial>
              <MjmlText color="#445566" font-size="11px" font-weight="bold" align="center">
                View this email in your browser
              </MjmlText>
              <MjmlText color="#445566" font-size="11px" align="center" line-height="16px">
                You are receiving this email receipt because you've ordered an apparel from AI Apparel Store. If this is not something you've done, email us back at 
                <a href="mailto:hello@aiapparelstore.com">hello@aiapparelstore.com</a>
              </MjmlText>
              <MjmlText color="#445566" font-size="11px" align="center" line-height="16px">
                &copy; AI Apparel Store, All Rights Reserved.
              </MjmlText>
            </MjmlColumn>
          </MjmlSection>
          <MjmlSection padding-top="0">
            <MjmlGroup>
              <MjmlColumn width="100%" padding-right="0">
                <MjmlText color="#445566" font-size="11px" align="center" line-height="16px" font-weight="bold">
                  <a className="footer-link" href="https://www.aiapparelstore.com">
                    Privacy</a>&#xA0;&#xA0;&#xA0;&#xA0;&#xA0;&#xA0;&#xA0;&#xA0;
                  <a className="footer-link" href={`https://www.aiapparelstore.com/unsubscribe/${request.addressTo.email}`}>Unsubscribe</a>
                </MjmlText>
              </MjmlColumn>
            </MjmlGroup>

          </MjmlSection>
        </MjmlWrapper>

      </MjmlBody>
    </Mjml>
  )
  return { html, errors }
}