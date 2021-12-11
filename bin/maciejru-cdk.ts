#!/usr/bin/env node
import 'source-map-support/register';
import {BillingStack} from "../lib/biling-stack";
import {PipelineStack} from "../lib/pipeline-stack";
import {App} from "@aws-cdk/core";
import {ServiceStack} from "../lib/service-stack";

const app = new App();
const pipelineStack = new PipelineStack(app, 'MaciejruCdkStack', {

    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION
    },
});

new BillingStack(app, "BillingStack", {
    budgetAmount: 15,
    emailAddress: "maciejru@amazon.com"
})

const lambdaStackProd = new ServiceStack(app, "LambdaStackProd")

pipelineStack.addServiceStage(lambdaStackProd, "Prod")
