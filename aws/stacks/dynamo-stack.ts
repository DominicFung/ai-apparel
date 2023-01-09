import { App, CfnOutput, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib'
import { AttributeType, BillingMode, StreamViewType, Table } from 'aws-cdk-lib/aws-dynamodb'
import { ManagedPolicy, Policy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam'
import { Runtime, StartingPosition } from 'aws-cdk-lib/aws-lambda'
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources'
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs'
import { join } from 'path'

interface DynamoProps {
  name: string
}

const RPOLICY = RemovalPolicy.DESTROY

export class DynamoStack extends Stack {
  constructor(app: App, id: string, props: DynamoProps) {
    super(app, id)

    const aiServiceTable = new Table(this, `${props.name}-AiServiceTable`, {
      tableName: `${props.name}-AIServiceTable`,
      partitionKey: {
        name: `serviceId`,
        type: AttributeType.STRING
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      stream: StreamViewType.NEW_IMAGE,
      removalPolicy: RPOLICY
    })

    new CfnOutput(this, `${props.name}-aiServiceTableName`, {
      value: aiServiceTable.tableName,
      exportName: `${props.name}-aiServiceTableName`
    })

    new CfnOutput(this, `${props.name}-aiServiceTableArn`, {
      value: aiServiceTable.tableArn,
      exportName: `${props.name}-aiServiceTableArn`
    })

    const imageTable = new Table(this, `${props.name}-ImageTable`, {
      tableName: `${props.name}-ImageTable`,
      partitionKey: {
        name: `imageId`,
        type: AttributeType.STRING
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      stream: StreamViewType.NEW_IMAGE,
      removalPolicy: RPOLICY
    })

    new CfnOutput(this, `${props.name}-imageTableName`, {
      value: imageTable.tableName,
      exportName: `${props.name}-imageTableName`
    })

    const productsTable = new Table(this, `${props.name}-productTable`, {
      tableName: `${props.name}-ProductTable`,
      partitionKey: {
        name: `productId`,
        type: AttributeType.STRING
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      stream: StreamViewType.NEW_IMAGE,
      removalPolicy: RPOLICY
    })

    new CfnOutput(this, `${props.name}-productTableName`, {
      value: productsTable.tableName,
      exportName: `${props.name}-productTableName`
    })

    new CfnOutput(this, `${props.name}-productTableArn`, {
      value: productsTable.tableArn,
      exportName: `${props.name}-productTableArn`
    })

    const orderItemTable = new Table (this, `${props.name}-orderItemTable`, {
      tableName: `${props.name}-OrderItemTable`,
      partitionKey: {
        name: `orderItemId`,
        type: AttributeType.STRING
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      stream: StreamViewType.NEW_IMAGE,
      removalPolicy: RPOLICY
    })

    new CfnOutput(this, `${props.name}-orderItemTableName`, {
      value: orderItemTable.tableName,
      exportName: `${props.name}-orderItemTableName`
    })

    new CfnOutput(this, `${props.name}-orderItemTableArn`, {
      value: orderItemTable.tableArn,
      exportName: `${props.name}-orderItemTableArn`
    })

    const orderTable = new Table (this, `${props.name}-orderTable`, {
      tableName: `${props.name}-OrderTable`,
      partitionKey: {
        name: `orderId`,
        type: AttributeType.STRING
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      stream: StreamViewType.NEW_IMAGE,
      removalPolicy: RPOLICY
    })

    new CfnOutput(this, `${props.name}-orderTableName`, {
      value: orderTable.tableName,
      exportName: `${props.name}-orderTableName`
    })

    new CfnOutput(this, `${props.name}-orderTableArn`, {
      value: orderTable.tableArn,
      exportName: `${props.name}-orderTableArn`
    })

    const customerTable = new Table (this, `${props.name}-customerTable`, {
      tableName: `${props.name}-CustomerTable`,
      partitionKey: {
        name: `customerId`,
        type: AttributeType.STRING
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      stream: StreamViewType.NEW_IMAGE,
      removalPolicy: RPOLICY
    })

    new CfnOutput(this, `${props.name}-customerTableName`, {
      value: customerTable.tableName,
      exportName: `${props.name}-customerTableName`
    })

    new CfnOutput(this, `${props.name}-customerTableArn`, {
      value: customerTable.tableArn,
      exportName: `${props.name}-customerTableArn`
    })

    const TTL = "ttl"
    const socialTable = new Table (this, `${props.name}-socialTable`, {
      tableName: `${props.name}-SocialTable`,
      partitionKey: {
        name: `socialId`,
        type: AttributeType.STRING
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      stream: StreamViewType.NEW_IMAGE,
      removalPolicy: RPOLICY,
      timeToLiveAttribute: TTL
    })

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
            resources: [ `${socialTable.tableArn}*` ]
          })
        ]
      })
    )

    const nodeJsFunctionProps: NodejsFunctionProps = {
      role: excRole,
      bundling: { externalModules: ['aws-sdk'] },
      depsLockFilePath: join(__dirname, '../lambdas', 'package-lock.json'),
      environment: {
        TABLE_NAME: socialTable.tableName
      },
      runtime: Runtime.NODEJS_16_X,
    }

    const createPost = new NodejsFunction(this, `${props.name}-CreatePost`, {
      entry: join(__dirname, '../lambdas', 'social', 'post.ts'),
      memorySize: 10240,
      timeout: Duration.minutes(5),
      ...nodeJsFunctionProps
    })

    createPost.addEventSource(new DynamoEventSource(socialTable, {
      startingPosition: StartingPosition.LATEST
    }))

    new CfnOutput(this, `${props.name}-socialTableName`, {
      value: socialTable.tableName,
      exportName: `${props.name}-socialTableName`
    })

    new CfnOutput(this, `${props.name}-socialTableArn`, {
      value: socialTable.tableArn,
      exportName: `${props.name}-socialTableArn`
    })

    new CfnOutput(this, `${props.name}-socialTableTTL`, {
      value: TTL,
      exportName: `${props.name}-socialTableTTL`
    })
  }
}