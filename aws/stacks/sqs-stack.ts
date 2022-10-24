import { App, CfnOutput, Stack } from 'aws-cdk-lib'

import { Queue } from 'aws-cdk-lib/aws-sqs'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs'
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources'

import { join } from 'path'

interface SQSProps {
  name: string
}

export class SQSStack extends Stack {
  constructor(app: App, id: string, props: SQSProps) {
    super(app, id)

    const stableDifusionQueue = new Queue(this, `${props.name}-StableDiffusionQueue`, {
      queueName: `${props.name}SDQueue`,
    })

    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ['aws-sdk'],
      },
      depsLockFilePath: join(__dirname, '../lambdas', 'package-lock.json'),
      environment: {
        stableDifusionQueueArn: stableDifusionQueue.queueArn
      },
      runtime: Runtime.NODEJS_16_X,
    }

    const lambdaFunction = new NodejsFunction(this, `${props.name}-CreateServiceFunction`, {
      entry: join(__dirname, '../lambdas', 'uploadAiImageS3.ts'),
      ...nodeJsFunctionProps
    })

    lambdaFunction.addEventSource(new SqsEventSource(stableDifusionQueue))
    new CfnOutput(this, 'stableDifusionQueueArn', {
      value: stableDifusionQueue.queueArn,
      exportName: "stableDifusionQueueArn"
    })
  }
}