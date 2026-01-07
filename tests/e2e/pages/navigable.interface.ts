/**
 * Interface for page objects that support navigation
 */
export interface Navigable {
    goto(path?: string): Promise<void>;
}
