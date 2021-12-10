#!/usr/bin/env node
import 'source-map-support/register';
import {MaciejruCdkStack} from '../lib/maciejru-cdk-stack';
import {BillingStack} from "../lib/biling-stack";
import {PipelineStack} from "../lib/pipeline-stack";
import {App} from "@aws-cdk/core";

const app = new App();
new PipelineStack(app, 'MaciejruCdkStack', {

    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION
    },
});

new BillingStack(app, "BillingStack", {
    budgetAmount: 15,
    emailAddress: "maciejru@amazon.com"
})
