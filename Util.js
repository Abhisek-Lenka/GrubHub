//declares the EC variable for using in expected conditions
var EC = protractor.ExpectedConditions;

'use strict';

var predeffunctions = function() { 


   //function to wait for an element and click it

   this.waitClick = function(elem) { 

      browser.wait(EC.elementToBeClickable(elem), 20000).then(function()  {
 
         elem.click();
 
       })
   };



   //function to check if the element is visible and click it

   this.visibleclick = function(elem)  {

     elem.isDisplayed().then(function(isVisible) { 
            
         if(isVisible) { 
            elem.click();
         }
             else{
                 console.log('element not visible');
             }
       })
   };



   //function to check if the element is present and click it

   this.presentclick = function(elem) {

      if(expect(elem.isPresent()).toEqual(true)){

         elem.click();
      }
      else{
         console.log('element is not present');
      }
   };

   

   //function to wait for an element and send values to it

   this.waitSend = function(elem,value) { 

      browser.wait(EC.elementToBeClickable(elem), 20000).then(function()  {

         elem.click();

         elem.sendKeys(value);
 
       })
   };


//function to get the text from the element

   this.gettext = function(elem) { 
 
    elem.getText().then(function(text) { 

      console.log(text);

    })

   };



//function to match the element's value with a given value

   this.match = function(elem,value) { 

      elem.getText().then(function(text) { 


         expect(elem.getText()).toContain(value);


         console.log(`${text} contains ${value}`);

         })

      };

      




   //function to wait for an element and getText from it and match it with the value

   this.waitTextMatch = function(elem,value) { 

      browser.wait(elem.isDisplayed(), 20000).then(function()  {
 
         elem.getText().then(function(text) {

            expect(text).toContain(value);
            
            console.log(`${text} matched with ${value}`);
         });
 
       })

};


 //function  to getText from an element and match it with the value

this.textMatch = function(elem,value) { 

      elem.getText().then(function(text) {

         expect(text).toContain(value);
         
         console.log(`${text} matched with ${value}`);
      });

   

};

    

   }

module.exports = new predeffunctions();
