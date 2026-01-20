import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { Environment } from "../../types/environment";

/**
 * Arguments for Helm chart component
 */
export interface HelmChartArgs {
    /** Environment this chart targets */
    env: Environment;
    /** Chart name */
    chartName: string;
    /** Chart repository URL or OCI registry */
    repository: string;
    /** Chart version */
    version: string;
    /** Kubernetes namespace */
    namespace: pulumi.Input<string>;
    /** Helm values */
    values?: Record<string, unknown>;
    /** Kubernetes provider */
    provider: k8s.Provider;
}
