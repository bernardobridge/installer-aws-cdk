# Artillery cloud-native installer for AWS

This is the official, recommended, and supported method to install Artillery dashboard in AWS.


ℹ️ **NOTE**
Artillery dashboard is currently in private beta and requires an active deployment of [Artillery Pro](https://www.artillery.io/pricing). To join the beta, please get in touch via [team@artillery.io](mailto:team@artillery.io)


## Introduction

This [AWS CDK](https://aws.amazon.com/cdk/)-based installer creates all of the required components to get started with a self-hosted Artillery dashboard.

## Pre-requisites

- Active Artillery Pro installation (this code references an IAM policy created by Artillery Pro)
- CDK CLI installed (`npm install -g aws-cdk`)
- AWS profile set up with a default region
- A GitHub OAuth app created to configure login with GitHub ([GitHub docs](https://docs.github.com/en/developers/apps/building-oauth-apps/creating-an-oauth-app))
  - The app can be created under any GitHub account that you or your team control. You can start with a GitHub app in your own account, and change it later.

## Usage

### Deploy Artillery dashboard stack

Set up dependencies:

```shell
export DEFAULT_AWS_REGION=us-east-1 # the region where Artillery Pro is deployed
npm install
cdk bootstrap # bootstrap AWS CDK
```

Set required configuration for the app:

#### `GITHUB_ALLOWED_ORGS` and `GITHUB_ALLOWED_USERS`

These parameters control who is allowed to access the dashboard.

- `GITHUB_ALLOWED_ORGS` - a JSON-encoded list of GitHub org names. Any user with a [public membership](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-your-membership-in-organizations/publicizing-or-hiding-organization-membership) of that org will be able to use the dashboard.
- `GITHUB_ALLOWED_USERS` - a JSON-encoded list of GitHub usernames. A user on this list will be allowed to use the dashboard.

For example, to allow the GitHub user `hassy` to login, run:

```shell
artillery set-config-value --name GITHUB_ALLOWED_USERS --value '["hassy"]'
```

To allow anyone in the `artilleryio` organization to login, run:

```shell
artillery set-config-value --name GITHUB_ALLOWED_ORGS --value '["artilleryio"]'
```

**NOTE**: Both of these parameters are expected to be set. If you're not going to use one of them, set it to an empty list with:

```shell
# Not using username-based login, so set it to an empty list:
artillery set-config-value --name GITHUB_ALLOWED_USERS --value '[]'
```

#### GITHUB_ALLOWED_USERS in Secrets Manager instead of SSM Parameter Store

The command listed above creates the config value in SSM Parameter Store, which is the default way of using this. However, since SSM Parameter Store has a 4-8 KB limitation in the size of the secret, you may hit this limit if you want to allow a sufficiently large user base, and `GITHUB_ALLOWED_ORGS` doesn't work for you (e.g. if users in your org don't have a public profile enabled by default).

In that case, you will need to:
1. Create a **Plaintext Secret** in Secrets Manager, called `/artilleryio/GITHUB_ALLOWED_USERS`, in the same AWS region as your deployment.
2. The secret will look the same as the SSM secret described above, a list of users, e.g. `["hassy", "dino"]`. 
3. When deploying the dashboard, make sure to set the environment variable `USE_SECRETS_MANAGER_FOR_GITHUB_USERS=true` before your `cdk deploy` command.

#### `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`

These need to be set to a valid client ID and client secret for a GitHub OAuth app. See [GitHub docs](https://docs.github.com/en/developers/apps/building-oauth-apps/creating-an-oauth-app) for details on how to create an app. **Note:** set "Authorization Callback URL" to `http://localhost` initially. You will update this setting with the actual URL of Artillery dashboard once you've deployed it.

```shell
artillery set-config-value --name GITHUB_CLIENT_ID --value abcd123
artillery set-config-value --name GITHUB_CLIENT_SECRET --value abcd123
```

#### `NEXTAUTH_SECRET`

Run the following command to set this value to a randomly-generated string:

**NOTE**: you will need `pwgen` installed (e.g. `brew install pwgen` / `apt-get install pwgen`)

```shell
artillery set-config-value --name NEXTAUTH_SECRET --value "$(pwgen 32 -1)"
```

#### Deploy the dashboard

Minimum configuration deployment of Artillery dashboard:

```shell
CREATE_CLUSTER=true cdk deploy
```

The CDK will synthesize a CloudFormation stack, display a summary of resources that will be created, and ask for confirmation to start the deployment:

![cdk synth](./docs/cdk-synth.png)

![cdk confirmation](./docs/cdk-confirm.png)

Once confirmed, a CloudFormation stack will be created, which will create:

- a new Fargate cluster in the default VPC
- a Fargate service running Artillery dashboard
- an internal ALB to front the service

#### Finish the installation

When the deployment is completed, the CDK will print the DNS name of the load balancer it has created.

![cdk done](./docs/cdk-alb.png)

Use that URL to update the "Authorization Callback URL" setting for the GitHub app.

You should now be able to go to that URL in the browser and log into Artillery dashboard.

### Configuration

The stack supports a variety of deployment configurations.

#### Application version

By default, the stack will deploy the latest version of the application (using the `latest` tag).

To pin to a specific version, set the `APP_VERSION` environment variable.

Available versions:

- v0.7.0
- v0.8.0
- v0.9.0
- v0.9.1
- v0.9.2
- v0.9.3

#### Application visibility

By default, the dashboard will be deployed as an internal service (behind an internal ALB), and will only be accessible through a VPN. To create an internet-facing deployment, set the following environment variables:

- `USE_INTERNET_FACING_ALB=true`
- `USE_TLS=true`
- `ACM_CERT_ARN=arn:aws:acm:arn-of-an-acm-certificate-to-use`
- `APP_DOMAIN=my-cert-domain.com`

#### VPC

By default, the deployment will be created in the default VPC. If the default VPC does not exist, or if you want to designate a specific VPC, set the following environment variable:

- `VPC_ID=<id of a VPC>`, e.g. `VPC_ID=vpc-id-12345`

#### Fargate cluster

The dashboard can be deployed to an existing Fargate cluster, or the stack can create one for you. This can be configured with the following environment variables:

- `FARGATE_CLUSTER_NAME` - the name of the Fargate cluster to use, defaults to `artilleryio-cluster`
- `CREATE_CLUSTER` - set to `true` to create the cluster, leave out if the cluster already exists

#### Secondary deployment

If you have a secondary deployment of Artillery Pro, configure Artillery dashboard to use that deployment by setting `ARTILLERY_BACKEND=<region of secondary deployment>`, e.g.:

```shell
ARTILLERY_BACKEND=eu-central-1 cdk deploy
```

## Useful commands to work with the CDK

* `npm run test`         perform the jest unit tests
* `cdk deploy`           deploy this stack to your default AWS account/region
* `cdk diff`             compare deployed stack with current state
* `cdk synth`            emits the synthesized CloudFormation template
* `cdk destroy`          delete the existing CloudFormation stack
