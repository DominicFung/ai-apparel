
# AI Apparel

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
