import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLocalStorage } from "@/lib/theme/useLocalStorage";

describe("useLocalStorage", () => {
    let mockLocalStorage: Record<string, string> = {};

    beforeEach(() => {
        // Mock localStorage
        mockLocalStorage = {};
        global.Storage.prototype.getItem = vi.fn((key: string) => mockLocalStorage[key] ?? null);
        global.Storage.prototype.setItem = vi.fn((key: string, value: string) => {
            mockLocalStorage[key] = value;
        });
        global.Storage.prototype.removeItem = vi.fn((key: string) => {
            delete mockLocalStorage[key];
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("initialization", () => {
        it("returns defaultValue when localStorage is empty", () => {
            const { result } = renderHook(() =>
                useLocalStorage("test-key", {
                    defaultValue: "default",
                    validate: (value: unknown): value is string => typeof value === "string",
                })
            );

            expect(result.current[0]).toBe("default");
        });

        it("returns stored value when it exists and is valid", () => {
            mockLocalStorage["test-key"] = JSON.stringify("stored-value");

            const { result } = renderHook(() =>
                useLocalStorage("test-key", {
                    defaultValue: "default",
                    validate: (value: unknown): value is string => typeof value === "string",
                })
            );

            expect(result.current[0]).toBe("stored-value");
        });

        it("returns defaultValue when stored value fails validation", () => {
            mockLocalStorage["test-key"] = JSON.stringify(123); // Number, not string

            const { result } = renderHook(() =>
                useLocalStorage("test-key", {
                    defaultValue: "default",
                    validate: (value: unknown): value is string => typeof value === "string",
                })
            );

            expect(result.current[0]).toBe("default");
        });

        it("returns defaultValue when stored value is corrupted JSON", () => {
            mockLocalStorage["test-key"] = "{ invalid json";

            const { result } = renderHook(() =>
                useLocalStorage("test-key", {
                    defaultValue: "default",
                    validate: (value: unknown): value is string => typeof value === "string",
                })
            );

            expect(result.current[0]).toBe("default");
        });
    });

    describe("value updates", () => {
        it("updates stored value and localStorage", () => {
            const { result } = renderHook(() =>
                useLocalStorage("test-key", {
                    defaultValue: "initial",
                    validate: (value: unknown): value is string => typeof value === "string",
                })
            );

            act(() => {
                result.current[1]("new-value");
            });

            expect(result.current[0]).toBe("new-value");
            expect(mockLocalStorage["test-key"]).toBe(JSON.stringify("new-value"));
        });

        it("accepts functional update", () => {
            const { result } = renderHook(() =>
                useLocalStorage("test-key", {
                    defaultValue: 0,
                    validate: (value: unknown): value is number => typeof value === "number",
                })
            );

            act(() => {
                result.current[1]((prev) => prev + 1);
            });

            expect(result.current[0]).toBe(1);

            act(() => {
                result.current[1]((prev) => prev * 2);
            });

            expect(result.current[0]).toBe(2);
        });

        it("validates new values before storing", () => {
            const { result } = renderHook(() =>
                useLocalStorage("test-key", {
                    defaultValue: "valid",
                    validate: (value: unknown): value is string =>
                        typeof value === "string" && value.length > 0,
                })
            );

            // Valid update
            act(() => {
                result.current[1]("new-valid");
            });

            expect(result.current[0]).toBe("new-valid");

            // Invalid update should be rejected (empty string)
            act(() => {
                result.current[1]("" as string);
            });

            // Should keep previous valid value
            expect(result.current[0]).toBe("new-valid");
        });
    });

    describe("localStorage unavailable", () => {
        it("returns defaultValue when localStorage.getItem throws", () => {
            global.Storage.prototype.getItem = vi.fn(() => {
                throw new Error("localStorage unavailable");
            });

            const { result } = renderHook(() =>
                useLocalStorage("test-key", {
                    defaultValue: "fallback",
                    validate: (value: unknown): value is string => typeof value === "string",
                })
            );

            expect(result.current[0]).toBe("fallback");
        });

        it("still updates value in memory when localStorage.setItem throws", () => {
            global.Storage.prototype.setItem = vi.fn(() => {
                throw new Error("localStorage quota exceeded");
            });

            const { result } = renderHook(() =>
                useLocalStorage("test-key", {
                    defaultValue: "initial",
                    validate: (value: unknown): value is string => typeof value === "string",
                })
            );

            // Should not throw error
            expect(() => {
                act(() => {
                    result.current[1]("new-value");
                });
            }).not.toThrow();

            // Value should still update in memory
            expect(result.current[0]).toBe("new-value");
        });

        it("handles SecurityError gracefully (private mode)", () => {
            global.Storage.prototype.setItem = vi.fn(() => {
                const error = new Error("QuotaExceededError");
                error.name = "SecurityError";
                throw error;
            });

            const { result } = renderHook(() =>
                useLocalStorage("test-key", {
                    defaultValue: "initial",
                    validate: (value: unknown): value is string => typeof value === "string",
                })
            );

            act(() => {
                result.current[1]("new-value");
            });

            // Should update in memory even if storage fails
            expect(result.current[0]).toBe("new-value");
        });
    });

    describe("cross-tab synchronization", () => {
        it("updates value when storage event is triggered", () => {
            const { result } = renderHook(() =>
                useLocalStorage("test-key", {
                    defaultValue: "initial",
                    validate: (value: unknown): value is string => typeof value === "string",
                })
            );

            expect(result.current[0]).toBe("initial");

            // Simulate storage event from another tab
            act(() => {
                mockLocalStorage["test-key"] = JSON.stringify("from-another-tab");
                const storageEvent = new StorageEvent("storage", {
                    key: "test-key",
                    newValue: JSON.stringify("from-another-tab"),
                    storageArea: localStorage,
                });
                window.dispatchEvent(storageEvent);
            });

            expect(result.current[0]).toBe("from-another-tab");
        });

        it("ignores storage events for different keys", () => {
            const { result } = renderHook(() =>
                useLocalStorage("test-key", {
                    defaultValue: "initial",
                    validate: (value: unknown): value is string => typeof value === "string",
                })
            );

            const initialValue = result.current[0];

            // Simulate storage event for different key
            act(() => {
                const storageEvent = new StorageEvent("storage", {
                    key: "other-key",
                    newValue: JSON.stringify("other-value"),
                    storageArea: localStorage,
                });
                window.dispatchEvent(storageEvent);
            });

            // Value should not change
            expect(result.current[0]).toBe(initialValue);
        });

        it("validates values from storage events", () => {
            const { result } = renderHook(() =>
                useLocalStorage("test-key", {
                    defaultValue: "valid",
                    validate: (value: unknown): value is string =>
                        typeof value === "string" && value.length > 0,
                })
            );

            // Invalid value from storage event (empty string)
            act(() => {
                const storageEvent = new StorageEvent("storage", {
                    key: "test-key",
                    newValue: JSON.stringify(""),
                    storageArea: localStorage,
                });
                window.dispatchEvent(storageEvent);
            });

            // Should keep default value
            expect(result.current[0]).toBe("valid");
        });
    });

    describe("custom validation", () => {
        it("supports custom validation logic", () => {
            type Theme = "light" | "dark";

            const isValidTheme = (value: unknown): value is Theme => {
                return value === "light" || value === "dark";
            };

            const { result } = renderHook(() =>
                useLocalStorage<Theme>("theme", {
                    defaultValue: "light",
                    validate: isValidTheme,
                })
            );

            // Valid theme
            act(() => {
                result.current[1]("dark");
            });

            expect(result.current[0]).toBe("dark");

            // Invalid theme should be rejected
            act(() => {
                result.current[1]("invalid" as Theme);
            });

            // Should keep previous valid value
            expect(result.current[0]).toBe("dark");
        });

        it("supports complex object validation", () => {
            interface UserPrefs {
                theme: string;
                fontSize: number;
            }

            const isValidPrefs = (value: unknown): value is UserPrefs => {
                return (
                    typeof value === "object" &&
                    value !== null &&
                    "theme" in value &&
                    "fontSize" in value &&
                    typeof (value as UserPrefs).theme === "string" &&
                    typeof (value as UserPrefs).fontSize === "number"
                );
            };

            const defaultPrefs: UserPrefs = { theme: "light", fontSize: 16 };

            const { result } = renderHook(() =>
                useLocalStorage<UserPrefs>("prefs", {
                    defaultValue: defaultPrefs,
                    validate: isValidPrefs,
                })
            );

            // Valid object
            act(() => {
                result.current[1]({ theme: "dark", fontSize: 18 });
            });

            expect(result.current[0]).toEqual({ theme: "dark", fontSize: 18 });

            // Invalid object (missing fontSize)
            act(() => {
                result.current[1]({ theme: "light" } as UserPrefs);
            });

            // Should keep previous valid value
            expect(result.current[0]).toEqual({ theme: "dark", fontSize: 18 });
        });
    });
});
