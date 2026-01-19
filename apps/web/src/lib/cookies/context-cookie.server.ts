import { cookies } from "next/headers";
import { Context } from "@/types/context";

const COOKIE_NAME = "context";

/**
 * Get the current context from cookie (server-side only)
 *
 * @returns Context value or null if not set
 */
export async function getContextCookie(): Promise<Context | null> {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(COOKIE_NAME);
    const value = cookie?.value;

    if (value === "framework" || value === "library") {
        return value;
    }

    return null;
}
