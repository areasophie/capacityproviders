import core = require('@aws-cdk/core')
import iam = require('@aws-cdk/aws-iam')
import ec2 = require('@aws-cdk/aws-ec2')
import ecr = require('@aws-cdk/aws-ecr')
import ecs = require('@aws-cdk/aws-ecs')
import ecs_patterns = require('@aws-cdk/aws-ecs-patterns')

const app = new core.App()

const appName = app.node.tryGetContext("app_name")

class BaseStack extends core.Stack {
    vpc: ec2.Vpc
    cluster: ecs.Cluster
    
    constructor(scope: core.App, id: string, props: core.StackProps = {}) {
        super(scope, id, props)

        const clusterName = id

        this.vpc = new ec2.Vpc(this, 'base', {
            cidr: '10.6.0.0/16',
            natGateways: 1
        })

        this.cluster = new ecs.Cluster(this, 'cluster', {
            vpc: this.vpc,
            clusterName: clusterName
        })
        const ondemandASG = this.cluster.addCapacity('ondemand', {
            instanceType: new ec2.InstanceType("t3.medium"),
            minCapacity: 0,
            maxCapacity: 5,
        })
        const spotASG = this.cluster.addCapacity('spot', {
            instanceType: new ec2.InstanceType("t3.large"),
            minCapacity: 0,
            maxCapacity: 5,
            spotPrice: '0.1'
        })

        new core.CfnOutput(this, "ondemand-asg-name", {
            value: ondemandASG.autoScalingGroupName,
            exportName: "ondemand-asg-name"
        })

        new core.CfnOutput(this, "spot-asg-name", {
            value: spotASG.autoScalingGroupName,
            exportName: "spot-asg-name"
        })
    }
}

class ServiceStack extends core.Stack {
    base: BaseStack
    
    constructor(scope: core.App, id: string, base: BaseStack, props: core.StackProps = {}) {
        super(scope, id, props)
        this.base = base

        const taskImage: ecs_patterns.ApplicationLoadBalancedTaskImageOptions = {
            image: ecs.ContainerImage.fromRegistry('quay.io/areasophie/capacityproviders'),
            containerPort: 5000,
            environment: {
                AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION || 'ap-northeast-1',
                ECS_CLUSTER_NAME: 'sophie-capacityproviders'
            }
        }

        const loadBalancedService = new ecs_patterns.ApplicationLoadBalancedEc2Service(this, "ec2-demo-service", {
            serviceName: 'ec2-demo-service',
            cluster: this.base.cluster,
            cpu: 256,
            memoryLimitMiB: 512,
            desiredCount: 4,
            publicLoadBalancer: true,
            taskImageOptions: taskImage,
        })

        // This should work, but the default child is not the service cfn, it's a list of cfn service and sec group
        // self.cfn_resource = self.load_balanced_service.service.node.default_child
        const cfnResource = loadBalancedService.service.node.children[0] as ecs.CfnService
        
        cfnResource.addDeletionOverride("Properties.LaunchType")
         
        loadBalancedService.taskDefinition.addToTaskRolePolicy(
            new iam.PolicyStatement({
                actions: [
                    'ecs:ListTasks',
                    'ecs:DescribeTasks'
                ],
                resources: ['*']
            })
        )
    }
}

const baseStack = new BaseStack(app, appName, {
    env: {
        region: process.env.AWS_DEFAULT_REGION || 'ap-northeast-1'
    },
})

const serviceStack = new ServiceStack(app, `${appName}-service`, baseStack, {
    env: {
        region: process.env.AWS_DEFAULT_REGION || 'ap-northeast-1'
    },
})

app.synth()
