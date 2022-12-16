import { App } from 'aws-cdk-lib'

import { S3Stack } from './stacks/s3-stack'
import { DynamoStack } from './stacks/dynamo-stack'
import { IamStack } from './stacks/iam-stack'
import { ScheduleStack } from './stacks/schedule-stack'
import { SNSStack } from './stacks/sns-stack'

const PROJECT_NAME = 'AIApparel'
const app = new App()

let s3Stack = new S3Stack(app, `${PROJECT_NAME}-S3Stack`, {
  bucketName: `${PROJECT_NAME}Bucket`
})

let dynamoStack = new DynamoStack(app, `${PROJECT_NAME}-DynamoStack`, {
  name: PROJECT_NAME
})

let iamStack = new IamStack(app, `${PROJECT_NAME}-IamStack`, {
  name: PROJECT_NAME,
  bucketName: `${PROJECT_NAME}Bucket`
})
iamStack.addDependency(s3Stack)
iamStack.addDependency(dynamoStack)

let scheduleStack = new ScheduleStack(app, `${PROJECT_NAME}-ScheduleStack`, {
  name: PROJECT_NAME,
  bucketName: `${PROJECT_NAME}Bucket`
})
scheduleStack.addDependency(s3Stack)

new SNSStack(app, `${PROJECT_NAME}-SNSStack`, {
  name: PROJECT_NAME,
  ownerEmail: "dominic.fung@icloud.com",
  sender: "no-reply@aiapparelstore.com"
})

app.synth()