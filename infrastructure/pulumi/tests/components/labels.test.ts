import { describe, it, expect } from "@jest/globals";
import { buildLabels } from "../../src/components/labels";

describe("buildLabels", () => {
    it("should build standard labels with app and component", () => {
        const labels = buildLabels("api", "backend");

        expect(labels).toEqual({
            app: "api",
            "app.kubernetes.io/name": "api",
            "app.kubernetes.io/component": "backend",
        });
    });

    it("should merge custom labels", () => {
        const labels = buildLabels("web", "frontend", { tier: "frontend", env: "prod" });

        expect(labels).toEqual({
            app: "web",
            "app.kubernetes.io/name": "web",
            "app.kubernetes.io/component": "frontend",
            tier: "frontend",
            env: "prod",
        });
    });

    it("should handle empty custom labels", () => {
        const labels = buildLabels("db", "database", {});

        expect(labels).toEqual({
            app: "db",
            "app.kubernetes.io/name": "db",
            "app.kubernetes.io/component": "database",
        });
    });

    it("should handle undefined custom labels", () => {
        const labels = buildLabels("db-migration", "database", undefined);

        expect(labels).toEqual({
            app: "db-migration",
            "app.kubernetes.io/name": "db-migration",
            "app.kubernetes.io/component": "database",
        });
    });

    it("should allow custom labels to override standard labels", () => {
        const labels = buildLabels("api", "backend", { app: "custom-api" });

        expect(labels).toEqual({
            app: "custom-api",
            "app.kubernetes.io/name": "api",
            "app.kubernetes.io/component": "backend",
        });
    });
});
