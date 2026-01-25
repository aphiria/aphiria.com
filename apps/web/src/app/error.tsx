"use client";

import Link from "next/link";
import { SimpleLayout } from "@/components/layout/SimpleLayout";
import { Sidebar } from "@/components/layout/Sidebar";
import { MainNavLinks } from "@/components/layout/MainNavLinks";
import { getRuntimeConfig } from "@/lib/runtime-config";

/**
 * Error boundary for catching and displaying runtime errors
 *
 * This component catches errors that occur during rendering, in event handlers,
 * and in lifecycles. It provides a user-friendly error page similar to the 404 page.
 */
export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const config = getRuntimeConfig();
    // Show errors in development OR non-production environments (local, preview)
    const showErrorDetails = config.appEnv !== "production";

    return (
        <SimpleLayout>
            <Sidebar id="sidebar-main-nav">
                <ul>
                    <MainNavLinks />
                </ul>
            </Sidebar>
            <div className="error-page">
                <h1>500</h1>
                <p>An error occurred while loading this page.</p>
                {showErrorDetails && (
                    <details className="error-details">
                        <summary>Error details ({config.appEnv})</summary>
                        <pre>{error.message}</pre>
                        {error.digest && <p>Digest: {error.digest}</p>}
                    </details>
                )}
                <div className="error-actions">
                    <button onClick={reset} className="button" title="Try again">
                        Try Again
                    </button>
                    <Link href="/docs" className="button" title="Go back to documentation">
                        Back to Documentation
                    </Link>
                </div>
            </div>
        </SimpleLayout>
    );
}
