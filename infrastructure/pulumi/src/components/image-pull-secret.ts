import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

/**
 * Arguments for creating an image pull secret
 */
export interface ImagePullSecretArgs {
    name: string;
    namespace: pulumi.Input<string>;
    registry: string;
    username: pulumi.Input<string>;
    token: pulumi.Input<string>;
    provider?: k8s.Provider;
}

/**
 * Result of creating an image pull secret
 */
export interface ImagePullSecretResult {
    secret: k8s.core.v1.Secret;
}

/**
 * Creates a Kubernetes image pull secret for pulling private container images
 *
 * @param args - Image pull secret configuration
 * @returns Image pull secret resources
 */
export function createImagePullSecret(args: ImagePullSecretArgs): ImagePullSecretResult {
    const secret = new k8s.core.v1.Secret(
        args.name,
        {
            metadata: {
                name: args.name,
                namespace: args.namespace,
            },
            type: "kubernetes.io/dockerconfigjson",
            stringData: {
                ".dockerconfigjson": pulumi.interpolate`{"auths":{"${args.registry}":{"username":"${args.username}","password":"${args.token}"}}}`,
            },
        },
        { provider: args.provider }
    );

    return {
        secret,
    };
}
