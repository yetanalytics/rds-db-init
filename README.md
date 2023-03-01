# rds-db-init
Yet-hosted lambda code for initializing RDS Postgres databases without leaving CloudFormation.

## Purpose

`rds-db-init` allows the creation of an AWS Lambda-backed custom resource that will initialize an RDS Postgres database application user.

## Inputs

| Input                | Description                                                        |
|:---------------------|:-------------------------------------------------------------------|
| DBMasterUsername     | Master username for the RDS database.                              |
| DBMasterPasswordPath | SSM Parameter Store path for RDS DB master password.               |
| DBUsername           | Name of the application DB user to create.                         |
| DBPasswordPath       | SSM Parameter Store path for the RDS DB application user password. |
| DBHost               | Primary endpoint of RDS DB cluster.                                |
| DBPort               | Port to access RDS DB on.                                          |
| DBName               | Name of RDS DB to grant user permissions on.                       |

## Supported Regions

* us-east-1
* us-east-2
* us-west-1
* us-west-2

Artifacts are deployed to `s3://yet-rds-db-init-deploy-${AWS::Region}` when a tag is pushed to this repository.

## License

Copyright © 2023 Yet Analytics, Inc.

Distributed under the Apache License version 2.0.
