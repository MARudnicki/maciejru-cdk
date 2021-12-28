import {Construct, SecretValue, Stack, StackProps} from "@aws-cdk/core";
import {Artifact, IStage, Pipeline} from "@aws-cdk/aws-codepipeline";
import {
    CloudFormationCreateUpdateStackAction,
    CodeBuildAction,
    CodeBuildActionType,
    GitHubSourceAction
} from "@aws-cdk/aws-codepipeline-actions";
import {BuildEnvironmentVariableType, BuildSpec, LinuxBuildImage, PipelineProject} from "@aws-cdk/aws-codebuild";
import {ServiceStack} from "./service-stack";
import {BillingStack} from "./biling-stack";
import {SnsTopic} from "@aws-cdk/aws-events-targets";
import {Topic} from "@aws-cdk/aws-sns";
import {EventField, RuleTargetInput} from "@aws-cdk/aws-events";

export class PipelineStack extends Stack {

    private readonly pipeline: Pipeline;
    private readonly cdkBuildOutput: Artifact;
    private readonly serviceBuildOutput: Artifact;
    private readonly serviceSourceOutputArtifact: Artifact;
    private readonly pipelineNotificationsTopic: Topic;

    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        this.pipelineNotificationsTopic = new Topic(this, 'PipelineNotificationTopic', {
            topicName:'PipelineNotification'
        })

        this.pipeline = new Pipeline(this, 'Pipeline', {
            pipelineName: 'MyPipeline',
            crossAccountKeys: false,
            restartExecutionOnUpdate: true
        })

        const cdkSourceOutput = new Artifact('CdkSourceOutput')
        this.serviceSourceOutputArtifact = new Artifact('LambdaSourceOutput')

        this.pipeline.addStage({
            stageName: 'MySource',
            actions: [
                new GitHubSourceAction({
                    owner: 'MARudnicki',
                    repo: 'maciejru-cdk',
                    branch: 'master',
                    actionName: 'Pipeline_Source',
                    oauthToken: SecretValue.secretsManager('github-token'),
                    output: cdkSourceOutput
                }),
                new GitHubSourceAction({
                    owner: 'MARudnicki',
                    repo: 'express-lambda',
                    branch: 'master',
                    actionName: 'Lambda_Source',
                    oauthToken: SecretValue.secretsManager('github-token'),
                    output: this.serviceSourceOutputArtifact
                })

            ]
        })

        this.cdkBuildOutput = new Artifact("CdkBuildOutput")
        this.serviceBuildOutput = new Artifact("LambdaBuildOutput")

        this.pipeline.addStage({

            stageName: 'MyBuild',
            actions: [
                new CodeBuildAction({
                    actionName: 'CDK_Build',
                    input: cdkSourceOutput,
                    outputs: [this.cdkBuildOutput],
                    project: new PipelineProject(this, 'CdkBuildProject', {
                        environment: {
                            buildImage: LinuxBuildImage.STANDARD_5_0
                        },
                        buildSpec: BuildSpec.fromSourceFilename('build-spec/cdk-build-spec.yml')
                    })
                }),
                new CodeBuildAction({
                    actionName: 'Service_Build',
                    input: this.serviceSourceOutputArtifact,
                    outputs: [this.serviceBuildOutput],
                    project: new PipelineProject(this, 'LambdaBuildProject', {
                        environment: {
                            buildImage: LinuxBuildImage.STANDARD_5_0
                        },
                        buildSpec: BuildSpec.fromSourceFilename('build-spec/lambda-build-spec.yml')
                    })
                })
            ]

        })

        this.pipeline.addStage({
            stageName: 'MyPipelineUpdate',
            actions: [
                new CloudFormationCreateUpdateStackAction({
                    actionName: 'Pipeline_Update',
                    stackName: "MaciejruCdkStack",
                    templatePath: this.cdkBuildOutput.atPath("MaciejruCdkStack.template.json"),
                    adminPermissions: true
                })
            ]
        })
    }

    public addServiceStage(serviceStack: ServiceStack, stageName: string): IStage {
        return this.pipeline.addStage({
            stageName: stageName,
            actions: [
                new CloudFormationCreateUpdateStackAction({
                    actionName: 'Service_Update',
                    stackName: serviceStack.stackName,
                    templatePath: this.cdkBuildOutput.atPath(`${serviceStack.stackName}.template.json`),
                    adminPermissions: true,
                    parameterOverrides: {
                        ...serviceStack.serviceCode.assign(
                            this.serviceBuildOutput.s3Location
                        )
                    },
                    extraInputs: [this.serviceBuildOutput]
                })
            ]
        })
    }

    public addServiceIntegrationTestToStage(stage: IStage, serviceEndpoint:string){
        const integTestAction = new CodeBuildAction({
            actionName: "Integration_Test",
            input: this.serviceSourceOutputArtifact,
            project: new PipelineProject(this, "ServiceIntegrationTestProjects", {
                environment: {
                    buildImage: LinuxBuildImage.STANDARD_5_0
                },
                buildSpec: BuildSpec.fromSourceFilename("build-spec/integ-test-build-spec.yml")
            }),
            environmentVariables: {
                SERVICE_ENDPOINT: {
                    value: serviceEndpoint,
                    type: BuildEnvironmentVariableType.PLAINTEXT
                }
            },
            type: CodeBuildActionType.TEST,
            runOrder: 2
        })
        stage.addAction(integTestAction)
        integTestAction.onStateChange(
            "IntegrationTestFailed",
            new SnsTopic(this.pipelineNotificationsTopic, {
                message: RuleTargetInput.fromText(
                    `Integration Test Failed. See details here: ${EventField.fromPath(
                        "$.detail.execution-result.external-execution-url"
                    )}`
                ),
            }),
            {
                ruleName: "IntegrationTestFailed",
                eventPattern: {
                    detail: {
                        state: ["FAILED"],
                    },
                },
                description: "Integration test has failed",
            }
        );
    }

    public addBillingStackToStage(billingStack: BillingStack, stage: IStage) {
        stage.addAction(new CloudFormationCreateUpdateStackAction({
            actionName: 'Biling_Update',
            stackName: billingStack.stackName,
            templatePath: this.cdkBuildOutput.atPath(
                `${billingStack.stackName}.template.json`
            ),
            adminPermissions: true
        }))
    }

}
