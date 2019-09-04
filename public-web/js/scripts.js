window.addEventListener('load', loadEvent => {
    // Add focus to the search bar as long as there's no hash (autofocus attribute prevents scrolling to the ID held in the hash)
    if(!window.location.hash)
    {
        document.getElementById('search-query').focus();
    }

    const searchInputElem = document.getElementById('search-query');
    const searchResultsElem = document.querySelector('.search-results');
    const detectClickOffSearch = clickEvent => {
        if(clickEvent.target !== searchInputElem && clickEvent.target !== searchResultsElem)
        {
            searchResultsElem.style.display = 'none';
        }
    };
    let timer = null;
    searchInputElem.onkeyup = keyEvent => {
        if(timer !== null)
        {
            clearTimeout(timer);
        }

        if(searchInputElem.value.length === 0)
        {
            searchResultsElem.style.display = 'none';
            document.removeEventListener('click', detectClickOffSearch);
        }
        else
        {
            timer = setTimeout(() => {
                fetch(`${apiUri}/docs/search?query=${encodeURIComponent(searchInputElem.value)}`)
                    .then((response) => response.json())
                    .then(searchResults => {
                        let searchResultItems = '';

                        searchResults.forEach(searchResult => {
                            let linkInnerHtml = '';

                            // In the case of a match on the doc itself, don't bother showing the context
                            if(searchResult.htmlElementType !== 'h1')
                            {
                                linkInnerHtml = '<span class="search-result-context">';
                                // The <h1> is always assumed to be set
                                linkInnerHtml += `<h1>${searchResult.highlightedH1}</h1>`;

                                // Only show the header context if the result is not the level of header
                                if(searchResult.htmlElementType !== 'h2' && searchResult.highlightedH2 !== null)
                                {
                                    linkInnerHtml += ` > <h2>${searchResult.highlightedH2}</h2>`
                                }

                                if(searchResult.htmlElementType !== 'h3' && searchResult.highlightedH3 !== null)
                                {
                                    linkInnerHtml += ` > <h3>${searchResult.highlightedH3}</h3>`
                                }

                                if(searchResult.htmlElementType !== 'h4' && searchResult.highlightedH4 !== null)
                                {
                                    linkInnerHtml += ` > <h4>${searchResult.highlightedH4}</h4>`
                                }

                                if(searchResult.htmlElementType !== 'h5' && searchResult.highlightedH5 !== null)
                                {
                                    linkInnerHtml += ` > <h5>${searchResult.highlightedH5}</h5>`
                                }

                                linkInnerHtml += '</span>';
                            }

                            linkInnerHtml += `<${searchResult.htmlElementType} class="search-result-text">${searchResult.highlightedInnerText}</${searchResult.htmlElementType}>`;
                            searchResultItems += `<li><a href="${searchResult.link}" title="View this result">${linkInnerHtml}</a></li>`
                        });

                        if(searchResultItems === '')
                        {
                            // No results
                            searchResultItems = `<li class="no-results">No results for "${searchInputElem.value}"</li>`;
                        }

                        searchResultsElem.innerHTML = searchResultItems;
                        document.addEventListener('click', detectClickOffSearch);
                        searchResultsElem.style.display = 'block';
                    })
                    .catch(error => {
                        console.log(`Failed to get search results: ${error}`);
                    })
            }, 250);
        }
    };
});
