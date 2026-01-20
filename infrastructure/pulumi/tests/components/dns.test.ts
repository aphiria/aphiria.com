import { describe, it, expect } from "vitest";
import * as pulumi from "@pulumi/pulumi";
import { createDNSRecords } from "../../src/components/dns";

describe("createDNSRecords", () => {
    it("should create DNS records with default TTL", () => {
        const result = createDNSRecords({
            domain: "aphiria.com",
            loadBalancerIp: pulumi.output("144.126.249.83"),
            records: [
                { name: "@", resourceName: "production-root-dns" },
                { name: "www", resourceName: "production-www-dns" },
                { name: "api", resourceName: "production-api-dns" },
            ],
        });

        expect(result.records).toBeDefined();
        expect(result.records.length).toBe(3);
    });

    it("should create DNS records with custom TTL", () => {
        const result = createDNSRecords({
            domain: "aphiria.com",
            loadBalancerIp: pulumi.output("144.126.249.83"),
            records: [
                { name: "*.pr", resourceName: "preview-web-dns" },
                { name: "*.pr-api", resourceName: "preview-api-dns" },
            ],
            ttl: 600,
        });

        expect(result.records).toBeDefined();
        expect(result.records.length).toBe(2);
    });

    it("should create wildcard DNS records", () => {
        const result = createDNSRecords({
            domain: "aphiria.com",
            loadBalancerIp: pulumi.output("144.126.249.83"),
            records: [{ name: "*.pr", resourceName: "preview-wildcard-dns" }],
        });

        expect(result.records).toBeDefined();
        expect(result.records.length).toBe(1);
    });

    it("should handle empty records array", () => {
        const result = createDNSRecords({
            domain: "aphiria.com",
            loadBalancerIp: pulumi.output("144.126.249.83"),
            records: [],
        });

        expect(result.records).toBeDefined();
        expect(result.records.length).toBe(0);
    });

    it("should create multiple production domain records", () => {
        const result = createDNSRecords({
            domain: "example.com",
            loadBalancerIp: pulumi.output("192.0.2.1"),
            records: [
                { name: "@", resourceName: "root-dns" },
                { name: "www", resourceName: "www-dns" },
                { name: "api", resourceName: "api-dns" },
                { name: "admin", resourceName: "admin-dns" },
            ],
            ttl: 300,
        });

        expect(result.records).toBeDefined();
        expect(result.records.length).toBe(4);
    });
});
