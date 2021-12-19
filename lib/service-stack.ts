import {Construct, Stack, StackProps} from "@aws-cdk/core";
import {CfnParametersCode, Code, Function, Runtime} from "@aws-cdk/aws-lambda";
import {HttpApi, HttpMethod} from "@aws-cdk/aws-apigatewayv2";
import {HttpProxyIntegration, LambdaProxyIntegration} from "@aws-cdk/aws-apigatewayv2-integrations";

export class ServiceStack extends Stack {

    public readonly serviceCode: CfnParametersCode

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        this.serviceCode = Code.fromCfnParameters()

        const lambda: Function = new Function(this, "ServiceLambda", {
            runtime: Runtime.NODEJS_14_X,
            handler: 'src/lambda.handler',
            code: this.serviceCode,
            functionName: 'ServiceLambda'
        })

        const innerApiGateway: HttpApi = new HttpApi(this, 'InnerApiGateway', {
            defaultIntegration: new LambdaProxyIntegration({
                handler: lambda
            }),
            apiName: 'InnerApiGateway'
        })

        const outerApiGateway = new HttpApi(this, 'outerApiGateway')
        outerApiGateway.addRoutes({
            path: "/",
            methods: [HttpMethod.GET],
            integration: new HttpProxyIntegration({
                url: innerApiGateway.url || "",
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
