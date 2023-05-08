import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as rabbitmq from "@pulumi/rabbitmq";

const rabbitmqSvc = "rabbitmqsvc";

const config = new pulumi.Config();
const port = config.requireNumber('port');
const secretName = config.require('secretName');

const creds = k8s.core.v1.Secret.get('rabbitmq-user-creds', `default/${secretName}`);

const user = creds.data['user'].apply(x => Buffer.from(x, 'base64').toString('ascii'))
const pass = creds.data['password'].apply(x => Buffer.from(x, 'base64').toString('ascii'))

const provider = new rabbitmq.Provider('local-rabbitmq', {
    endpoint: `http://${rabbitmqSvc}:${port}`,
    username: user,
    password: pass,
});

const exchange = new rabbitmq.Exchange('foo', {
    settings: {
        type: "fanout",
    },
}, { provider });

export const providerURN = provider.urn;