import { App, CfnOutput, Duration, Stack } from 'aws-cdk-lib'
import { Cors, IResource, LambdaIntegration, MockIntegration, PassthroughBehavior, Period, RestApi } from 'aws-cdk-lib/aws-apigateway'

import { ManagedPolicy, Policy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs'

import { join } from 'path'

interface ApiGatewayProps {
  name: string,
  restAPIName: string
}

export class ApiGatewayStack extends Stack {
  constructor(app: App, id: string, props: ApiGatewayProps) {
    super(app, id)

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
          })
        ]
      })
    )

    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ['aws-sdk'],
      },
      depsLockFilePath: join(__dirname, '../lambdas', 'package-lock.json'),
      runtime: Runtime.NODEJS_16_X,
    }

    const processHolidays = new NodejsFunction(this, `${props.name}-ProcessHolidayFunction`, {
      entry: join(__dirname, '../lambdas', 'socialMedia.ts'),
      handler: "processHolidays",
      role: excRole,
      memorySize: 10240,
      timeout: Duration.minutes(15),
      ...nodeJsFunctionProps
    })

    const processHolidaysIntegration = new LambdaIntegration(processHolidays)  
    
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
    social.addMethod('POST', processHolidaysIntegration, { apiKeyRequired: true })

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

export function addCorsOptions(apiResource: IResource) {
  apiResource.addMethod('OPTIONS', new MockIntegration({
    integrationResponses: [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
        'method.response.header.Access-Control-Allow-Origin': "'*'",
        'method.response.header.Access-Control-Allow-Credentials': "'false'",
        'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
      },
    }],
    passthroughBehavior: PassthroughBehavior.NEVER,
    requestTemplates: {
      "application/json": "{\"statusCode\": 200}"
    },
  }), {
    methodResponses: [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': true,
        'method.response.header.Access-Control-Allow-Methods': true,
        'method.response.header.Access-Control-Allow-Credentials': true,
        'method.response.header.Access-Control-Allow-Origin': true,
      },
    }]
  })
}