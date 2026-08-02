#!/usr/bin/env bash
set -euo pipefail
: "${AWS_REGION:?Define AWS_REGION}"
: "${SUBNETS:?Define SUBNETS as comma-separated subnet IDs}"
: "${SECURITY_GROUPS:?Define SECURITY_GROUPS as comma-separated security group IDs}"
: "${TARGET_GROUP_ARN:?Define TARGET_GROUP_ARN}"
CLUSTER="${ECS_CLUSTER:-facturacion-cluster}"
SERVICE="${ECS_SERVICE:-farahn-store-web}"
TASK_FAMILY="${TASK_FAMILY:-farahn-store-web}"
DESIRED_COUNT="${DESIRED_COUNT:-1}"
aws ecs create-service --region "$AWS_REGION" --cluster "$CLUSTER" --service-name "$SERVICE" --task-definition "$TASK_FAMILY" --desired-count "$DESIRED_COUNT" --launch-type FARGATE --platform-version LATEST --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SECURITY_GROUPS],assignPublicIp=DISABLED}" --load-balancers "targetGroupArn=$TARGET_GROUP_ARN,containerName=farahn-store-web,containerPort=80" --health-check-grace-period-seconds 60 --deployment-configuration "maximumPercent=200,minimumHealthyPercent=100,deploymentCircuitBreaker={enable=true,rollback=true}"
