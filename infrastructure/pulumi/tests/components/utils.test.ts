import { describe, it, expect } from "vitest";
import * as pulumi from "@pulumi/pulumi";
import { checksum } from "../../src/components/utils";

describe("checksum", () => {
    it("should generate consistent SHA256 hash for same data", () => {
        const data = {
            DB_HOST: "localhost",
            DB_PORT: "5432",
            APP_ENV: "test",
        };

        const hash1 = checksum(data);
        const hash2 = checksum(data);

        expect(hash1).toBe(hash2);
        expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should generate different hashes for different data", () => {
        const data1 = { DB_HOST: "localhost", DB_PORT: "5432" };
        const data2 = { DB_HOST: "localhost", DB_PORT: "5433" };

        const hash1 = checksum(data1);
        const hash2 = checksum(data2);

        expect(hash1).not.toBe(hash2);
    });

    it("should generate same hash regardless of key order", () => {
        const data1 = { A: "1", B: "2", C: "3" };
        const data2 = { C: "3", A: "1", B: "2" };

        const hash1 = checksum(data1);
        const hash2 = checksum(data2);

        expect(hash1).toBe(hash2);
    });

    it("should handle empty object", () => {
        const data = {};
        const hash = checksum(data);

        expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should handle pulumi.Output values", () => {
        const data = {
            DB_HOST: pulumi.output("localhost"),
            DB_PORT: "5432",
        };

        const hash = checksum(data);

        expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should handle special characters in values", () => {
        const data = {
            PASSWORD: "p@ssw0rd!#$%",
            URL: "https://example.com/path?query=1&foo=bar",
        };

        const hash = checksum(data);

        expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should be deterministic across multiple calls", () => {
        const data = { KEY1: "value1", KEY2: "value2", KEY3: "value3" };
        const hashes = Array.from({ length: 10 }, () => checksum(data));

        expect(new Set(hashes).size).toBe(1);
    });
});
