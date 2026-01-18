#!/usr/bin/env node

import fs from 'fs';
import { JSDOM } from 'jsdom';
import prism from 'prismjs';
import loadLanguages from 'prismjs/components/index.js';

// Note: If our documentation uses any other languages, be sure to add them here
loadLanguages(['apacheconf', 'bash', 'http', 'json', 'markup', 'nginx', 'php','xml', 'yaml']);

function highlightFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const dom = new JSDOM(content);
    const document = dom.window.document;

    const codeBlocks = document.querySelectorAll('pre > code');
    codeBlocks.forEach(codeBlock => {
        let languageClass = Array.from(codeBlock.classList).find(cls => cls.startsWith('language-'));
        // Default to PHP (useful for inline code blocks that do not contain a language)
        let lang = languageClass ? languageClass.replace('language-', '') : 'php';

        if (!languageClass) {
            languageClass = 'language-php';
            codeBlock.classList.add(languageClass);
        }

        if (prism.languages[lang]) {
            codeBlock.innerHTML = prism.highlight(codeBlock.textContent, prism.languages[lang], lang);

            // Ensure <pre> has the same language class
            const preElement = codeBlock.parentElement;
            if (preElement && preElement.tagName.toLowerCase() === 'pre' && !preElement.classList.contains(languageClass)) {
                preElement.classList.add(languageClass);
            }

            // Add Copy button unless <pre> has 'no-copy' class
            if (preElement && !preElement.classList.contains('no-copy')) {
                const buttonWrapper = document.createElement('div');
                buttonWrapper.className = 'button-wrapper';

                const copyButton = document.createElement('button');
                copyButton.className = 'copy-button';
                copyButton.title = 'Copy to clipboard';
                copyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-copy" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z"></path></svg>';

                buttonWrapper.appendChild(copyButton);
                preElement.insertBefore(buttonWrapper, preElement.firstChild);
            }
        }
    });

    fs.writeFileSync(filePath, dom.serialize(document), { encoding: 'utf8' });
    console.log(`Highlighted: ${filePath}`);
}

const filePath = process.argv[2];

if (!filePath || !fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
}

highlightFile(filePath);
