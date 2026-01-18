import { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

interface DocsLayoutProps {
    children: ReactNode;
}

/**
 * Documentation layout with header and footer
 */
export default function DocsLayout({ children }: DocsLayoutProps) {
    return (
        <>
            <Header />
            <main>{children}</main>
            <Footer />
        </>
    );
}
