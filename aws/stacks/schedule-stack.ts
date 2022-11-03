import { App, Fn, Stack } from 'aws-cdk-lib'

import { Rule, Schedule,  } from 'aws-cdk-lib/aws-events'
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets'
import { ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs'

import { join } from 'path'

interface ScheduleProps {
  name: string,
  bucketName: string
}

export class ScheduleStack extends Stack {
  constructor(app: App, id: string, props: ScheduleProps) {
    super(app, id)

    const bucketName = Fn.importValue(`${props.bucketName}-bucketName`)
    const bucketArn = Fn.importValue(`${props.bucketName}-bucketArn`)

    const excRole = new Role(this, `${props.bucketName}-LambdaRole`, {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com')
    })

    excRole.addToPolicy(new PolicyStatement({
      resources: [ bucketArn, `${bucketArn}/*` ],
      actions: ["s3:*"]
    }))

    excRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")
    )

    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ['aws-sdk'],
      },
      depsLockFilePath: join(__dirname, '../lambdas', 'package-lock.json'),
      environment: {
        author: "Dom Fung",
        bucketName: bucketName
      },
      runtime: Runtime.NODEJS_16_X,
    }

    const lambdaFunction = new NodejsFunction(this, `${props.name}-CreateServiceFunction`, {
      entry: join(__dirname, '../lambdas', 'getConversionRates.ts'),
      role: excRole,
      ...nodeJsFunctionProps
    })

    new Rule(this, `${props.name}-ScheduleRule`, {
      schedule: Schedule.cron({ minute: '0', hour: '6' }), //UTC time + 5 (EST)
      targets: [ new LambdaFunction(lambdaFunction) ]
    })
  }
}