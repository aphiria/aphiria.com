import { describe, it, expect } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import middleware from "../middleware";

describe("middleware", () => {
    describe("/docs redirect", () => {
        it("redirects /docs to /docs/1.x/introduction with 302", () => {
            const request = new NextRequest(new URL("http://localhost/docs"));

            const response = middleware(request);

            expect(response).toBeInstanceOf(NextResponse);
            expect(response.status).toBe(302);
            expect(response.headers.get("location")).toBe("http://localhost/docs/1.x/introduction");
        });

        it("redirects /docs with query params (query params not preserved)", () => {
            const request = new NextRequest(new URL("http://localhost/docs?context=library"));

            const response = middleware(request);

            expect(response.status).toBe(302);
            // Note: NextResponse.redirect doesn't preserve query params from source URL
            expect(response.headers.get("location")).toBe("http://localhost/docs/1.x/introduction");
        });
    });

    describe(".html redirect", () => {
        it("redirects .html URLs to extension-less with 301", () => {
            const request = new NextRequest(new URL("http://localhost/docs/1.x/routing.html"));

            const response = middleware(request);

            expect(response).toBeInstanceOf(NextResponse);
            expect(response.status).toBe(301);
            expect(response.headers.get("location")).toBe("http://localhost/docs/1.x/routing");
        });

        it("preserves query params when removing .html", () => {
            const request = new NextRequest(
                new URL("http://localhost/docs/1.x/routing.html?context=framework")
            );

            const response = middleware(request);

            expect(response.status).toBe(301);
            expect(response.headers.get("location")).toBe(
                "http://localhost/docs/1.x/routing?context=framework"
            );
        });

        it("preserves anchor when removing .html", () => {
            const request = new NextRequest(
                new URL("http://localhost/docs/1.x/routing.html#basic-routing")
            );

            const response = middleware(request);

            expect(response.status).toBe(301);
            expect(response.headers.get("location")).toBe(
                "http://localhost/docs/1.x/routing#basic-routing"
            );
        });

        it("preserves query and anchor when removing .html", () => {
            const request = new NextRequest(
                new URL("http://localhost/docs/1.x/routing.html?context=library#basic-routing")
            );

            const response = middleware(request);

            expect(response.status).toBe(301);
            expect(response.headers.get("location")).toBe(
                "http://localhost/docs/1.x/routing?context=library#basic-routing"
            );
        });
    });

    describe("context param injection", () => {
        it("redirects /docs/* URLs without context param to add ?context=framework by default", () => {
            const request = new NextRequest(new URL("http://localhost/docs/1.x/introduction"));

            const response = middleware(request);

            expect(response).toBeInstanceOf(NextResponse);
            expect(response.status).toBe(307);
            expect(response.headers.get("location")).toBe(
                "http://localhost/docs/1.x/introduction?context=framework"
            );
        });

        it("redirects /docs/* URLs without context param to add ?context=library when cookie is library", () => {
            const request = new NextRequest(new URL("http://localhost/docs/1.x/routing"));
            request.cookies.set("context", "library");

            const response = middleware(request);

            expect(response.status).toBe(307);
            expect(response.headers.get("location")).toBe(
                "http://localhost/docs/1.x/routing?context=library"
            );
        });

        it("allows /docs/* URLs with context param to pass through", () => {
            const request = new NextRequest(
                new URL("http://localhost/docs/1.x/introduction?context=framework")
            );

            const response = middleware(request);

            expect(response.status).toBe(200);
        });

        it("preserves existing query params when adding context", () => {
            const request = new NextRequest(
                new URL("http://localhost/docs/1.x/routing?foo=bar#anchor")
            );

            const response = middleware(request);

            expect(response.status).toBe(307);
            expect(response.headers.get("location")).toBe(
                "http://localhost/docs/1.x/routing?foo=bar&context=framework#anchor"
            );
        });
    });

    describe("pass-through", () => {
        it("allows root path to pass through", () => {
            const request = new NextRequest(new URL("http://localhost/"));

            const response = middleware(request);

            expect(response.status).toBe(200);
        });

        it("allows non-docs URLs to pass through", () => {
            const request = new NextRequest(new URL("http://localhost/about"));

            const response = middleware(request);

            expect(response.status).toBe(200);
        });
    });
});
