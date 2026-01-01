#!/usr/bin/env node

const fs = require('fs');
const { JSDOM } = require('jsdom');
const prism = require('prismjs');
const loadLanguages = require('prismjs/components/');

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
                copyButton.textContent = 'Copy';
                copyButton.className = 'copy-button';

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
