import {BillingStack} from "../lib/biling-stack";
import {SynthUtils} from "@aws-cdk/assert";
import {App} from "@aws-cdk/core";

test('Billing Stack', ()=>{
    const app = new App()
    const stack = new BillingStack(app, "BillingStack", {
        budgetAmount: 2,
        emailAddress: "test@example.com"
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
})


