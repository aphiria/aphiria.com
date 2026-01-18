/**
 * Documentation context (framework vs library mode)
 */
export type Context = "framework" | "library";

/**
 * Context state for switching between framework and library modes
 */
export interface ContextState {
    /** Current context selection */
    current: Context;

    /** Update the context */
    setContext: (context: Context) => void;
}
