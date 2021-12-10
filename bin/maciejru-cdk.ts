#!/usr/bin/env node
import 'source-map-support/register';
import {MaciejruCdkStack} from '../lib/maciejru-cdk-stack';
import {BillingStack} from "./biling-stack";
import {App} from "@aws-cdk/core";

const app = new App();
new MaciejruCdkStack(app, 'MaciejruCdkStack', {
    /* If you don't specify 'env', this stack will be environment-agnostic.
     * Account/Region-dependent features and context lookups will not work,
     * but a single synthesized template can be deployed anywhere. */

    /* Uncomment the next line to specialize this stack for the AWS Account
     * and Region that are implied by the current CLI configuration. */
    // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

    /* Uncomment the next line if you know exactly what Account and Region you
     * want to deploy the stack to. */
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION
    },

    /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});

new BillingStack(app, "BillingStack", {
    budgetAmount: 15,
    emailAddress: "maciejru@amazon.com"
})
