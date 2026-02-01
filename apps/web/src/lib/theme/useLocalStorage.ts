"use client";

import { useState, useEffect, useCallback } from "react";
import type { UseLocalStorageReturn, UseLocalStorageOptions } from "@/types/theme";

/**
 * Custom hook for persisting state in localStorage with validation and error handling
 *
 * @template T - Type of the stored value
 * @param key - localStorage key
 * @param options - Configuration options
 * @returns Tuple of [value, setValue] similar to useState
 *
 * @example
 * ```tsx
 * const [theme, setTheme] = useLocalStorage("theme-preference", {
 *   defaultValue: "light",
 *   validate: isValidTheme,
 * });
 * ```
 */
export function useLocalStorage<T>(
    key: string,
    options: UseLocalStorageOptions<T>
): UseLocalStorageReturn<T> {
    const {
        defaultValue,
        serialize = JSON.stringify,
        deserialize = JSON.parse,
        validate,
    } = options;

    // Initialize state with value from localStorage or default
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === "undefined") {
            return defaultValue;
        }

        try {
            const item = window.localStorage.getItem(key);
            if (item === null) {
                return defaultValue;
            }

            const parsed = deserialize(item);

            // Validate if validator provided
            if (validate && !validate(parsed)) {
                if (process.env.NODE_ENV !== "production") {
                    console.warn(
                        `Invalid value in localStorage for key "${key}". Using default value.`
                    );
                }
                return defaultValue;
            }

            return parsed;
        } catch (error) {
            if (process.env.NODE_ENV !== "production") {
                console.warn(`Error reading localStorage key "${key}":`, error);
            }
            return defaultValue;
        }
    });

    // Update localStorage when state changes
    const setValue = useCallback(
        (value: T | ((prev: T) => T)) => {
            try {
                // Allow value to be a function (like useState)
                const valueToStore = value instanceof Function ? value(storedValue) : value;

                // Validate if validator provided
                if (validate && !validate(valueToStore)) {
                    if (process.env.NODE_ENV !== "production") {
                        console.warn(
                            `Invalid value provided to setValue for key "${key}". Update rejected.`
                        );
                    }
                    return;
                }

                setStoredValue(valueToStore);

                if (typeof window !== "undefined") {
                    window.localStorage.setItem(key, serialize(valueToStore));
                }
            } catch (error) {
                if (process.env.NODE_ENV !== "production") {
                    console.warn(`Error setting localStorage key "${key}":`, error);
                }
            }
        },
        [key, serialize, storedValue, validate]
    );

    // Listen for changes to localStorage in other tabs/windows
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === key && e.newValue !== null) {
                try {
                    const newValue = deserialize(e.newValue);

                    // Validate if validator provided
                    if (validate && !validate(newValue)) {
                        return;
                    }

                    setStoredValue(newValue);
                } catch (error) {
                    if (process.env.NODE_ENV !== "production") {
                        console.warn(`Error parsing storage event for key "${key}":`, error);
                    }
                }
            }
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, [key, deserialize, validate]);

    return [storedValue, setValue];
}
