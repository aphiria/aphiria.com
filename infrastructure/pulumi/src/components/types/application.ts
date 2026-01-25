import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

/**
 * Return type for web deployment component
 */
export interface WebDeploymentResult {
    deployment: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    service: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    configMap: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    podDisruptionBudget?: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
}

/**
 * Return type for API deployment component
 */
export interface APIDeploymentResult {
    deployment: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    service: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    secret: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    podDisruptionBudget?: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
}
