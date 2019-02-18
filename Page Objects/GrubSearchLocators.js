

var search = {

    homepage : {


         searchBar: element(by.css('input[name = searchTerm]')),
         
         searchButton: element(by.css('div[class="s-btn s-btn-primary s-btn--static s-btn-primary--brand"]')),

       
    },

    searchLocation : element(by.css('[class="mainNav-addressDisplay--labelAddress u-inline-block u-text-ellipsis  u-stack-x-1"]')),

};

module.exports = search; 