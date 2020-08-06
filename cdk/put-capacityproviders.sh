#!/bin/bash

aws ecs put-cluster-capacity-providers \
--cluster $1 \
--capacity-providers $2 $3 \
--default-capacity-provider-strategy capacityProvider=$2,weight=1,base=1 capacityProvider=$3,weight=1