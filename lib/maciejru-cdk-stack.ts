// import * as sqs from 'aws-cdk-lib/aws-sqs';

import {Construct, Stack, StackProps} from "@aws-cdk/core";

export class MaciejruCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'MaciejruCdkQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
