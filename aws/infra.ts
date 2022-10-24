import { App } from 'aws-cdk-lib'

import { S3Stack } from './stacks/s3-stack'
import { DynamoStack } from './stacks/dynamo-stack'
import { SQSStack } from './stacks/sqs-stack'

const PROJECT_NAME = 'AIApparel'
const app = new App()

let s3Stack = new S3Stack(app, `${PROJECT_NAME}-S3Stack`, {
  bucketName: `${PROJECT_NAME}Bucket`
})

let dynamoStack = new DynamoStack(app, `${PROJECT_NAME}-DynamoStack`, {
  name: PROJECT_NAME
})

let sqsStack = new SQSStack(app, `${PROJECT_NAME}-SqsStack`, {
  name: PROJECT_NAME
})
sqsStack.addDependency(s3Stack)
sqsStack.addDependency(dynamoStack)

app.synth()