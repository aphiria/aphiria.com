import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function DocsLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            <script
                dangerouslySetInnerHTML={{
                    __html: `document.body.className = 'docs language-php';`,
                }}
            />
            <Header />
            <main>{children}</main>
            <Footer />
        </>
    );
}
