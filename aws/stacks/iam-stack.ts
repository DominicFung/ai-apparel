import { App, CfnOutput, Stack, Fn } from 'aws-cdk-lib'
import { AccessKey, Policy, PolicyStatement, User } from 'aws-cdk-lib/aws-iam'

interface IamProps {
  name: string,
  bucketName: string
}

export class IamStack extends Stack {
  constructor(app: App, id: string, props: IamProps) {
    super(app, id)

    const user = new User(this, `${props.name}-User`)

    const aiServiceTableArn = Fn.importValue(`${props.name}-aiServiceTableArn`)
    const aiProductsTableArn = Fn.importValue(`${props.name}-productTableArn`)
    const aiOrderItemTableArn = Fn.importValue(`${props.name}-orderItemTableArn`)
    const aiOrderTableArn = Fn.importValue(`${props.name}-orderTableArn`)
    const bucketArn = Fn.importValue(`${props.bucketName}-bucketArn`)

    user.attachInlinePolicy(new Policy(this, `${props.name}-InlinePolicy`, {
      statements: [
        new PolicyStatement({
          resources: [
            aiServiceTableArn, `${aiServiceTableArn}*`,
            aiProductsTableArn, `${aiProductsTableArn}*`,
            aiOrderItemTableArn, `${aiOrderItemTableArn}*`,
            aiOrderTableArn, `${aiOrderTableArn}*`
          ],
          actions: [
            'dynamodb:*'
          ]
        }),
        new PolicyStatement({
          resources: [ bucketArn, `${bucketArn}/*` ],
          actions: ["s3:*"]
        })
      ]
    }))
    
    const accessKey = new AccessKey(this, `${props.name}-AccessKey`, { user })
    
    new CfnOutput(this, 'AccessKey', {
      value: accessKey.accessKeyId,
      exportName: "AccessKey"
    })

    new CfnOutput(this, 'SecretKey', {
      value: accessKey.secretAccessKey.unsafeUnwrap(),
      exportName: "SecretKey"
    })
  }
}