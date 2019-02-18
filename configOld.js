exports.config = {
    directConnect : true,

seleniumAddress: 'http://localhost:4444/wd/hub', 




capabilities: {

    'browserName':'chrome',

   /* chromeOptions: {
	 args: [ "--headless"]
   } */                       //command for headless browser


}, 


  /* multiCapabilities: [{                    //parallelly different browsers
    'browserName': 'chrome' ,
    specs : [''],
    //maxInstances : 4 ,
  }, 
  {
    'browserName': 'firefox',
    specs : [''],    
   // maxInstances : 4,
  } ],  
*/
 // maxSessions: 1,               //allows one browser at a time 


    framework: 'jasmine',


specs: ['Test Cases/*.js'],

maxInstances : 2,

allScriptsTimeout: 30000,


onPrepare: function(){
    browser.manage().window().maximize(); //maximizes the window 
},


jasmineNodeOpts: { 
  defaultTimeOutInterval: 40000
}




}
