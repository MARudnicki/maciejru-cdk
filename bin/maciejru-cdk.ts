#!/usr/bin/env node
import 'source-map-support/register';
import {BillingStack} from "../lib/biling-stack";
import {PipelineStack} from "../lib/pipeline-stack";
import {App} from "@aws-cdk/core";
import {ServiceStack} from "../lib/service-stack";
import {IStage} from "@aws-cdk/aws-codepipeline";

const app = new App();
const pipelineStack = new PipelineStack(app, 'MaciejruCdkStack', {

    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION
    },
});

const billingStack = new BillingStack(app, "BillingStack", {
    budgetAmount: 15,
    emailAddress: "maciejru@amazon.com"
})

const lambdaStackTest = new ServiceStack(app, "LambdaStackAlpha", {
    stageName: "AlphaStage"
})

const lambdaStackProd = new ServiceStack(app, "LambdaStackProd", {
    stageName: "ProdStage"
})

const alphaStage: IStage = pipelineStack.addServiceStage(lambdaStackTest, "Alpha")
const prodStage: IStage = pipelineStack.addServiceStage(lambdaStackProd, "Prod")

pipelineStack.addBillingStackToStage(billingStack, prodStage)

pipelineStack.addServiceIntegrationTestToStage(
    alphaStage,
    lambdaStackTest.serviceEndpointOutput.importValue
)
