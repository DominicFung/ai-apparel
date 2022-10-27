#!/bin/zsh

SECRETJSON=$( cat secret.json )
CDKOUTJSON=$( cat cdk-outputs.json )

aws secretsmanager create-secret --name aiapparel/secret \
--description "Third Party Secrets for AI Apparel" \
--secret-string "$SECRETJSON" --region us-east-1 --profile juju

aws secretsmanager create-secret --name aiapparel/cdk \
--description "AWS Infrastructure for AI Apparel" \
--secret-string "$CDKOUTJSON" --region us-east-1 --profile juju