'use strict'

//imported the locators 

var locator = require('../Page Objects/GrubSearchLocators.js');

var util = require('../Util');

describe("Search location in GrubHub",function() {


//it will open https://www.grubhub.com/ before each test case

beforeEach(function() {
    

browser.get("https://www.grubhub.com/");


});


//Test case for input "New York" in the search address bar

    it("Input New York  and click search",function() {
     
   //click on the searchbar

    locator.homepage.searchBar.click();

   // type "New York" and click findfood

    locator.homepage.searchBar.sendKeys('New York');

   //clicks the search button

    locator.homepage.searchButton.click();

    //matches the searched location name with the input location

    util.textMatch(locator.searchLocation,'New York');



    })


 //Test case for input "Los Angeles" in the search address bar

it("Input Los Angeles and click search",function() {


   //click on the searchbar

   locator.homepage.searchBar.click();

   // type "New York" and click findfood

    locator.homepage.searchBar.sendKeys('Los Angeles');

    //clicks the search button
   
    locator.homepage.searchButton.click();


    //matches the searched location name with the input location

    util.textMatch(locator.searchLocation,'Los Angeles');
  

            
  })

     

        
})