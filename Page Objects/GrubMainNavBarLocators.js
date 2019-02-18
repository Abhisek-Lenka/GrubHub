

var search = {


    GrubHubBlock : element(by.css('a[class = "mainNavBrand-logo"]')),

    locationButton : element(by.css('[class="mainNav-addressDisplay mainNav-addressDisplay--label-only"]')),

    search : element(by.css('input[name = searchTerm]')),

    dishsearch : element(by.xpath('//div[@class = "s-input-group s-input-group--hasLeftAddon s-input-group--hasRightAddon s-has-feedback navbar-menu-search s-input-group--transparent-nav"]//input[@type = "search"]')),

    signin : element(by.buttonText('Sign in')),

    cart : element(by.css('button[class="ghs-toggleCart s-btn s-iconBtn s-iconBtn--small mainNavMenu-cartBtn u-flex-center-center s-btn-tertiary--inverted s-iconBtn--large"]')),

    cartMessage : element(by.css('h5.cart-error-title')),

    signinpage : element(by.css('[class="u-text-left u-stack-y-4"]')),
    
};



module.exports = search ;