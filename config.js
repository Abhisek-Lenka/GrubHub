var HtmlReporter = require('protractor-beautiful-reporter');


exports.config = {
    directConnect : true,

seleniumAddress: 'http://localhost:4444/wd/hub',

capabilities: {
    browserName: 'chrome',
    },

    framework: 'jasmine',



specs: ['Test Cases/GrubFiltersInSearch.js'],




allScriptsTimeout: 30000,


onPrepare: function() {

    //maximizes the window 

    browser.manage().window().maximize(); 

    // Add a screenshot reporter and store screenshots to `/Reports/screenshots/images`:

    jasmine.getEnv().addReporter(new HtmlReporter( {

       baseDirectory: 'Reports/screenshots',

       screenshotsSubfolder: 'images',

       jsonsSubfolder: 'jsons'

    }).getJasmine2Reporter());

 },

jasmineNodeOpts: { 
  defaultTimeOutInterval: 40000
}
}
