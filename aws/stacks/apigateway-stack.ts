import { App, CfnOutput, Duration, Fn, Stack } from 'aws-cdk-lib'
import { Cors, LambdaIntegration, Period, RestApi } from 'aws-cdk-lib/aws-apigateway'
import { Table } from 'aws-cdk-lib/aws-dynamodb'
import { Rule, RuleTargetInput, Schedule } from 'aws-cdk-lib/aws-events'
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets'

import { ManagedPolicy, Policy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam'
import { Runtime, StartingPosition } from 'aws-cdk-lib/aws-lambda'
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources'
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs'

import { join } from 'path'

interface ApiGatewayProps {
  name: string,
  bucketName: string
  restAPIName: string
  hostName: string
  socialTable: Table
}

export class ApiGatewayStack extends Stack {
  constructor(app: App, id: string, props: ApiGatewayProps) {
    super(app, id)

    const socialDynamoName = Fn.importValue(`${props.name}-socialTableName`)
    const socialDynamoArn = Fn.importValue(`${props.name}-socialTableArn`)
    const ttlKey = Fn.importValue(`${props.name}-socialTableTTL`)

    const bucketName = Fn.importValue(`${props.bucketName}-bucketName`)

    const excRole = new Role(this, `${props.name}-SocialMediaLambdaRole`, {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com')
    })

    excRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")
    )

    excRole.attachInlinePolicy(
      new Policy(this, `${props.name}-InlinePolicy`, {
        statements: [
          new PolicyStatement({
            actions: [
              "secretsmanager:GetResourcePolicy",
              "secretsmanager:GetSecretValue",
              "secretsmanager:DescribeSecret",
              "secretsmanager:ListSecretVersionIds",
              "secretsmanager:ListSecrets"
            ],
            resources: ["*"]
          }),
          new PolicyStatement({
            actions: [ "dynamodb:*" ],
            resources: [ `${socialDynamoArn}*` ]
          }),
          new PolicyStatement({
            actions: [ "lambda:InvokeFunction" ],
            resources: [ `*` ]
          })
        ]
      })
    )

    const nodeJsFunctionProps: NodejsFunctionProps = {
      role: excRole,
      bundling: { externalModules: ['aws-sdk'] },
      depsLockFilePath: join(__dirname, '../lambdas', 'package-lock.json'),
      environment: {
        TABLE_NAME: socialDynamoName,
        BUCKET_NAME: bucketName,
        TTL_KEY: ttlKey,
        HOST: props.hostName
      },
      runtime: Runtime.NODEJS_16_X,
    }

    // called by update schedule programatically
    const requestImages = new NodejsFunction(this, `${props.name}-RequestImages`, {
      entry: join(__dirname, '../lambdas', 'social', 'requestImages.ts'),
      memorySize: 10240,
      timeout: Duration.minutes(15),
      ...nodeJsFunctionProps
    })

    const createSchedule = new NodejsFunction(this, `${props.name}-CreateSchedule`, {
      entry: join(__dirname, '../lambdas', 'social', 'createSchedule.ts'),
      memorySize: 10240,
      timeout: Duration.minutes(15),
      ...nodeJsFunctionProps
    })

    const updateSchedule = new NodejsFunction(this, `${props.name}-UpdateSchedule`, {
      entry: join(__dirname, '../lambdas', 'social', 'updateSchedule.ts'),
      memorySize: 10240,
      timeout: Duration.minutes(15),
      ...nodeJsFunctionProps,
      environment: { ...nodeJsFunctionProps.environment, IMAGE_FUNCTION_NAME: requestImages.functionName }
    })

    new Rule(this, `${props.name}-CreateSchedule-ScheduleRule`, {
      schedule: Schedule.cron({ minute: '0', hour: '0', day: '2', month: 'DEC', year: '*' }),
      targets: [ new LambdaFunction(createSchedule) ]
    })

    new Rule(this, `${props.name}-UpdateSchedule-ScheduleRule`, {
      schedule: Schedule.cron({ minute: '0', hour: '0', day: '25', month: "*" }),
      targets: [ new LambdaFunction(updateSchedule, { 
        event: RuleTargetInput.fromObject({
          TABLE_NAME: socialDynamoName,
          BUCKET_NAME: bucketName,
          TTL_KEY: ttlKey
        }) 
      }) ],
    })

    const createPost = new NodejsFunction(this, `${props.name}-CreatePost`, {
      entry: join(__dirname, '../lambdas', 'social', 'post.ts'),
      memorySize: 10240,
      timeout: Duration.minutes(5),
      ...nodeJsFunctionProps,
      environment: { 
        ...nodeJsFunctionProps.environment, 
        IMAGE_FUNCTION_NAME: requestImages.functionName,
        TABLE_NAME: props.socialTable.tableName
      }
    })

    createPost.addEventSource(new DynamoEventSource(props.socialTable, {
      startingPosition: StartingPosition.LATEST
    }))

    const createScheduleIntegration = new LambdaIntegration(createSchedule)  
    const updateScheduleIntegration = new LambdaIntegration(updateSchedule)
    const requestImagesIntegration = new LambdaIntegration(requestImages)
    
    // Create an API Gateway resource for each of the CRUD operations
    const api = new RestApi(this, 'SocialAPI', {
      restApiName: props.restAPIName,
      endpointExportName: `${props.name}-SocialAPIUrl`,
      defaultCorsPreflightOptions: {
        allowHeaders: Cors.DEFAULT_HEADERS,
        allowMethods: Cors.ALL_METHODS,
        allowOrigins: Cors.ALL_ORIGINS,
      },
    })

    const social = api.root.addResource('api').addResource('social')

    const schedule = social.addResource('schedule')
    schedule.addResource('create').addMethod('POST', createScheduleIntegration, { apiKeyRequired: true })
    
    const update = schedule.addResource('update')
    update.addResource('month').addMethod('POST', updateScheduleIntegration, { apiKeyRequired: true })
    update.addResource('post').addMethod('GET', requestImagesIntegration) // we can do inline hyperlink on google sheets

    const plan = api.addUsagePlan(`${props.name}-UsagePlan`, {
      throttle: {
        rateLimit: 10,
        burstLimit: 2
      },
      quota: {
        limit: 100,
        period: Period.DAY
      },
    })

    const apikey = api.addApiKey(`${props.name}-SocialAPIKey`)
    plan.addApiKey(apikey)
    plan.addApiStage({
      stage: api.deploymentStage
    })

    new CfnOutput(this, `${props.name}-SocialAPIKey`, {
      value: apikey.keyId,
      exportName: `${props.name}-SocialAPIKey`
    })
  }
}