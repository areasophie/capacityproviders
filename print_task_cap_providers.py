#!/usr/bin/env python3

import boto3
from requests import get
from os import getenv
from json import loads

from flask import Flask
app = Flask(__name__)

def get_container_arn():
    _url = "{}/task".format(getenv('ECS_CONTAINER_METADATA_URI_V4'))
    return loads(get(_url).text)['TaskARN']
    

@app.route('/')
def print_tasks_cap_prov_strategy():
    c = boto3.client('ecs')
    clusterName = getenv('ECS_CLUSTER_NAME')
    arns = c.list_tasks(cluster=clusterName)['taskArns']
    print(arns)
    all_tasks = c.describe_tasks(cluster=clusterName, tasks=arns)['tasks']
    print(all_tasks)
    results = {x.get('taskArn'): x.get('capacityProviderName', "NON_DEFAULT") for x in all_tasks}
    my_arn = get_container_arn()
    my_strategy = results[my_arn]
    final_json = {
        'MY_ARN': my_arn,
        'MY_STRATEGY': my_strategy,
        'ALL_TASKS': results
    }
    return final_json
