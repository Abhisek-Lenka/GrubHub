'use strict'


//import locators

var food = require('../Page Objects/GrubFoodSectionLocators');


var locator = require('../Page Objects/GrubSearchLocators.js');


//checks the elements in the food section area

describe("validation the food section menu after searching location",function() {


    beforeEach(function() {

        browser.get("https://www.eat24.com/");


       //click on the searchbar

        locator.homepage.searchBar.click();


       // type "New York" and click findfood button

        locator.homepage.searchBar.sendKeys('New York');


        locator.homepage.searchButton.click();
        
    })



    it("Validation of all cuisines button",function() {


    //clicks on the all cuisines button

    food.allcuisines.click();


    //gets the text of the dialog box opened

    var title = food.openallcuisines.getText();


    //print and compare that text with the original text

    title.then(function(text) {


    expect(title).toEqual("All cuisines").then(function() { 
 
        console.log('Matched : '+text);
    });


          })
          
   
    })
    



    it("validate the silde right and slide left button",function() {


       //clicks on the slide right button 

        food.slideright.click();


       //clicks on the slide left button

        food.sliderleft.click();

        console.log('Slider Check');

    })


    
})