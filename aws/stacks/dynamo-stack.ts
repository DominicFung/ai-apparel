import { App, CfnOutput, RemovalPolicy, Stack } from 'aws-cdk-lib'
import { AttributeType, BillingMode, StreamViewType, Table } from 'aws-cdk-lib/aws-dynamodb'
interface DynamoProps {
  name: string
}

const RPOLICY = RemovalPolicy.DESTROY

export class DynamoStack extends Stack {
  public readonly socialTable: Table

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
    this.socialTable = new Table (this, `${props.name}-socialTable`, {
      tableName: `${props.name}-SocialTable`,
      partitionKey: {
        name: `socialId`,
        type: AttributeType.STRING
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: RPOLICY,
      timeToLiveAttribute: TTL
    })

    new CfnOutput(this, `${props.name}-socialTableName`, {
      value: this.socialTable.tableName,
      exportName: `${props.name}-socialTableName`
    })

    new CfnOutput(this, `${props.name}-socialTableArn`, {
      value: this.socialTable.tableArn,
      exportName: `${props.name}-socialTableArn`
    })

    new CfnOutput(this, `${props.name}-socialTableTTL`, {
      value: TTL,
      exportName: `${props.name}-socialTableTTL`
    })
  }
}