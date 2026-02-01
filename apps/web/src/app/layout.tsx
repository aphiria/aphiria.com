import type { Metadata } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";
import Script from "next/script";
import { MobileMenuToggle } from "@/components/layout/MobileMenuToggle";
import { CopyButtons } from "@/components/docs/CopyButtons";
import { getServerConfig } from "@/lib/config/server-config";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { resolveTheme } from "@/lib/cookies/theme-cookie.server";
import "./globals.css";
import "./aphiria.css";
import "./prism.css";

// Force dynamic rendering to ensure runtime environment variables are read on each request
// This is necessary because env vars (API_URI, COOKIE_DOMAIN) are injected by Kubernetes at runtime
export const dynamic = "force-dynamic";

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

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const config = getServerConfig();
    const theme = await resolveTheme();

    return (
        <html lang="en" className={`${roboto.variable} ${robotoMono.variable}`} data-theme={theme}>
            <head>
                <Script id="runtime-config" strategy="beforeInteractive">
                    {`window.__RUNTIME_CONFIG__ = ${JSON.stringify(config)};`}
                </Script>
            </head>
            <body>
                <ThemeProvider defaultTheme={theme}>
                    {children}
                    <MobileMenuToggle />
                    <CopyButtons />
                </ThemeProvider>
            </body>
        </html>
    );
}
