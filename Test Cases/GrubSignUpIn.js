'use strict'

//import locators

var locator = require('../Page Objects/GrubSignUpInlocators');

//import pre-defined functions

var util = require('../Util');

//checks the working of the SignUp and SignIn using user credentials


describe("Validation of SignUp and SignIn",function() {


    beforeEach(function() { 

       

    //opens the website www.grubhub.com

    browser.get("https://www.grubhub.com/");
    
    })


    it("Validation of SignUp using a new user name & password",function()  { 


         //clicks the sign in button

         locator.homepage.signin.click();

 
         //clicks the create yout account option

         locator.homepage.createAcc.click();


         //input first name

         locator.signUp.firstname.sendKeys("Monica");


         //input last name

         locator.signUp.lastname.sendKeys('Geller');


         //input email id

         locator.signUp.email.sendKeys('monicageller@hotmail.com');


         //input password

         locator.signUp.password.sendKeys("iammonica");


         //show password

         locator.signUp.showPass.click();


         //clicks create account button

         locator.signUp.createYourAccount.click();


         //clicks the profile button

         locator.signUp.hi.click();


         //sign out your profile

         locator.signUp.signout.click();


    })



    //validation of Sign in feature with the same credentials

    it('checks the sign in feature by using same credentials as used in sign up',function()  {
 

        //clicks the sign in button

        locator.homepage.signin.click();


        //input the email id

        locator.signIn.email.sendKeys("monicageller@hotmail.com");


        //input password

        locator.signIn.pass.sendKeys("iammonica");


        //clicks sign in button

        locator.signIn.signInButton.click();


        //checks if the account opened is the correct account

        util.match(locator.signUp.hi,'Monica');


        //clicks the profile button

        locator.signUp.hi.click();


        //sign out your profile

        locator.signUp.signout.click();



    })


})