
# AI Apparel - Starter Guide

## Prerequisite

 - NodeJS: https://nodejs.org/en/download/ || Get the LTS version.
 - Git: https://git-scm.com/downloads || Bash is highly recommended.
 - AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html || version 2
 - VS Code: https://code.visualstudio.com/

# Getting Started

```bash
git clone https://github.com/DominicFung/ai-apparel.git
cd ai-apparel/

# pulling all code and checking out dev
git pull
git checkout dev

# creating your own feature branch
git checkout -b nathan-feature

# copy the secret.starter.json to the real file
# you can also do this manually if you want in VS Code
cp secret.starter.json secret.json
```

# Setting up your accounts

## Seal & Secret

You can use the following site to generate 2 random 60 char alpha-numeric password:
https://delinea.com/resources/password-generator-it-tool

put them into your secret

<br />

## Gelato

Skip for now

<br />

## Printify

Get a "Personal Access Token" by following the instructions below.

Instructions: https://developers.printify.com/#authentication

Link (just for reference): https://printify.com/app/account/api

<br />

## Ip Geo Location

Go to: https://app.ipgeolocation.io/

<br />

## Square

Create a Square Account.

Instructions: https://developer.squareup.com/docs/devtools/sandbox/overview#create-a-sandbox-test-account

<br />

# Setting up your AWS

Ask Dom to create an AWS account for you.
You will get an invite, as well as an AWS secret key and access key.

```bash
aws --version
# aws-cli/2.0.46 Python/3.7.4 Darwin/22.1.0 exe/x86_64

aws configure --profile juju
# AWS Access Key ID [None]: <ACCESS KEY HERE>
# AWS Secret Access Key [None]: <SECRET ACCESS KEY HERE>
# Default region name [None]: us-east-1
# Default output format [None]: json
```

<br />


## Ask Dom for cdk-outputs.json

Ask Dom for cdk-outputs.json. This file has all the backend infrastructure.

Place this at the root of your project. `<whatever>/ai-apparel/cdk-outputs.json`

<br />

# Starting up your Project!

```bash
pwd
# <dir of project>/ai-apparel/

npm i
npm run dev
```

In your browser, Go to `http://localhost:3000`

<br />

# Configuration References

Please Ignore, This is AWS configuration.

```yml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
        - aws secretsmanager get-secret-value --secret-id "aiapparel/cdk" --query SecretString --output cdk-outputs.json
        - aws secretsmanager get-secret-value --secret-id "aiapparel/secret" --query SecretString --output secret.json
        - ls -la
        - pwd
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```
