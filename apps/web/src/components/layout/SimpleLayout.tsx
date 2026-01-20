import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

interface SimpleLayoutProps {
    children: React.ReactNode;
}

/**
 * Simple layout for pages without sidebars (homepage, 404)
 */
export function SimpleLayout({ children }: SimpleLayoutProps) {
    return (
        <>
            <Header />
            <main className="home">
                {children}
                <div id="gray-out"></div>
            </main>
            <Footer />
        </>
    );
}
