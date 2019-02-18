

var search = {

    allcuisines : element(by.xpath('//*[@id="ghs-search-results-container"]/div/div[2]/div/div/ghs-search-results/div[1]/div/ghs-cuisine-ribbon/div/div/ghs-cuisine-ribbon-header/div/a')),

    openallcuisines : element(by.xpath('//*[@id="Site"]/ghs-modal-backdrop/ghs-modal-container/div/dialog/ghs-modal-content/ghs-cuisine-filter-modal/aside/section/div/h3')),

    slideright : element(by.xpath('//*[@id="cuisineFilterContainer"]/div/ghs-carousel/div/div[2]/cb-icon')),

    sliderleft : element(by.xpath('//*[@id="cuisineFilterContainer"]/div/ghs-carousel/div/div[1]/cb-icon')),
    
};

module.exports = search;