import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as random from "@pulumi/random";

const config = new pulumi.Config();
const secretKey = config.require('password');
const secretName = config.require('secretName');
const port = config.requireNumber('port');

const accessKey = new random.RandomString("rabbitmq-user", {
    length: 8,
    special: false,
});

const creds = new k8s.core.v1.Secret('rabbitmq-creds', {
    metadata: {
        name: secretName,
    },
    stringData: {
        user: accessKey.result,
        password: secretKey,
    },
});

const appLabels = { app: "rabbitmq" };

// Deploy a rabbitmq pod with a single container.
const deployment = new k8s.apps.v1.Deployment("rabbitmq", {
    metadata: { labels: appLabels },
    spec: {
        selector: {
            matchLabels: appLabels,
        },
        replicas: 1,
        template: {
            metadata: { labels: appLabels },
            spec: {
                containers: [
                    {
                        image: "rabbitmq:3-management",
                        name: "rabbitmq",
                        ports: [
                            { containerPort: 15672 },
                        ],
                        env: [
                            {
                                name: "RABBITMQ_DEFAULT_USER",
                                valueFrom: {
                                    secretKeyRef: {
                                        name: secretName,
                                        key: "user",
                                    },
                                },
                            },
                            {
                                name: "RABBITMQ_DEFAULT_PASS",
                                value: secretKey, // Do not get from secret, so that Deployment is recreated on password change.
                            },
                        ]
                    },
                ],
            },
        },
    },
})

// Expose the rabbitmq deployment using a Kubernetes Service.
const service = new k8s.core.v1.Service("rabbitmq", {
    metadata: {
        name: "rabbitmqsvc",
        labels: appLabels,
    },
    spec: {
        type: "ClusterIP",
        ports: [{
            port: port,
            targetPort: 15672,
        }],
        selector: appLabels,
    },
});


exports.deploymentName = deployment.metadata.name;
exports.serviceName = service.metadata.name;
