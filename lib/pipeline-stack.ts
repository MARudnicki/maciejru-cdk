import {Construct, SecretValue, Stack, StackProps} from "@aws-cdk/core";
import {Artifact, Pipeline} from "@aws-cdk/aws-codepipeline";
import {
    CloudFormationCreateUpdateStackAction,
    CodeBuildAction,
    GitHubSourceAction
} from "@aws-cdk/aws-codepipeline-actions";
import {BuildSpec, LinuxBuildImage, PipelineProject} from "@aws-cdk/aws-codebuild";

export class PipelineStack extends Stack {

    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        const pipeline = new Pipeline(this, 'Pipeline', {
            pipelineName: 'MyPipeline',
            crossAccountKeys: false
        })

        const cdkSourceOutput = new Artifact('CdkSourceOutput')
        const lambdaSourceOutput = new Artifact('LambdaSourceOutput')

        pipeline.addStage({
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

        const cdkBuildOutput = new Artifact("CdkBuildOutput")
        const lambdaBuildOutput = new Artifact("LambdaBuildOutput")

        pipeline.addStage({

            stageName: 'MyBuild',
            actions: [
                new CodeBuildAction({
                    actionName: 'CDK_Build',
                    input: cdkSourceOutput,
                    outputs: [cdkBuildOutput],
                    project: new PipelineProject(this, 'CdkBuildProject', {
                        environment: {
                            buildImage: LinuxBuildImage.STANDARD_5_0
                        },
                        buildSpec: BuildSpec.fromSourceFilename('build-specs/cdk-build-specs.yml')
                    })
                }),
                new CodeBuildAction({
                    actionName: 'Service_Build',
                    input: lambdaSourceOutput,
                    outputs: [lambdaBuildOutput],
                    project: new PipelineProject(this, 'LambdaBuildProject', {
                        environment: {
                            buildImage: LinuxBuildImage.STANDARD_5_0
                        },
                        buildSpec: BuildSpec.fromSourceFilename('build-specs/lambda-build-specs.yml')
                    })
                })
            ]

        })

        pipeline.addStage({
            stageName: 'MyPipelineUpdate',
            actions: [
                new CloudFormationCreateUpdateStackAction({
                    actionName: 'Pipeline_Update',
                    stackName: "MaciejruCdkStack",
                    templatePath: cdkBuildOutput.atPath("MaciejruCdkStack.template.json"),
                    adminPermissions: true
                })
            ]


        })

    }
}
