import { App, CfnOutput, Stack } from 'aws-cdk-lib'
import {  Topic } from 'aws-cdk-lib/aws-sns'

interface SNSProps {
  name: string,
  ownerEmail: string
  sender: string
}

export class SNSStack extends Stack {
  constructor(app: App, id: string, props: SNSProps) {
    super(app, id)

    const aiTopic = new Topic(this, `${props.name}-SESHealth`)

    // SUBSCRIPTION NEEDS TO BE DONE MANUALLY:
    // hello@aiapparelstore.com
    // ... or another email you own

    new CfnOutput(this, `${props.name}-SESHealthArn`, {
      value: aiTopic.topicArn,
      exportName: `${props.name}-SESHealthArn`
    })

  }
}