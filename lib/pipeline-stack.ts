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

        const sourceOutput = new Artifact('MySourceOutput')

        pipeline.addStage({
            stageName: 'MySource',
            actions: [
                new GitHubSourceAction({
                    owner: 'MARudnicki',
                    repo: 'maciejru-cdk',
                    branch: 'master',
                    actionName: 'Pipeline_Source',
                    oauthToken: SecretValue.secretsManager('github-token'),
                    output: sourceOutput
                })
            ]
        })

        const cdkBuildOutput = new Artifact("CdkBuildOutput")

        pipeline.addStage({

            stageName: 'MyBuild',
            actions: [
                new CodeBuildAction({
                    actionName: 'CDK_Build',
                    input: sourceOutput,
                    outputs: [cdkBuildOutput],
                    project: new PipelineProject(this, 'CdkBuildProject', {
                        environment: {
                            buildImage: LinuxBuildImage.STANDARD_5_0
                        },
                        buildSpec: BuildSpec.fromSourceFilename('build-spec/cdk-build-spec.yml')
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
