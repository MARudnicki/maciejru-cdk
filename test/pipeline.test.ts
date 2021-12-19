import {App} from "@aws-cdk/core";
import {ServiceStack} from "../lib/service-stack";
import {PipelineStack} from "../lib/pipeline-stack";
import {arrayWith, haveResourceLike, objectLike} from "@aws-cdk/assert";

test("Adding service stage", () => {
    ///Given
    const app = new App()
    const serviceStack = new ServiceStack(app, "ServiceStack")
    const pipelineStack = new PipelineStack(app, "PipelineStack", {})

    //When
    pipelineStack.addServiceStage(serviceStack, "Test")

    //Then
    expect(pipelineStack).toBe(
        haveResourceLike("AWS::CodePipeline::Pipeline")
    );
});

// test("Adding biling stacke", () => {
//     ///Given
//     const app = new App()
//     const serviceStack = new ServiceStack(app, "ServiceStack")
//     const pipelineStack = new PipelineStack(app, "PipelineStack", {})
//
//     //When
//     pipelineStack.addServiceStage(serviceStack, "Test")
//
//     //Then
//     expect(pipelineStack).toBe(
//         haveResourceLike("AWS::CodePipeline::Pipeline")
//     );
// });
