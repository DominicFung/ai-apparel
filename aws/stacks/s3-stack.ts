import { App, CfnOutput, Stack, RemovalPolicy } from 'aws-cdk-lib'
import { BlockPublicAccess, Bucket, HttpMethods, BucketAccessControl } from 'aws-cdk-lib/aws-s3'

interface S3Props {
  bucketName: string
}

export class S3Stack extends Stack {
  constructor(app: App, id: string, props: S3Props) {
    super(app, id)
    console.log(props)

    const s3 = new Bucket(this, props.bucketName, {
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false
      } as BlockPublicAccess,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      cors: [{
          allowedMethods: [HttpMethods.GET, HttpMethods.POST, HttpMethods.PUT,],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        }],
      accessControl: BucketAccessControl.PUBLIC_READ,
      publicReadAccess: true
    })

    new CfnOutput(this, 'bucketName', {
      value: s3.bucketName,
    })

    new CfnOutput(this, 'bucketArn', {
      value: s3.bucketArn,
      exportName: `${props.bucketName}-bucketArn`
    })
  }
}