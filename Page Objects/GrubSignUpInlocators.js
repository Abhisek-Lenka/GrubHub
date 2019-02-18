

var search = {

    homepage : { 

        signin : element(by.css('a[at-prettyhomepagesignin="true"]')),

        createAcc : element(by.css('.ghs-goToCreateAccount')), 
    },

    signUp : {

        firstname : element(by.css('input[name = firstName]')),

        lastname : element(by.css('input[name = lastName]')),

        email  : element(by.xpath('//div[@class="s-row s-form-group"]//input[@type = "email"]')),
    
        password : element(by.css('input[name = password]')),

        showPass : element(by.xpath('//div[@class="s-form-group"]//a[text() = " Show "]')),

        createYourAccount  : element(by.buttonText("Create your account")),

        hi : element(by.xpath('//div[@class="s-dropdown"]//button[@class="s-btn mainNavProfile-container u-flex u-flex-align-xs--center"]')),

        signout : element(by.xpath('//div[@class="u-line-top u-line--thin u-line--light u-inset-4"]//a[@class="ghs-signOut u-text-interactive"]')),
    },

    signIn : {

        email : element(by.xpath('//div[@class="s-input-group"]//input[@type = "email"]')),

        pass : element(by.css('input[name = password]')),

        signInButton : element(by.buttonText('Sign in')),
    }

};


module.exports = search;