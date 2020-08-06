#!/bin/bash

# Get the required cluster values needed when creating the capacity provider
export asg_name=$(aws cloudformation describe-stacks --stack-name sophie-capacityproviders | jq -r --arg a $1 '.Stacks[].Outputs[] | select(.ExportName | contains($a)) | .OutputValue')
export asg_arn=$(aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names $asg_name | jq -r .AutoScalingGroups[].AutoScalingGroupARN)
export capacity_provider_name=$(echo "$1-$(date +'%s')")

echo $asg_name
echo $asg_arn
echo $capacity_provider_name

# Creating capacity provider
aws ecs create-capacity-provider \
     --name $capacity_provider_name \
     --auto-scaling-group-provider autoScalingGroupArn="$asg_arn",managedScaling=\{status="ENABLED",targetCapacity=100\},managedTerminationProtection="DISABLED" \
     --region $AWS_DEFAULT_REGION