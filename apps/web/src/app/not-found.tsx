import type { Metadata } from "next";
import Link from "next/link";
import { SimpleLayout } from "@/components/layout/SimpleLayout";
import { Sidebar } from "@/components/layout/Sidebar";
import { MainNavLinks } from "@/components/layout/MainNavLinks";

export const metadata: Metadata = {
    title: "404 - Page Not Found | Aphiria",
    description: "The page you are looking for could not be found.",
};

export default function NotFound() {
    return (
        <SimpleLayout>
            <Sidebar id="sidebar-main-nav">
                <ul>
                    <MainNavLinks />
                </ul>
            </Sidebar>
            <div className="error-404">
                <h1>404</h1>
                <p>The page you are looking for could not be found.</p>
                <Link href="/docs" className="button" title="Go back to documentation">
                    Back to Documentation
                </Link>
            </div>
        </SimpleLayout>
    );
}
