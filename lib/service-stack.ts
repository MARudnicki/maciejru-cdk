import {CfnOutput, Construct, Duration, Stack, StackProps} from "@aws-cdk/core";
import {Alias, CfnParametersCode, Code, Function, Runtime} from "@aws-cdk/aws-lambda";
import {HttpApi, HttpMethod} from "@aws-cdk/aws-apigatewayv2";
import {HttpProxyIntegration, LambdaProxyIntegration} from "@aws-cdk/aws-apigatewayv2-integrations";
import {LambdaDeploymentConfig, LambdaDeploymentGroup} from "@aws-cdk/aws-codedeploy";
import {TreatMissingData} from "@aws-cdk/aws-cloudwatch";

interface ServiceStackProps extends StackProps {
    stageName : string,

}

export class ServiceStack extends Stack {

    public readonly serviceCode: CfnParametersCode
    public readonly serviceEndpointOutput: CfnOutput

    constructor(scope: Construct, id: string, props?: ServiceStackProps) {
        super(scope, id, props);

        this.serviceCode = Code.fromCfnParameters()

        const lambda: Function = new Function(this, "ServiceLambda", {
            runtime: Runtime.NODEJS_14_X,
            handler: 'src/lambda.handler',
            code: this.serviceCode,
            functionName: `serviceLambda_${props?.stageName}`,
            description:`Generated on ${new Date().toISOString()}`
        })

        const alias = new Alias(this, "ServiceLambdaAlias", {
            version:lambda.currentVersion,
            aliasName:`ServiceLambdaAlias${props?.stageName}`
        })

        const innerApiGateway: HttpApi = new HttpApi(this, 'InnerApiGateway', {
            defaultIntegration: new LambdaProxyIntegration({
                handler: lambda
            }),
            apiName: 'InnerApiGateway'
        })
        this.createOuterApiGateway(innerApiGateway);

        this.serviceEndpointOutput = new CfnOutput(this, "ApiEndpointOutput", {
            exportName: `ServiceEndpoint${props?.stageName}`,
            value: innerApiGateway.apiEndpoint,
            description: "Api endpoint"
        })

        if(props?.stageName === 'Prod') {

            new LambdaDeploymentGroup(this, 'DeploymentGroup', {
                alias:alias,
                deploymentConfig: LambdaDeploymentConfig.CANARY_10PERCENT_5MINUTES,
                autoRollback: {
                    deploymentInAlarm: true
                },
                alarms: [
                    innerApiGateway.metricServerError()
                        .with({
                            period: Duration.minutes(1)
                        })
                        .createAlarm(this, 'ServiceErrorAlarm', {
                        threshold: 1,
                        alarmDescription: "Service experienced error",
                        alarmName: `My severe alarm ${props.stageName}`,
                        evaluationPeriods: 1,
                        treatMissingData: TreatMissingData.NOT_BREACHING
                    })
                ]
            })

        }
    }

    private createOuterApiGateway(innerApiGateway: HttpApi) {
        const outerApiGateway = new HttpApi(this, 'outerApiGateway')
        outerApiGateway.addRoutes({
            path: "/",
            methods: [HttpMethod.GET],
            integration: new HttpProxyIntegration({
                url: innerApiGateway.apiEndpoint,
            })
        })

        outerApiGateway.addRoutes({
            path: "/test",
            methods: [HttpMethod.GET],
            integration: new HttpProxyIntegration({
                url: "https://google.com"
            })
        })
    }
}
