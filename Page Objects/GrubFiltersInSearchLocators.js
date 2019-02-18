var search = {

    modes : {

        delivery : element(by.buttonText('Delivery')),

        pickup : element(by.buttonText('Pickup')),

        restaurants : element(by.cssContainingText('span.h6','Restaurants')),

        catering : element(by.cssContainingText('span.h6','Catering')),

     },


    features  : {

        freedelivery : element(by.xpath('//label[@class = "s-checkbox-label u-flex-inline"]')),//will find many elements but will choose the first element

        coupons : element.all(by.xpath('//label[@class = "s-checkbox-label u-flex-inline"]')).get(1),//choose the second element

        openNow: element.all(by.xpath('//label[@class = "s-checkbox-label u-flex-inline"]')).last(),//choose the third element

    }, 


    Ratings : {

        one : element(by.css("button[title = '1 And Above']")),

        two : element(by.css("button[title = '2 And Above']")),

        three : element(by.css("button[title = '3 And Above']")),

        four : element(by.css("button[title = '4 And Above']")),

        five : element(by.css("button[title = '5 Only']")),

    },


    filters: {

        clearall : element(by.css('.facetContainer-titleClear')),

    },


    Price : {

       one : element(by.css("button[title = '1 Only']")),

       two : element(by.css("button[title = '2 And Below']")),

       three : element(by.css("button[title = '3 And Below']")),

       four : element(by.css("button[title = '4 And Below']")),

       five : element(by.css("button[title = '5 And Below']")),

    },


    deliveryTime : {

        slider : element(by.xpath('//div[@class="facetContainer-content"]//input[@class = "s-slider"]')),
    },  

    


    deliveryDate : { 

        orderSchedule : element(by.xpath('//div[@class="u-margin-top-large facetCategory-when"]//a[@href="javascript:void(0)"]')),

        asap : element(by.xpath('//a[@class="ghs-setDay s-btn s-btn-secondary whenFor-datePicker-date"][text() = "ASAP"]')),

        today : element(by.xpath('//a[@class="ghs-setDay s-btn s-btn-secondary whenFor-datePicker-date"][text() = "Today"]')),

        later : element(by.xpath('//a[@class="ghs-setDay s-btn s-btn-secondary whenFor-datePicker-date"][text() = "Later"]')),

        time : element(by.css('select[class="s-form-control s-select-control ghs-whenFor-value"]')),
        
        deliver : element(by.css('[class="ghs-applyWhenFor s-btn s-btn-primary s-btn--block u-stack-y-4"]')),
    }

    };
    

    module.exports = search ;