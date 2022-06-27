#!/usr/bin/env node

const cdk = require('aws-cdk-lib');
const {
  ControlPanelDeployCdkStack,
} = require('../lib/control-panel-deploy-cdk-stack');

const app = new cdk.App();
new ControlPanelDeployCdkStack(app, 'ControlPanelDeployCdkStack', {
  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
  stackName: 'artilleryio-dashboard',

  env: {
    region: process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});
