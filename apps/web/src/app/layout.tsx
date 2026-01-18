import type { Metadata } from "next";
import "./aphiria.css";
import "./prism.css";

export const metadata: Metadata = {
    title: "Aphiria",
    description: "A simple, extensible REST API framework for PHP",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
