import core = require('@aws-cdk/core')
import ec2 = require('@aws-cdk/aws-ec2')
import ecs = require('@aws-cdk/aws-ecs')

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
    }
}

const appStack = new BaseStack(app, appName, {
    env: {region: 'ap-northeast-1'},
})

app.synth()
