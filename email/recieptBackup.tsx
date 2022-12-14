import { MJMLParseError } from "mjml-core"

import { 
  Mjml, MjmlHead, MjmlTitle, MjmlPreview, MjmlBody, MjmlSection, MjmlColumn,
  MjmlButton, MjmlImage, MjmlAll, MjmlAttributes, MjmlText, MjmlStyle, MjmlWrapper,
  MjmlDivider, MjmlSocialElement, MjmlSocial, MjmlGroup
} from "@faire/mjml-react"

import { render } from "@faire/mjml-react/dist/src/utils/render"
import { OrderItem } from "../types/order"
import { PaymentRequest, PaymentResponse } from "../types/square"

export const generateEmail = ( orderItems: OrderItem[], request: PaymentRequest, response: PaymentResponse ): { html: string, errors: MJMLParseError[] | undefined } => {
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
            <MjmlImage src="https://res.cloudinary.com/dheck1ubc/image/upload/v1544153577/Email/Images/AnnouncementOffset/crofts-white.png" alt="" align="center" width="150px" />
            <MjmlText color="#ffffff" font-weight="bold" align="center" text-transform="uppercase" font-size="16px" letter-spacing="1px" padding-top="30px">
              Austin, TX
              <br />
              <span style={{color: "#979797", fontWeight: "normal"}}>-</span>
            </MjmlText>
            <MjmlText color="#ffffff" align="center" font-size="13px" padding-top="0" font-weight="bold" text-transform="uppercase" letter-spacing="1px" line-height="20px">
              Austin Convention Center
              <br />
              123 Main Street, 78701
            </MjmlText>
            <MjmlImage src="https://res.cloudinary.com/dheck1ubc/image/upload/v1544156968/Email/Images/AnnouncementOffset/header-top.png" width="600px" alt="" padding="0" href="https://google.com" />
          </MjmlColumn>
        </MjmlSection>
        <MjmlSection background-color="#1f2e78">
          <MjmlColumn width="100%">
            <MjmlImage src="https://res.cloudinary.com/dheck1ubc/image/upload/v1544156968/Email/Images/AnnouncementOffset/header-bottom.png" width="600px" alt="" padding="0" href="https://google.com" />
          </MjmlColumn>
        </MjmlSection>
        <MjmlWrapper padding-top="0" padding-bottom="0" css-class="body-section">
          <MjmlSection background-color="#ffffff" padding-left="15px" padding-right="15px">
            <MjmlColumn width="100%">
              <MjmlText color="#637381" font-size="16px">
                Hi,
              </MjmlText>
              <MjmlText color="#637381" font-size="16px">
                Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quia a assumenda nulla in quisquam optio quibusdam fugiat perspiciatis nobis, ad tempora culpa porro labore. Repudiandae accusamus obcaecati voluptatibus accusantium perspiciatis.
              </MjmlText>
              <MjmlText color="#637381" font-size="16px">
                Tempora culpa porro labore. Repudiandae accusamus obcaecati voluptatibus accusantium perspiciatis:
              </MjmlText>
              <MjmlText color="#637381" font-size="16px">
                <ul>
                  <li style={{paddingBottom: "20px"}}><strong>Lorem ipsum dolor:</strong> Sit amet consectetur adipisicing elit.</li>
                  <li style={{paddingBottom: "20px"}}><strong>Quia a assumenda nulla:</strong> Repudiandae accusamus obcaecati voluptatibus accusantium perspiciatis.</li>
                  <li><strong>Tempora culpa porro labore:</strong> In quisquam optio quibusdam fugiat perspiciatis nobis.</li>
                </ul>
              </MjmlText>
              <MjmlText color="#637381" font-size="16px" padding-bottom="30px">
                Lorem ipsum dolor <a className="text-link" href="https://google.com">sit amet consectetur</a> adipisicing elit. Earum eaque sunt nulla in, id eveniet quae unde ad ipsam ut, harum autem porro reiciendis minus libero illo. Vero, fugiat reprehenderit.
              </MjmlText>
              <MjmlButton background-color="#5e6ebf" align="center" color="#ffffff" font-size="17px" font-weight="bold" href="https://google.com" width="300px">
                RSVP Today
              </MjmlButton>
              <MjmlButton background-color="#5e6ebf" align="center" color="#ffffff" font-size="17px" font-weight="bold" href="https://google.com" width="300px">
                Book an Appointment
              </MjmlButton>
              <MjmlText color="#637381" font-size="16px" padding-top="30px">
                Lorem ipsum dolor <a className="text-link" href="https://google.com">sit amet consectetur</a> adipisicing elit. Earum eaque sunt nulla in, id eveniet quae unde ad ipsam ut, harum autem porro reiciendis minus libero illo. Vero, fugiat reprehenderit.
              </MjmlText>
              <MjmlText color="#637381" font-size="16px" padding-bottom="0">
                Lorem ipsum dolor sit amet consectetur adipisicing elit.
              </MjmlText>
            </MjmlColumn>
          </MjmlSection>
          <MjmlSection background-color="#ffffff" padding-left="15px" padding-right="15px" padding-top="0">
            <MjmlColumn width="50%">
              <MjmlImage align="center" src="https://res.cloudinary.com/dheck1ubc/image/upload/v1544153577/Email/Images/AnnouncementOffset/Image_1.png" alt="" />
            </MjmlColumn>
            <MjmlColumn width="50%">
              <MjmlImage align="center" src="https://res.cloudinary.com/dheck1ubc/image/upload/v1544153578/Email/Images/AnnouncementOffset/Image_2.png" alt="" />
            </MjmlColumn>
          </MjmlSection>
          <MjmlSection background-color="#ffffff" padding-left="15px" padding-right="15px" padding-top="0">
            <MjmlColumn width="100%">
              <MjmlDivider border-color="#DFE3E8" border-width="1px" />
            </MjmlColumn>
          </MjmlSection>
          <MjmlSection background-color="#ffffff" padding="0 15px 0 15px">
            <MjmlColumn width="100%">
              <MjmlText color="#212b35" font-weight="bold" font-size="20px" padding-bottom="0">
                Come see us!
              </MjmlText>
              <MjmlText color="#637381" font-size="16px">
                We're looking forward to meeting you.
              </MjmlText>
            </MjmlColumn>
          </MjmlSection>
          <MjmlSection background-color="#ffffff" padding-left="15px" padding-right="15px">
            <MjmlColumn width="50%">
              <MjmlText color="#212b35" font-size="12px" text-transform="uppercase" font-weight="bold" padding-bottom="0">
                address
              </MjmlText>
              <MjmlText color="#637381" font-size="14px" padding-top="0">
                Austin Convention Center
                <br />
                123 Main Street, 78701
              </MjmlText>
            </MjmlColumn>
            <MjmlColumn width="50%">
              <MjmlText color="#212b35" font-size="12px" text-transform="uppercase" font-weight="bold" padding-bottom="0">
                Hours of Operation
              </MjmlText>
              <MjmlText color="#637381" font-size="14px" padding-top="0">
                Monday, December 20th: 8:00AM - 5:00PM
                <br />
                Tuesday, December 21st: 8:00AM - 5:00PM
              </MjmlText>
            </MjmlColumn>
          </MjmlSection>
          <MjmlSection background-color="#ffffff" padding-left="15px" padding-right="15px">
            <MjmlColumn width="100%">
              <MjmlImage src="https://res.cloudinary.com/dheck1ubc/image/upload/v1544153579/Email/Images/AnnouncementOffset/map.jpg" alt="" />
            </MjmlColumn>
          </MjmlSection>
        </MjmlWrapper>

        <MjmlWrapper full-width="full-width">
          <MjmlSection>
            <MjmlColumn width="100%" padding="0">
              <MjmlSocial font-size="15px" icon-size="30px" mode="horizontal" padding="0" align="center">
                <MjmlSocialElement name="facebook" href="https://mjml.io/" background-color="#A1A0A0">
                </MjmlSocialElement>
                <MjmlSocialElement name="google" href="https://mjml.io/" background-color="#A1A0A0">
                </MjmlSocialElement>
                <MjmlSocialElement name="twitter" href="https://mjml.io/" background-color="#A1A0A0">
                </MjmlSocialElement>
                <MjmlSocialElement name="linkedin" href="https://mjml.io/" background-color="#A1A0A0">
                </MjmlSocialElement>
              </MjmlSocial>
              <MjmlText color="#445566" font-size="11px" font-weight="bold" align="center">
                View this email in your browser
              </MjmlText>
              <MjmlText color="#445566" font-size="11px" align="center" line-height="16px">
                You are receiving this email advertisement because you registered with Croft's Accountants. (123 Main Street, Austin, TX 78701) and agreed to receive emails from us regarding new features, events and special offers.
              </MjmlText>
              <MjmlText color="#445566" font-size="11px" align="center" line-height="16px">
                &copy; Croft's Accountants Inc., All Rights Reserved.
              </MjmlText>
            </MjmlColumn>
          </MjmlSection>
          <MjmlSection padding-top="0">
            <MjmlGroup>
              <MjmlColumn width="100%" padding-right="0">
                <MjmlText color="#445566" font-size="11px" align="center" line-height="16px" font-weight="bold">
                  <a className="footer-link" href="https://www.google.com">Privacy</a>&#xA0;&#xA0;&#xA0;&#xA0;&#xA0;&#xA0;&#xA0;&#xA0;<a className="footer-link" href="https://www.google.com">Unsubscribe</a>
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