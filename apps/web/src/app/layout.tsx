import type { Metadata } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";
import Script from "next/script";
import { MobileMenuToggle } from "@/components/layout/MobileMenuToggle";
import { CopyButtons } from "@/components/docs/CopyButtons";
import { getServerConfig } from "@/lib/config/server-config";
import "./aphiria.css";
import "./prism.css";

// Cache layout for 1 hour (env vars don't change during runtime)
export const revalidate = 3600;

const roboto = Roboto({
    weight: ["300"],
    style: ["normal", "italic"],
    subsets: ["latin"],
    variable: "--font-roboto",
});

const robotoMono = Roboto_Mono({
    weight: ["400"],
    subsets: ["latin"],
    variable: "--font-roboto-mono",
});

export const metadata: Metadata = {
    title: "Aphiria",
    description: "A simple, extensible REST API framework for PHP",
    icons: {
        icon: [
            { url: "/images/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
            { url: "/images/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
            { url: "/images/favicon/favicon.ico" },
        ],
        apple: [
            { url: "/images/favicon/apple-touch-icon.png", sizes: "152x152", type: "image/png" },
        ],
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const config = getServerConfig();

    return (
        <html lang="en" className={`${roboto.variable} ${robotoMono.variable}`}>
            <head>
                <Script id="runtime-config" strategy="beforeInteractive">
                    {`window.__RUNTIME_CONFIG__ = ${JSON.stringify(config)};`}
                </Script>
            </head>
            <body>
                {children}
                <MobileMenuToggle />
                <CopyButtons />
            </body>
        </html>
    );
}
