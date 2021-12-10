import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as Pipeline from '../lib/pipeline-stack';
import {PipelineStack} from "../lib/pipeline-stack";

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new PipelineStack(app, 'MyTestStack', {});
    // THEN
    expectCDK(stack).to(matchTemplate({
        "Resources": {}
    }, MatchStyle.EXACT))
});
