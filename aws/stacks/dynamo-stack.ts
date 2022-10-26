import { App, CfnOutput, RemovalPolicy, Stack } from 'aws-cdk-lib'
import { AttributeType, BillingMode, StreamViewType, Table } from 'aws-cdk-lib/aws-dynamodb'

interface DynamoProps {
  name: string
}

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
      removalPolicy: RemovalPolicy.DESTROY
    })

    new CfnOutput(this, `${props.name}-aiServiceTableName`, {
      value: aiServiceTable.tableName,
      exportName: `${props.name}-aiServiceTableName`
    })

    const imageTable = new Table(this, `${props.name}-ImageTable`, {
      tableName: `${props.name}-ImageTable`,
      partitionKey: {
        name: `imageId`,
        type: AttributeType.STRING
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      stream: StreamViewType.NEW_IMAGE,
      removalPolicy: RemovalPolicy.DESTROY
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
      removalPolicy: RemovalPolicy.DESTROY
    })

    new CfnOutput(this, `${props.name}-productTableName`, {
      value: productsTable.tableName,
      exportName: `${props.name}-productTableName`
    })
  }
}