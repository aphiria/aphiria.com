import { ReactNode } from "react";

interface SidebarProps {
    children: ReactNode;
    id?: string;
}

/**
 * Sidebar component for mobile navigation
 * Used on homepage (with main nav links) and docs pages (with doc nav)
 */
export function Sidebar({ children, id }: SidebarProps) {
    return (
        <nav className="side-nav" id={id}>
            {children}
        </nav>
    );
}
