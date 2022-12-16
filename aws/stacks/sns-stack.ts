import { App, CfnOutput, Stack, aws_ses_actions as ses_actions } from 'aws-cdk-lib'
import { EmailIdentity, Identity } from 'aws-cdk-lib/aws-ses'
import { Subscription, SubscriptionProtocol, Topic } from 'aws-cdk-lib/aws-sns'

interface SNSProps {
  name: string,
  ownerEmail: string
  sender: string
}

export class SNSStack extends Stack {
  constructor(app: App, id: string, props: SNSProps) {
    super(app, id)

    const aiTopic = new Topic(this, `${props.name}-SESHealth`)

    new Subscription(this, `${props.name}-Owner`, {
      topic: aiTopic,
      protocol: SubscriptionProtocol.EMAIL,
      endpoint: props.ownerEmail
    })

    new EmailIdentity(this, `${props.name}-Identity`, {
      identity: Identity.email(props.sender),
      //mailFromDomain: 'mail.cdk.dev',
    })

    new ses_actions.Bounce({
      sender: props.sender,
      template: ses_actions.BounceTemplate.MAILBOX_DOES_NOT_EXIST,
      topic: aiTopic,
    })

    new ses_actions.Bounce({
      sender: props.sender,
      template: ses_actions.BounceTemplate.MAILBOX_FULL,
      topic: aiTopic,
    })

    new ses_actions.Bounce({
      sender: props.sender,
      template: ses_actions.BounceTemplate.MESSAGE_CONTENT_REJECTED,
      topic: aiTopic,
    })

    new ses_actions.Bounce({
      sender: props.sender,
      template: ses_actions.BounceTemplate.MESSAGE_TOO_LARGE,
      topic: aiTopic,
    })

    new ses_actions.Bounce({
      sender: props.sender,
      template: ses_actions.BounceTemplate.TEMPORARY_FAILURE,
      topic: aiTopic,
    })

    new CfnOutput(this, `${props.name}-SESHealthArn`, {
      value: aiTopic.topicArn,
      exportName: `${props.name}-SESHealthArn`
    })

  }
}