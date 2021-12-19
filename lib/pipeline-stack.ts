import {Construct, SecretValue, Stack, StackProps} from "@aws-cdk/core";
import {Artifact, IStage, Pipeline} from "@aws-cdk/aws-codepipeline";
import {
    CloudFormationCreateUpdateStackAction,
    CodeBuildAction,
    GitHubSourceAction
} from "@aws-cdk/aws-codepipeline-actions";
import {BuildSpec, LinuxBuildImage, PipelineProject} from "@aws-cdk/aws-codebuild";
import {ServiceStack} from "./service-stack";
import {BillingStack} from "./biling-stack";

export class PipelineStack extends Stack {

    private readonly pipeline: Pipeline;
    private readonly cdkBuildOutput: Artifact;
    private readonly lambdaBuildOutput: Artifact;


    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        this.pipeline = new Pipeline(this, 'Pipeline', {
            pipelineName: 'MyPipeline',
            crossAccountKeys: false,
            restartExecutionOnUpdate: true
        })

        const cdkSourceOutput = new Artifact('CdkSourceOutput')
        const lambdaSourceOutput = new Artifact('LambdaSourceOutput')

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
                    output: lambdaSourceOutput
                })

            ]
        })

        this.cdkBuildOutput = new Artifact("CdkBuildOutput")
        this.lambdaBuildOutput = new Artifact("LambdaBuildOutput")

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
                    input: lambdaSourceOutput,
                    outputs: [this.lambdaBuildOutput],
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
                            this.lambdaBuildOutput.s3Location
                        )
                    },
                    extraInputs: [this.lambdaBuildOutput]
                })
            ]
        })
    }

    public addBillingStackToStage(bilingStack: BillingStack, stage: IStage) {
        stage.addAction(new CloudFormationCreateUpdateStackAction({
            actionName: 'Biling_Update',
            stackName: bilingStack.stackName,
            templatePath: this.cdkBuildOutput.atPath(
                `{bilingStack.stackName}.template.json`
            ),
            adminPermissions: true
        }))
    }
}
