import config from '/js/config/config.js';

/**
 * Mobile navigation menu controller
 */
class MobileMenu {
    constructor() {
        this.body = document.body;
    }

    toggle() {
        this.body.classList.toggle('nav-open');
    }

    close() {
        this.body.classList.remove('nav-open');
    }
}

/**
 * Documentation search with debouncing and keyboard navigation
 */
class DocSearch {
    constructor(inputElement, resultsElement, debounceMs = 250) {
        this.input = inputElement;
        this.results = resultsElement;
        this.debounceMs = debounceMs;
        this.previousQuery = null;
        this.debounceTimer = null;
        this.resultsVisible = false;
        this.clickOutsideHandler = this.handleClickOutside.bind(this);

        this.attachEventListeners();
    }

    get currentQuery() {
        return this.input.value.trim();
    }

    attachEventListeners() {
        this.input.addEventListener('keyup', () => this.handleInput());
        this.input.addEventListener('focus', () => this.handleFocus());
        window.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e));
    }

    handleInput() {
        clearTimeout(this.debounceTimer);

        const query = this.currentQuery;

        if (query.length === 0) {
            this.hide();
            return;
        }

        if (query === this.previousQuery) {
            return;
        }

        this.debounceTimer = setTimeout(() => this.performSearch(query), this.debounceMs);
    }

    handleFocus() {
        const query = this.currentQuery;

        // Re-fetch results if there's a query but results are hidden
        if (query.length > 0 && !this.resultsVisible) {
            this.performSearch(query);
        }
    }

    handleClickOutside(event) {
        if (!this.input.contains(event.target) && !this.results.contains(event.target)) {
            this.hide();
        }
    }

    handleKeyboardNavigation(event) {
        if (!this.isVisible() || this.hasNoResults()) {
            return;
        }

        const { key } = event;

        if (key === 'ArrowUp') {
            this.navigateUp();
        } else if (key === 'ArrowDown') {
            this.navigateDown();
        } else if (key === 'Enter') {
            this.selectResult();
        }
    }

    async performSearch(query) {
        this.previousQuery = query;

        try {
            const response = await fetch(
                `${config.apiUri}/docs/search?query=${encodeURIComponent(query)}&version=1.x`,
                { credentials: 'include' }
            );
            const searchResults = await response.json();
            this.displayResults(searchResults, query);
        } catch (error) {
            console.error('Failed to fetch search results:', error);
        }
    }

    displayResults(searchResults, query) {
        if (searchResults.length === 0) {
            this.results.innerHTML = `<li class="no-results">No results for "${query}"</li>`;
        } else {
            this.results.innerHTML = searchResults.map(result => this.formatSearchResult(result)).join('');
        }

        this.show();
    }

    show() {
        this.results.style.display = 'block';
        this.resultsVisible = true;
        document.addEventListener('click', this.clickOutsideHandler);
    }

    hide() {
        this.results.style.display = 'none';
        this.resultsVisible = false;
        document.removeEventListener('click', this.clickOutsideHandler);
    }

    navigateUp() {
        const current = this.results.querySelector('li.selected');

        if (current) {
            current.classList.remove('selected');
        }

        const target = current?.previousElementSibling ?? this.results.lastElementChild;
        target?.classList.add('selected');
    }

    navigateDown() {
        const current = this.results.querySelector('li.selected');

        if (current) {
            current.classList.remove('selected');
        }

        const target = current?.nextElementSibling ?? this.results.firstElementChild;
        target?.classList.add('selected');
    }

    selectResult() {
        const selected = this.results.querySelector('li.selected a');
        const firstResult = this.results.querySelector('li a');
        const link = selected ?? firstResult;

        if (link) {
            window.location = link.href;
        }
    }

    /**
     * @param {Object} result - Search result object
     * @param {string} result.htmlElementType - HTML element type (h1-h5)
     * @param {string} result.highlightedInnerText - Highlighted search result text
     * @param {string} result.link - URL to the result
     * @returns {string} HTML string for search the result
     */
    formatSearchResult(result) {
        const context = this.buildResultContext(result);
        const text = `<${result.htmlElementType} class="search-result-text">${result.highlightedInnerText}</${result.htmlElementType}>`;

        return `<li><a href="${result.link}" title="View this result">${context}${text}</a></li>`;
    }

    /**
     * @param {Object} result - Search result object
     * @returns {string} HTML string for hierarchical context (h1 > h2 > h3, etc.)
     */
    buildResultContext(result) {
        if (result.htmlElementType === 'h1') {
            return '';
        }

        const headers = ['h1', 'h2', 'h3', 'h4', 'h5'];
        const contextParts = [];

        for (const level of headers) {
            const highlightedKey = `highlighted${level.toUpperCase()}`;
            const shouldShow = result.htmlElementType !== level && result[highlightedKey] !== null;

            if (shouldShow) {
                contextParts.push(`<${level}>${result[highlightedKey]}</${level}>`);
            }
        }

        if (contextParts.length === 0) {
            return '';
        }

        return `<span class="search-result-context">${contextParts.join(' > ')}</span>`;
    }

    isVisible() {
        const display = this.results.style.display;
        return display !== '' && display !== 'none';
    }

    hasNoResults() {
        return this.results.querySelector('.no-results') !== null;
    }
}

/**
 * Documentation page navigation with sticky behavior and ToC highlighting
 */
class DocNavigation {
    constructor(sideNavElement, tocElement, articleElement, footerElement) {
        this.sideNav = sideNavElement;
        this.toc = tocElement;
        this.article = articleElement;
        this.footer = footerElement;

        this.highlightCurrentDoc();
        this.updateStickyBehavior();
        this.updateTocHighlight();
        this.attachEventListeners();
    }

    attachEventListeners() {
        window.addEventListener('scroll', () => {
            this.updateStickyBehavior();
            this.updateTocHighlight();
        });

        window.addEventListener('resize', () => this.updateStickyBehavior());
        document.addEventListener('context-toggled', () => this.updateStickyBehavior());
    }

    highlightCurrentDoc() {
        const currentPath = window.location.pathname;
        const link = this.sideNav.querySelector(`a[href="${currentPath}"]`);
        link?.classList.add('selected');
    }

    updateStickyBehavior() {
        const footerRect = this.footer.getBoundingClientRect();
        const bottomOffset = footerRect.top <= window.innerHeight
            ? `${window.innerHeight - footerRect.top}px`
            : '0px';

        this.sideNav.style.bottom = bottomOffset;
        this.toc.style.bottom = bottomOffset;
    }

    updateTocHighlight() {
        const headers = this.getVisibleHeaders();
        const currentHeader = this.findCurrentHeader(headers);

        if (!currentHeader) {
            return;
        }

        this.toc.querySelectorAll('a').forEach(link => {
            if (link.hash === `#${currentHeader.id}`) {
                link.classList.add('selected');
            } else {
                link.classList.remove('selected');
            }
        });
    }

    getVisibleHeaders() {
        const selector = '.toc-nav ~ h2, .toc-nav ~ h3, ' +
            '.toc-nav ~ div:not([style*="display: none"]):not([style*="display:none"]) h2, ' +
            '.toc-nav ~ div:not([style*="display: none"]):not([style*="display:none"]) h3';

        return this.article.querySelectorAll(selector);
    }

    findCurrentHeader(headers) {
        let current = headers[0];

        for (const header of headers) {
            if (header.getBoundingClientRect().top <= 6) {
                current = header;
            } else {
                break;
            }
        }

        return current;
    }
}

/**
 * Copy-to-clipboard button for code samples
 */
class CopyButton {
    static initializeAll() {
        document.querySelectorAll('.copy-button').forEach(button => {
            new CopyButton(button);
        });
    }

    /**
     * @param {HTMLElement} button - Copy button element
     */
    constructor(button) {
        this.button = button;
        this.originalSvg = String(button.innerHTML);
        this.checkSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-lg" viewBox="0 0 16 16"><path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"/></svg>';
        this.code = String(button.closest('pre').querySelector('code').textContent).trim();

        this.button.addEventListener('click', () => this.copy());
    }

    async copy() {
        try {
            await navigator.clipboard.writeText(this.code);
            this.showFeedback();
        } catch (error) {
            console.error('Failed to copy text:', error);
        }
    }

    showFeedback() {
        this.button.innerHTML = this.checkSvg;
        setTimeout(() => {
            this.button.innerHTML = this.originalSvg;
        }, 3000);
    }
}

/**
 * Main application controller
 */
class AphiriaApp {
    constructor() {
        this.mobileMenu = new MobileMenu();
        this.initializeSearchInput();
        this.initializeMobileMenu();
        this.initializeDocPages();
    }

    initializeSearchInput() {
        const searchInput = document.getElementById('search-query');
        const searchResults = document.querySelector('.search-results');

        if (searchInput && searchResults) {
            this.search = new DocSearch(searchInput, searchResults);

            if (!window.location.hash) {
                searchInput.focus();
            }
        }
    }

    initializeMobileMenu() {
        const mobileMenuLink = document.querySelector('#mobile-menu a');
        const grayOut = document.getElementById('gray-out');

        if (mobileMenuLink) {
            mobileMenuLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.mobileMenu.toggle();
            });
        }

        if (grayOut) {
            grayOut.addEventListener('click', () => {
                this.mobileMenu.close();
            });
        }
    }

    initializeDocPages() {
        if (!document.body.classList.contains('docs')) {
            return;
        }

        const sideNav = document.querySelector('nav.side-nav');

        if (!sideNav) {
            return;
        }

        if (window.matchMedia('(min-width: 1024px)').matches) {
            const article = document.querySelector('body.docs main article');
            const tocContents = document.querySelector('.toc-nav-contents');
            const footer = document.querySelector('body > footer');

            if (article && tocContents && footer) {
                new DocNavigation(sideNav, tocContents, article, footer);
            }
        } else {
            const currentPath = window.location.pathname;
            const link = sideNav.querySelector(`a[href="${currentPath}"]`);
            link?.classList.add('selected');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.remove('loading');
    CopyButton.initializeAll();
});

window.addEventListener('load', () => {
    new AphiriaApp();
});
