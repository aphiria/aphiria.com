import { describe, it, expect, beforeAll } from "vitest";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createImagePullSecret } from "../../src/components/image-pull-secret";
import { promiseOf } from "../test-utils";

describe("createImagePullSecret", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
        k8sProvider = new k8s.Provider("test", {});
    });

    it("should create secret with correct type", async () => {
        const result = createImagePullSecret({
            name: "test-pull-secret",
            namespace: "test-namespace",
            registry: "ghcr.io",
            username: pulumi.output("test-user"),
            token: pulumi.output("test-token"),
            provider: k8sProvider,
        });

        expect(result.secret).toBeDefined();

        const type = await promiseOf(result.secret.type);
        expect(type).toBe("kubernetes.io/dockerconfigjson");
    });

    it("should set correct metadata", async () => {
        const result = createImagePullSecret({
            name: "ghcr-pull-secret",
            namespace: "my-namespace",
            registry: "ghcr.io",
            username: pulumi.output("user"),
            token: pulumi.output("token"),
            provider: k8sProvider,
        });

        const [name, namespace] = await Promise.all([
            promiseOf(result.secret.metadata.name),
            promiseOf(result.secret.metadata.namespace),
        ]);

        expect(name).toBe("ghcr-pull-secret");
        expect(namespace).toBe("my-namespace");
    });

    it("should generate correct dockerconfigjson format", async () => {
        const result = createImagePullSecret({
            name: "test-secret",
            namespace: "default",
            registry: "ghcr.io",
            username: pulumi.output("myuser"),
            token: pulumi.output("mytoken"),
            provider: k8sProvider,
        });

        const stringData = await promiseOf(result.secret.stringData);
        expect(stringData).toBeDefined();
        expect(stringData![".dockerconfigjson"]).toBe(
            '{"auths":{"ghcr.io":{"username":"myuser","password":"mytoken"}}}'
        );
    });

    it("should handle different registries correctly", async () => {
        const result = createImagePullSecret({
            name: "docker-hub-secret",
            namespace: "default",
            registry: "docker.io",
            username: pulumi.output("dockeruser"),
            token: pulumi.output("dockertoken"),
            provider: k8sProvider,
        });

        const stringData = await promiseOf(result.secret.stringData);
        expect(stringData![".dockerconfigjson"]).toBe(
            '{"auths":{"docker.io":{"username":"dockeruser","password":"dockertoken"}}}'
        );
    });

    it("should handle pulumi output values for username and token", async () => {
        const username = pulumi.output("computed-user");
        const token = pulumi.output("computed-token");

        const result = createImagePullSecret({
            name: "computed-secret",
            namespace: "default",
            registry: "registry.example.com",
            username,
            token,
            provider: k8sProvider,
        });

        const stringData = await promiseOf(result.secret.stringData);
        expect(stringData![".dockerconfigjson"]).toBe(
            '{"auths":{"registry.example.com":{"username":"computed-user","password":"computed-token"}}}'
        );
    });

    it("should create secret in specified namespace with pulumi output", async () => {
        const namespaceName = pulumi.output("dynamic-namespace");

        const result = createImagePullSecret({
            name: "test-secret",
            namespace: namespaceName,
            registry: "ghcr.io",
            username: pulumi.output("user"),
            token: pulumi.output("token"),
            provider: k8sProvider,
        });

        const namespace = await promiseOf(result.secret.metadata.namespace);
        expect(namespace).toBe("dynamic-namespace");
    });
});
