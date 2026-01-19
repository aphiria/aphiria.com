"use client";

import { useEffect, useRef, useState } from "react";

interface SearchResult {
    htmlElementType: string;
    highlightedInnerText: string;
    link: string;
    highlightedH1: string | null;
    highlightedH2: string | null;
    highlightedH3: string | null;
    highlightedH4: string | null;
    highlightedH5: string | null;
}

/**
 * Documentation search with debouncing and keyboard navigation
 */
export function DocSearch() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [visible, setVisible] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(false);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLUListElement>(null);

    // Debounced search
    useEffect(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        if (query.length === 0) {
            setVisible(false);
            return;
        }

        debounceTimerRef.current = setTimeout(() => {
            performSearch(query);
        }, 250);

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [query]);

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (
                inputRef.current &&
                resultsRef.current &&
                !inputRef.current.contains(e.target as Node) &&
                !resultsRef.current.contains(e.target as Node)
            ) {
                setVisible(false);
            }
        }

        if (visible) {
            document.addEventListener("click", handleClickOutside);
            return () => document.removeEventListener("click", handleClickOutside);
        }
        return undefined;
    }, [visible]);

    // Keyboard navigation
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (!visible || results.length === 0 || error) {
                return;
            }

            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % results.length);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (selectedIndex >= 0) {
                    window.location.href = results[selectedIndex].link;
                } else if (results.length > 0) {
                    window.location.href = results[0].link;
                }
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [visible, results, selectedIndex, error]);

    // Focus input on mount (if no hash)
    useEffect(() => {
        if (!window.location.hash && inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    async function performSearch(searchQuery: string) {
        setError(false);
        setLoading(true);
        try {
            const apiUri = process.env.NEXT_PUBLIC_API_URI || "http://localhost:8080";
            const response = await fetch(
                `${apiUri}/docs/search?query=${encodeURIComponent(searchQuery)}&version=1.x`,
                { credentials: "include" }
            );
            const data: SearchResult[] = await response.json();
            setResults(data);
            setVisible(true);
            setSelectedIndex(-1);
        } catch (err) {
            console.error("Failed to fetch search results:", err);
            setError(true);
            setResults([]);
            setVisible(true);
        } finally {
            setLoading(false);
        }
    }

    function buildResultContext(result: SearchResult): string {
        if (result.htmlElementType === "h1") {
            return "";
        }

        const headers = ["h1", "h2", "h3", "h4", "h5"];
        const contextParts: string[] = [];

        for (const level of headers) {
            const highlightedKey = `highlighted${level.toUpperCase()}` as keyof SearchResult;
            const shouldShow = result.htmlElementType !== level && result[highlightedKey] !== null;

            if (shouldShow) {
                contextParts.push(`<${level}>${result[highlightedKey]}</${level}>`);
            }
        }

        if (contextParts.length === 0) {
            return "";
        }

        return `<span class="search-result-context">${contextParts.join(" > ")}</span>`;
    }

    return (
        <div className="doc-search">
            <input
                ref={inputRef}
                type="text"
                id="search-query"
                placeholder="Search docs"
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => {
                    if (query.length > 0 && (results.length > 0 || error)) {
                        setVisible(true);
                    }
                }}
            />
            <ul
                ref={resultsRef}
                className="search-results"
                style={{ display: visible ? "block" : "none" }}
            >
                {error ? (
                    <li className="no-results">There was an error</li>
                ) : results.length === 0 && !loading ? (
                    <li className="no-results">No results for &quot;{query}&quot;</li>
                ) : (
                    results.map((result, index) => (
                        <li key={index} className={index === selectedIndex ? "selected" : ""}>
                            <a href={result.link} title="View this result">
                                <div
                                    dangerouslySetInnerHTML={{
                                        __html: buildResultContext(result),
                                    }}
                                />
                                <div
                                    dangerouslySetInnerHTML={{
                                        __html: `<${result.htmlElementType} class="search-result-text">${result.highlightedInnerText}</${result.htmlElementType}>`,
                                    }}
                                />
                            </a>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
}
