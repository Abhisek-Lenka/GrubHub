'use strict'

//import locators

 var navbarlocator = require('../Page Objects/GrubMainNavBarLocators.js');

 var locator = require('../Page Objects/GrubSearchLocators.js');

 //import pre-defined functions

 var util = require('../Util');




describe("Validation of elements present in the main nav bar after searching for a location",function() {

   
    
    //search New York location before each spec

    beforeEach(function() {


        browser.get("https://www.grubhub.com/");

        
        //click on the searchbar

        locator.homepage.searchBar.click();


        //type "New York" and click search button

        locator.homepage.searchBar.sendKeys('New York');


        locator.homepage.searchButton.click();


    });

    


    it("Checks the GrubHub block directs to the homepage",function() {


    //clicks the GrubHub block

    navbarlocator.GrubHubBlock.click();


    //gets the title of the directed page

    var title = browser.getTitle();


    title.then(function(text) {


        //prints the title of the directed page

        console.log(text);



        //matches the title of the directed page with the homepage

        expect(title).toEqual("Food Delivery | Restaurant Takeout | Order Food Online | Grubhub");


    })



    }) 





 it("validation location button",function() {


    //clicks the location button

 
    navbarlocator.locationButton.click();


    })




it("clicks on the restaurant/dish search and give a input and search",function() {


    //clicks on the dish search bar

    navbarlocator.dishsearch.click();


    //gives an input

    navbarlocator.dishsearch.sendKeys('Chinese');


    //press enter key

    browser.actions().sendKeys(protractor.Key.ENTER).perform();



})



it("Validation of Sign In button",function() {


    //clicks the sign in  button

    navbarlocator.signin.click();

    //mathces text with the opened signin page

    util.textMatch(navbarlocator.signinpage,'Sign in');

})




it("checks the cart button after searching location",function() {

    
    //clicks on the cart button

    navbarlocator.cart.click();


    //gets the message of cart empty

    util.textMatch(navbarlocator.cartMessage,'empty');


})



}) 