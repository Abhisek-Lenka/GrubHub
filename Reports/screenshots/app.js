var app = angular.module('reportingApp', []);

//<editor-fold desc="global helpers">

var isValueAnArray = function (val) {
    return Array.isArray(val);
};

var getSpec = function (str) {
    var describes = str.split('|');
    return describes[describes.length - 1];
};
var checkIfShouldDisplaySpecName = function (prevItem, item) {
    if (!prevItem) {
        item.displaySpecName = true;
    } else if (getSpec(item.description) !== getSpec(prevItem.description)) {
        item.displaySpecName = true;
    }
};

var getParent = function (str) {
    var arr = str.split('|');
    str = "";
    for (var i = arr.length - 2; i > 0; i--) {
        str += arr[i] + " > ";
    }
    return str.slice(0, -3);
};

var getShortDescription = function (str) {
    return str.split('|')[0];
};

var countLogMessages = function (item) {
    if ((!item.logWarnings || !item.logErrors) && item.browserLogs && item.browserLogs.length > 0) {
        item.logWarnings = 0;
        item.logErrors = 0;
        for (var logNumber = 0; logNumber < item.browserLogs.length; logNumber++) {
            var logEntry = item.browserLogs[logNumber];
            if (logEntry.level === 'SEVERE') {
                item.logErrors++;
            }
            if (logEntry.level === 'WARNING') {
                item.logWarnings++;
            }
        }
    }
};

var defaultSortFunction = function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) {
        return -1;
    }
    else if (a.sessionId > b.sessionId) {
        return 1;
    }

    if (a.timestamp < b.timestamp) {
        return -1;
    }
    else if (a.timestamp > b.timestamp) {
        return 1;
    }

    return 0;
};


//</editor-fold>

app.controller('ScreenshotReportController', function ($scope, $http) {
    var that = this;
    var clientDefaults = {};

    $scope.searchSettings = Object.assign({
        description: '',
        allselected: true,
        passed: true,
        failed: true,
        pending: true,
        withLog: true
    }, clientDefaults.searchSettings || {}); // enable customisation of search settings on first page hit

    var initialColumnSettings = clientDefaults.columnSettings; // enable customisation of visible columns on first page hit
    if (initialColumnSettings) {
        if (initialColumnSettings.displayTime !== undefined) {
            // initial settings have be inverted because the html bindings are inverted (e.g. !ctrl.displayTime)
            this.displayTime = !initialColumnSettings.displayTime;
        }
        if (initialColumnSettings.displayBrowser !== undefined) {
            this.displayBrowser = !initialColumnSettings.displayBrowser; // same as above
        }
        if (initialColumnSettings.displaySessionId !== undefined) {
            this.displaySessionId = !initialColumnSettings.displaySessionId; // same as above
        }
        if (initialColumnSettings.displayOS !== undefined) {
            this.displayOS = !initialColumnSettings.displayOS; // same as above
        }
        if (initialColumnSettings.inlineScreenshots !== undefined) {
            this.inlineScreenshots = initialColumnSettings.inlineScreenshots; // this setting does not have to be inverted
        } else {
            this.inlineScreenshots = false;
        }
    }

    this.showSmartStackTraceHighlight = true;

    this.chooseAllTypes = function () {
        var value = true;
        $scope.searchSettings.allselected = !$scope.searchSettings.allselected;
        if (!$scope.searchSettings.allselected) {
            value = false;
        }

        $scope.searchSettings.passed = value;
        $scope.searchSettings.failed = value;
        $scope.searchSettings.pending = value;
        $scope.searchSettings.withLog = value;
    };

    this.isValueAnArray = function (val) {
        return isValueAnArray(val);
    };

    this.getParent = function (str) {
        return getParent(str);
    };

    this.getSpec = function (str) {
        return getSpec(str);
    };

    this.getShortDescription = function (str) {
        return getShortDescription(str);
    };

    this.convertTimestamp = function (timestamp) {
        var d = new Date(timestamp),
            yyyy = d.getFullYear(),
            mm = ('0' + (d.getMonth() + 1)).slice(-2),
            dd = ('0' + d.getDate()).slice(-2),
            hh = d.getHours(),
            h = hh,
            min = ('0' + d.getMinutes()).slice(-2),
            ampm = 'AM',
            time;

        if (hh > 12) {
            h = hh - 12;
            ampm = 'PM';
        } else if (hh === 12) {
            h = 12;
            ampm = 'PM';
        } else if (hh === 0) {
            h = 12;
        }

        // ie: 2013-02-18, 8:35 AM
        time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;

        return time;
    };


    this.round = function (number, roundVal) {
        return (parseFloat(number) / 1000).toFixed(roundVal);
    };


    this.passCount = function () {
        var passCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.passed) {
                passCount++;
            }
        }
        return passCount;
    };


    this.pendingCount = function () {
        var pendingCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.pending) {
                pendingCount++;
            }
        }
        return pendingCount;
    };


    this.failCount = function () {
        var failCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (!result.passed && !result.pending) {
                failCount++;
            }
        }
        return failCount;
    };

    this.passPerc = function () {
        return (this.passCount() / this.totalCount()) * 100;
    };
    this.pendingPerc = function () {
        return (this.pendingCount() / this.totalCount()) * 100;
    };
    this.failPerc = function () {
        return (this.failCount() / this.totalCount()) * 100;
    };
    this.totalCount = function () {
        return this.passCount() + this.failCount() + this.pendingCount();
    };

    this.applySmartHighlight = function (line) {
        if (this.showSmartStackTraceHighlight) {
            if (line.indexOf('node_modules') > -1) {
                return 'greyout';
            }
            if (line.indexOf('  at ') === -1) {
                return '';
            }

            return 'highlight';
        }
        return true;
    };

    var results = [
    {
        "description": "Validation of SignUp using a new user name & password|Validation of SignUp and SignIn",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 808,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.eat24.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.eat24.com/:26:78\n    at https://www.eat24.com/:93:11",
                "timestamp": 1549615986256,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://clickstream.grubhub.com/event.gif?event=%7B%22name%22%3A%22reverse-geocoded-users-ip%22%2C%22platform%22%3A%22umami%20eat24%22%2C%22browserId%22%3A%22rhzhu24lv17rbje5i1ifh143c1549615998083%22%2C%22sessionId%22%3A%22wie9k9h2ot86jzgsgr740fao81549615998081%22%2C%22sessionStartDateTime%22%3A%222019-02-08T08%3A53%3A18.081Z%22%2C%22userId%22%3A%22%22%2C%22referrer%22%3A%22%22%2C%22userAgent%22%3A%22Mozilla/5.0%20%28Windows%20NT%206.1%3B%20Win64%3B%20x64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/71.0.3578.98%20Safari/537.36%22%2C%22protocol%22%3A%22https%3A%22%2C%22hostname%22%3A%22www.eat24.com%22%2C%22pathname%22%3A%22/%22%2C%22queryParams%22%3A%22%22%2C%22view%22%3A%22homepage%20logged%20out%22%2C%22data%22%3A%5B%5D%2C%22sequence%22%3A4%2C%22dateTime%22%3A%222019-02-08T08%3A53%3A18.091Z%22%2C%22timezone%22%3A-330%2C%22v2BrowserId%22%3A%22fa8ae0fc-2b7e-11e9-b228-137576914400%22%2C%22v2SessionId%22%3A%22fa8b080f-2b7e-11e9-a3ac-9b7a56010326%22%7D - Failed to load resource: the server responded with a status of 400 (Bad Request)",
                "timestamp": 1549615999405,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1549616006273,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1549616006273,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1549616012893,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.eat24.com/js/main-43a820f0b8862375d7a3.js 0:1168709 e",
                "timestamp": 1549616012893,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1549616013415,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.eat24.com/js/main-43a820f0b8862375d7a3.js 0:1168709 e",
                "timestamp": 1549616013416,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1549616013416,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.eat24.com/js/main-43a820f0b8862375d7a3.js 0:1168709 e",
                "timestamp": 1549616013416,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1549616013519,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.eat24.com/js/main-43a820f0b8862375d7a3.js 0:1168709 e",
                "timestamp": 1549616013524,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1549616013742,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.eat24.com/js/main-43a820f0b8862375d7a3.js 0:1168709 e",
                "timestamp": 1549616013742,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1549616013742,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.eat24.com/js/main-43a820f0b8862375d7a3.js 0:1168709 e",
                "timestamp": 1549616013743,
                "type": ""
            }
        ],
        "screenShotFile": "images\\00760060-003e-004e-003a-00d00093004c.png",
        "timestamp": 1549615984128,
        "duration": 29939
    },
    {
        "description": "checks the sign in feature by using same credentials as used in sign up|Validation of SignUp and SignIn",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 808,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1549616014349,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.eat24.com/js/main-43a820f0b8862375d7a3.js 0:1168709 e",
                "timestamp": 1549616014355,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1549616014356,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.eat24.com/js/main-43a820f0b8862375d7a3.js 0:1168709 e",
                "timestamp": 1549616014363,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://clickstream.grubhub.com/event.gif?event=%7B%22name%22%3A%22reverse-geocoded-users-ip%22%2C%22platform%22%3A%22umami%20eat24%22%2C%22browserId%22%3A%22rhzhu24lv17rbje5i1ifh143c1549615998083%22%2C%22sessionId%22%3A%22wie9k9h2ot86jzgsgr740fao81549615998081%22%2C%22sessionStartDateTime%22%3A%222019-02-08T08%3A53%3A18.081Z%22%2C%22userId%22%3A%22%22%2C%22referrer%22%3A%22%22%2C%22userAgent%22%3A%22Mozilla/5.0%20%28Windows%20NT%206.1%3B%20Win64%3B%20x64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/71.0.3578.98%20Safari/537.36%22%2C%22protocol%22%3A%22https%3A%22%2C%22hostname%22%3A%22www.eat24.com%22%2C%22pathname%22%3A%22/%22%2C%22queryParams%22%3A%22%22%2C%22view%22%3A%22homepage%20logged%20out%22%2C%22data%22%3A%5B%5D%2C%22sequence%22%3A4%2C%22dateTime%22%3A%222019-02-08T08%3A53%3A18.091Z%22%2C%22timezone%22%3A-330%2C%22v2BrowserId%22%3A%22fa8ae0fc-2b7e-11e9-b228-137576914400%22%2C%22v2SessionId%22%3A%22fa8b080f-2b7e-11e9-a3ac-9b7a56010326%22%7D - Failed to load resource: the server responded with a status of 400 (Bad Request)",
                "timestamp": 1549616015418,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1549616015418,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1549616015418,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1549616015418,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1549616015419,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1549616015419,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1549616015419,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1549616015419,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1549616015419,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1549616015419,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1549616015419,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.eat24.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.eat24.com/:26:78\n    at https://www.eat24.com/:93:11",
                "timestamp": 1549616015449,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://clickstream.grubhub.com/event.gif?event=%7B%22name%22%3A%22reverse-geocoded-users-ip%22%2C%22platform%22%3A%22umami%20eat24%22%2C%22browserId%22%3A%22rhzhu24lv17rbje5i1ifh143c1549615998083%22%2C%22sessionId%22%3A%22wie9k9h2ot86jzgsgr740fao81549615998081%22%2C%22sessionStartDateTime%22%3A%222019-02-08T08%3A53%3A18.081Z%22%2C%22userId%22%3A%2262266835%22%2C%22referrer%22%3A%22%22%2C%22userAgent%22%3A%22Mozilla/5.0%20%28Windows%20NT%206.1%3B%20Win64%3B%20x64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/71.0.3578.98%20Safari/537.36%22%2C%22protocol%22%3A%22https%3A%22%2C%22hostname%22%3A%22www.eat24.com%22%2C%22pathname%22%3A%22/%22%2C%22queryParams%22%3A%22%22%2C%22view%22%3A%22homepage%20logged%20out%22%2C%22data%22%3A%5B%5D%2C%22sequence%22%3A3%2C%22dateTime%22%3A%222019-02-08T08%3A53%3A36.734Z%22%2C%22timezone%22%3A-330%2C%22v2BrowserId%22%3A%22fa8ae0fc-2b7e-11e9-b228-137576914400%22%2C%22v2SessionId%22%3A%22fa8b080f-2b7e-11e9-a3ac-9b7a56010326%22%7D - Failed to load resource: the server responded with a status of 400 (Bad Request)",
                "timestamp": 1549616017181,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1549616018179,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1549616018179,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1549616021665,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.eat24.com/js/main-43a820f0b8862375d7a3.js 0:1168709 e",
                "timestamp": 1549616021665,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1549616021665,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.eat24.com/js/main-43a820f0b8862375d7a3.js 0:1168709 e",
                "timestamp": 1549616021671,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1549616021879,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.eat24.com/js/main-43a820f0b8862375d7a3.js 0:1168709 e",
                "timestamp": 1549616021879,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1549616021879,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.eat24.com/js/main-43a820f0b8862375d7a3.js 0:1168709 e",
                "timestamp": 1549616021880,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1549616022205,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.eat24.com/js/main-43a820f0b8862375d7a3.js 0:1168709 e",
                "timestamp": 1549616022205,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1549616022205,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.eat24.com/js/main-43a820f0b8862375d7a3.js 0:1168709 e",
                "timestamp": 1549616022205,
                "type": ""
            }
        ],
        "screenShotFile": "images\\009d0011-000c-00ea-00e3-0070003c0040.png",
        "timestamp": 1549616014936,
        "duration": 8964
    },
    {
        "description": "Input New York  and click search|Search location in Eat24",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4068,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.eat24.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.eat24.com/:26:78\n    at https://www.eat24.com/:93:11",
                "timestamp": 1549616091391,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://clickstream.grubhub.com/event.gif?event=%7B%22name%22%3A%22reverse-geocoded-users-ip%22%2C%22platform%22%3A%22umami%20eat24%22%2C%22browserId%22%3A%221gwvtrbs3o05tzlkmanjz60vt1549616094414%22%2C%22sessionId%22%3A%22yegjmxd4uplupgycw28891y0p1549616094413%22%2C%22sessionStartDateTime%22%3A%222019-02-08T08%3A54%3A54.413Z%22%2C%22userId%22%3A%22%22%2C%22referrer%22%3A%22%22%2C%22userAgent%22%3A%22Mozilla/5.0%20%28Windows%20NT%206.1%3B%20Win64%3B%20x64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/71.0.3578.98%20Safari/537.36%22%2C%22protocol%22%3A%22https%3A%22%2C%22hostname%22%3A%22www.eat24.com%22%2C%22pathname%22%3A%22/%22%2C%22queryParams%22%3A%22%22%2C%22view%22%3A%22homepage%20logged%20out%22%2C%22data%22%3A%5B%5D%2C%22sequence%22%3A6%2C%22dateTime%22%3A%222019-02-08T08%3A54%3A56.720Z%22%2C%22timezone%22%3A-330%2C%22v2BrowserId%22%3A%2233f5d2ad-2b7f-11e9-9fda-31fc4f08e239%22%2C%22v2SessionId%22%3A%2233f5f9bb-2b7f-11e9-8073-21b80a3a2104%22%7D - Failed to load resource: the server responded with a status of 400 (Bad Request)",
                "timestamp": 1549616097067,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1549616101857,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1549616101857,
                "type": ""
            }
        ],
        "screenShotFile": "images\\007700bc-0036-0017-0017-004f00460090.png",
        "timestamp": 1549616089280,
        "duration": 14872
    },
    {
        "description": "Input Los Angeles and click search|Search location in Eat24",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4068,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.eat24.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.eat24.com/:26:78\n    at https://www.eat24.com/:93:11",
                "timestamp": 1549616105388,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1549616107444,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1549616107444,
                "type": ""
            }
        ],
        "screenShotFile": "images\\00230024-0073-0004-007b-009200130009.png",
        "timestamp": 1549616104866,
        "duration": 4990
    },
    {
        "description": "checks the delivery,pickup,restaurants and catering filter|Working of different filters after the location search",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7656,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.eat24.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.eat24.com/:26:78\n    at https://www.eat24.com/:93:11",
                "timestamp": 1549616138695,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://clickstream.grubhub.com/event.gif?event=%7B%22name%22%3A%22reverse-geocoded-users-ip%22%2C%22platform%22%3A%22umami%20eat24%22%2C%22browserId%22%3A%22o4077aiir4j3rx6701acotp2o1549616141230%22%2C%22sessionId%22%3A%22ht0yqi92lr029ont5rkx9pb7l1549616141229%22%2C%22sessionStartDateTime%22%3A%222019-02-08T08%3A55%3A41.229Z%22%2C%22userId%22%3A%22%22%2C%22referrer%22%3A%22%22%2C%22userAgent%22%3A%22Mozilla/5.0%20%28Windows%20NT%206.1%3B%20Win64%3B%20x64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/71.0.3578.98%20Safari/537.36%22%2C%22protocol%22%3A%22https%3A%22%2C%22hostname%22%3A%22www.eat24.com%22%2C%22pathname%22%3A%22/%22%2C%22queryParams%22%3A%22%22%2C%22view%22%3A%22homepage%20logged%20out%22%2C%22data%22%3A%5B%5D%2C%22sequence%22%3A6%2C%22dateTime%22%3A%222019-02-08T08%3A55%3A43.711Z%22%2C%22timezone%22%3A-330%2C%22v2BrowserId%22%3A%224fdd60ad-2b7f-11e9-93cd-456742eb4800%22%2C%22v2SessionId%22%3A%224fdd87b8-2b7f-11e9-b642-eb3e306ab3f9%22%7D - Failed to load resource: the server responded with a status of 400 (Bad Request)",
                "timestamp": 1549616144043,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1549616147390,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1549616147390,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://clickstream.grubhub.com/event.gif?event=%7B%22name%22%3A%22reverse-geocoded-users-ip%22%2C%22platform%22%3A%22umami%20eat24%22%2C%22browserId%22%3A%22o4077aiir4j3rx6701acotp2o1549616141230%22%2C%22sessionId%22%3A%22ht0yqi92lr029ont5rkx9pb7l1549616141229%22%2C%22sessionStartDateTime%22%3A%222019-02-08T08%3A55%3A41.229Z%22%2C%22userId%22%3A%22%22%2C%22referrer%22%3A%22%22%2C%22userAgent%22%3A%22Mozilla/5.0%20%28Windows%20NT%206.1%3B%20Win64%3B%20x64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/71.0.3578.98%20Safari/537.36%22%2C%22protocol%22%3A%22https%3A%22%2C%22hostname%22%3A%22www.eat24.com%22%2C%22pathname%22%3A%22/%22%2C%22queryParams%22%3A%22%22%2C%22view%22%3A%22homepage%20logged%20out%22%2C%22data%22%3A%5B%5D%2C%22sequence%22%3A6%2C%22dateTime%22%3A%222019-02-08T08%3A55%3A43.711Z%22%2C%22timezone%22%3A-330%2C%22v2BrowserId%22%3A%224fdd60ad-2b7f-11e9-93cd-456742eb4800%22%2C%22v2SessionId%22%3A%224fdd87b8-2b7f-11e9-b642-eb3e306ab3f9%22%7D - Failed to load resource: the server responded with a status of 400 (Bad Request)",
                "timestamp": 1549616158120,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1549616158120,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1549616158120,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.eat24.com/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=20&hideHateos=true&searchMetrics=true&latitude=40.71277618&longitude=-74.00597382&facet=open_now%3Atrue&variationId=default-impressionScoreViewAdjSearchOnlyBuffed-20160607&sortSetId=umamiV2&sponsoredSize=3&countOmittingTimes=true 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.eat24.com/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=20&hideHateos=true&searchMetrics=true&latitude=40.71277618&longitude=-74.00597382&facet=open_now%3Atrue&variationId=default-impressionScoreViewAdjSearchOnlyBuffed-20160607&sortSetId=umamiV2&sponsoredSize=3&countOmittingTimes=true:26:78\n    at https://www.eat24.com/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=20&hideHateos=true&searchMetrics=true&latitude=40.71277618&longitude=-74.00597382&facet=open_now%3Atrue&variationId=default-impressionScoreViewAdjSearchOnlyBuffed-20160607&sortSetId=umamiV2&sponsoredSize=3&countOmittingTimes=true:93:11",
                "timestamp": 1549616158158,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1549616159259,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1549616159259,
                "type": ""
            }
        ],
        "screenShotFile": "images\\00c20035-00ff-008b-0058-000b008700b6.png",
        "timestamp": 1549616136576,
        "duration": 24759
    },
    {
        "description": "checks the Ratings filter|Working of different filters after the location search",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7656,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.eat24.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.eat24.com/:26:78\n    at https://www.eat24.com/:93:11",
                "timestamp": 1549616162473,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1549616164156,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1549616164156,
                "type": ""
            }
        ],
        "screenShotFile": "images\\00fc0016-00a9-0077-00e8-002500d5005c.png",
        "timestamp": 1549616161928,
        "duration": 23720
    },
    {
        "description": "checks the Price filter|Working of different filters after the location search",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7656,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1549616186591,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1549616186591,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.eat24.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.eat24.com/:26:78\n    at https://www.eat24.com/:93:11",
                "timestamp": 1549616186629,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1549616187306,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1549616187306,
                "type": ""
            }
        ],
        "screenShotFile": "images\\00bf0093-0054-004c-002d-00f200000052.png",
        "timestamp": 1549616186083,
        "duration": 22075
    },
    {
        "description": "checks the feature filter|Working of different filters after the location search",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7656,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1549616209007,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1549616209007,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.eat24.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.eat24.com/:26:78\n    at https://www.eat24.com/:93:11",
                "timestamp": 1549616209052,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1549616209850,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1549616209850,
                "type": ""
            }
        ],
        "screenShotFile": "images\\000900e6-0056-0019-0092-0029001200d8.png",
        "timestamp": 1549616208564,
        "duration": 17766
    },
    {
        "description": "checks if delivery time filter is present|Working of different filters after the location search",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7656,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1549616227402,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1549616227402,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.eat24.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.eat24.com/:26:78\n    at https://www.eat24.com/:93:11",
                "timestamp": 1549616227417,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1549616228173,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1549616228173,
                "type": ""
            }
        ],
        "screenShotFile": "images\\00dc0086-00ec-007b-00d8-0066004d00ad.png",
        "timestamp": 1549616226872,
        "duration": 6369
    },
    {
        "description": "validation of all cuisines button|validation the food section menu after searching location",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7012,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.eat24.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.eat24.com/:26:78\n    at https://www.eat24.com/:93:11",
                "timestamp": 1549616269253,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://clickstream.grubhub.com/event.gif?event=%7B%22name%22%3A%22reverse-geocoded-users-ip%22%2C%22platform%22%3A%22umami%20eat24%22%2C%22browserId%22%3A%22anw9dpuox19mdrp92ex96jh9b1549616273746%22%2C%22sessionId%22%3A%22hdczbqzih07ippm2hyf17cdfk1549616273746%22%2C%22sessionStartDateTime%22%3A%222019-02-08T08%3A57%3A53.746Z%22%2C%22userId%22%3A%22%22%2C%22referrer%22%3A%22%22%2C%22userAgent%22%3A%22Mozilla/5.0%20%28Windows%20NT%206.1%3B%20Win64%3B%20x64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/71.0.3578.98%20Safari/537.36%22%2C%22protocol%22%3A%22https%3A%22%2C%22hostname%22%3A%22www.eat24.com%22%2C%22pathname%22%3A%22/%22%2C%22queryParams%22%3A%22%22%2C%22view%22%3A%22homepage%20logged%20out%22%2C%22data%22%3A%5B%5D%2C%22sequence%22%3A6%2C%22dateTime%22%3A%222019-02-08T08%3A57%3A54.388Z%22%2C%22timezone%22%3A-330%2C%22v2BrowserId%22%3A%229ed9ddfc-2b7f-11e9-b41d-bd0312730212%22%2C%22v2SessionId%22%3A%229ed9ddf6-2b7f-11e9-be2b-e1e00d875897%22%7D - Failed to load resource: the server responded with a status of 400 (Bad Request)",
                "timestamp": 1549616275296,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1549616282092,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1549616282092,
                "type": ""
            }
        ],
        "screenShotFile": "images\\00d6003c-0055-00ef-00ab-00af00c600ec.png",
        "timestamp": 1549616266970,
        "duration": 21577
    },
    {
        "description": "validate the silde right and slide left button|validation the food section menu after searching location",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7012,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.eat24.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.eat24.com/:26:78\n    at https://www.eat24.com/:93:11",
                "timestamp": 1549616289680,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1549616292530,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1549616292530,
                "type": ""
            }
        ],
        "screenShotFile": "images\\00f00001-0035-0062-0092-009c002c004f.png",
        "timestamp": 1549616289052,
        "duration": 9178
    },
    {
        "description": "Checks the Eat24 block directs to the homepage|Validation of elements present in the main nav bar after searching for a location",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7444,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.eat24.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.eat24.com/:26:78\n    at https://www.eat24.com/:93:11",
                "timestamp": 1549616322484,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://clickstream.grubhub.com/event.gif?event=%7B%22name%22%3A%22reverse-geocoded-users-ip%22%2C%22platform%22%3A%22umami%20eat24%22%2C%22browserId%22%3A%22iab7xaljfvigqkjegbhrrqtb21549616326765%22%2C%22sessionId%22%3A%22gy0p82iy3iugrhqgexywy6rrp1549616326764%22%2C%22sessionStartDateTime%22%3A%222019-02-08T08%3A58%3A46.764Z%22%2C%22userId%22%3A%22%22%2C%22referrer%22%3A%22%22%2C%22userAgent%22%3A%22Mozilla/5.0%20%28Windows%20NT%206.1%3B%20Win64%3B%20x64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/71.0.3578.98%20Safari/537.36%22%2C%22protocol%22%3A%22https%3A%22%2C%22hostname%22%3A%22www.eat24.com%22%2C%22pathname%22%3A%22/%22%2C%22queryParams%22%3A%22%22%2C%22view%22%3A%22homepage%20logged%20out%22%2C%22data%22%3A%5B%5D%2C%22sequence%22%3A6%2C%22dateTime%22%3A%222019-02-08T08%3A58%3A47.221Z%22%2C%22timezone%22%3A-330%2C%22v2BrowserId%22%3A%22be739e8b-2b7f-11e9-a154-89c8c60f110a%22%2C%22v2SessionId%22%3A%22be73c596-2b7f-11e9-a09d-c338285038f0%22%7D - Failed to load resource: the server responded with a status of 400 (Bad Request)",
                "timestamp": 1549616328304,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1549616333277,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1549616333277,
                "type": ""
            }
        ],
        "screenShotFile": "images\\003a0072-0074-00e7-00a3-008f00db0064.png",
        "timestamp": 1549616320312,
        "duration": 20523
    },
    {
        "description": "validation gps button|Validation of elements present in the main nav bar after searching for a location",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7444,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://clickstream.grubhub.com/event.gif?event=%7B%22name%22%3A%22reverse-geocoded-users-ip%22%2C%22platform%22%3A%22umami%20eat24%22%2C%22browserId%22%3A%22iab7xaljfvigqkjegbhrrqtb21549616326765%22%2C%22sessionId%22%3A%22gy0p82iy3iugrhqgexywy6rrp1549616326764%22%2C%22sessionStartDateTime%22%3A%222019-02-08T08%3A58%3A46.764Z%22%2C%22userId%22%3A%22%22%2C%22referrer%22%3A%22%22%2C%22userAgent%22%3A%22Mozilla/5.0%20%28Windows%20NT%206.1%3B%20Win64%3B%20x64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/71.0.3578.98%20Safari/537.36%22%2C%22protocol%22%3A%22https%3A%22%2C%22hostname%22%3A%22www.eat24.com%22%2C%22pathname%22%3A%22/%22%2C%22queryParams%22%3A%22%22%2C%22view%22%3A%22homepage%20logged%20out%22%2C%22data%22%3A%5B%5D%2C%22sequence%22%3A6%2C%22dateTime%22%3A%222019-02-08T08%3A58%3A47.221Z%22%2C%22timezone%22%3A-330%2C%22v2BrowserId%22%3A%22be739e8b-2b7f-11e9-a154-89c8c60f110a%22%2C%22v2SessionId%22%3A%22be73c596-2b7f-11e9-a09d-c338285038f0%22%7D - Failed to load resource: the server responded with a status of 400 (Bad Request)",
                "timestamp": 1549616342030,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1549616342030,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1549616342030,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.eat24.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.eat24.com/:26:78\n    at https://www.eat24.com/:93:11",
                "timestamp": 1549616342066,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1549616344410,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1549616344410,
                "type": ""
            }
        ],
        "screenShotFile": "images\\00290027-0002-0046-000b-005400f600e8.png",
        "timestamp": 1549616341518,
        "duration": 7894
    },
    {
        "description": "click the clear input location icon and enter another location|Validation of elements present in the main nav bar after searching for a location",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7444,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1549616350330,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1549616350330,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.eat24.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.eat24.com/:26:78\n    at https://www.eat24.com/:93:11",
                "timestamp": 1549616350347,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1549616353089,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1549616353089,
                "type": ""
            }
        ],
        "screenShotFile": "images\\00770030-00db-0065-00ee-00c700510065.png",
        "timestamp": 1549616349852,
        "duration": 7973
    },
    {
        "description": "clicks on the restaurant/dish search and give a input and search|Validation of elements present in the main nav bar after searching for a location",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7444,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1549616358775,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1549616358775,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.eat24.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.eat24.com/:26:78\n    at https://www.eat24.com/:93:11",
                "timestamp": 1549616358810,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1549616359321,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1549616359322,
                "type": ""
            }
        ],
        "screenShotFile": "images\\00af003d-00e4-0054-001e-002300be00d3.png",
        "timestamp": 1549616358248,
        "duration": 7015
    },
    {
        "description": "Validation of Sign In button|Validation of elements present in the main nav bar after searching for a location",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7444,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.eat24.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.eat24.com/:26:78\n    at https://www.eat24.com/:93:11",
                "timestamp": 1549616366923,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1549616367653,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1549616367653,
                "type": ""
            }
        ],
        "screenShotFile": "images\\004d0086-0040-0068-0025-008f00a500d0.png",
        "timestamp": 1549616365772,
        "duration": 6823
    },
    {
        "description": "checks the cart button after searching location|Validation of elements present in the main nav bar after searching for a location",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7444,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1549616373744,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1549616373744,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.eat24.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.eat24.com/:26:78\n    at https://www.eat24.com/:93:11",
                "timestamp": 1549616373782,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1549616374494,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.eat24.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1549616374494,
                "type": ""
            }
        ],
        "screenShotFile": "images\\001e000d-001f-00a2-0020-00e6002f00d0.png",
        "timestamp": 1549616373291,
        "duration": 6908
    },
    {
        "description": "Input New York  and click search|Search location in GrubHub",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 1308,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.109"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.grubhub.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.grubhub.com/:26:78\n    at https://www.grubhub.com/:93:11",
                "timestamp": 1550471417223,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://clickstream.grubhub.com/event.gif?event=%7B%22name%22%3A%22reverse-geocoded-users-ip%22%2C%22platform%22%3A%22umami%20grubhub%22%2C%22browserId%22%3A%222wf4w2yz9xvfr1oubw4dp41zc1550471423301%22%2C%22sessionId%22%3A%22ljdscosdpq160tu9ryjmsr1f61550471423300%22%2C%22sessionStartDateTime%22%3A%222019-02-18T06%3A30%3A23.300Z%22%2C%22userId%22%3A%22%22%2C%22referrer%22%3A%22%22%2C%22userAgent%22%3A%22Mozilla/5.0%20%28Windows%20NT%206.1%3B%20Win64%3B%20x64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/72.0.3626.109%20Safari/537.36%22%2C%22protocol%22%3A%22https%3A%22%2C%22hostname%22%3A%22www.grubhub.com%22%2C%22pathname%22%3A%22/%22%2C%22queryParams%22%3A%22%22%2C%22view%22%3A%22homepage%20logged%20out%22%2C%22data%22%3A%5B%5D%2C%22sequence%22%3A4%2C%22dateTime%22%3A%222019-02-18T06%3A30%3A23.310Z%22%2C%22timezone%22%3A-330%2C%22v2BrowserId%22%3A%22abb47b15-3346-11e9-a43a-bdee174a28b8%22%2C%22v2SessionId%22%3A%22abb4a22b-3346-11e9-bbb2-8902d77a6a9d%22%7D - Failed to load resource: the server responded with a status of 400 (Bad Request)",
                "timestamp": 1550471424839,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471430267,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471430267,
                "type": ""
            }
        ],
        "screenShotFile": "images\\009f0046-006b-00aa-00bb-0054008400bb.png",
        "timestamp": 1550471414579,
        "duration": 20482
    },
    {
        "description": "Input Los Angeles and click search|Search location in GrubHub",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 1308,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.109"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://clickstream.grubhub.com/event.gif?event=%7B%22name%22%3A%22reverse-geocoded-users-ip%22%2C%22platform%22%3A%22umami%20grubhub%22%2C%22browserId%22%3A%222wf4w2yz9xvfr1oubw4dp41zc1550471423301%22%2C%22sessionId%22%3A%22ljdscosdpq160tu9ryjmsr1f61550471423300%22%2C%22sessionStartDateTime%22%3A%222019-02-18T06%3A30%3A23.300Z%22%2C%22userId%22%3A%22%22%2C%22referrer%22%3A%22%22%2C%22userAgent%22%3A%22Mozilla/5.0%20%28Windows%20NT%206.1%3B%20Win64%3B%20x64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/72.0.3626.109%20Safari/537.36%22%2C%22protocol%22%3A%22https%3A%22%2C%22hostname%22%3A%22www.grubhub.com%22%2C%22pathname%22%3A%22/%22%2C%22queryParams%22%3A%22%22%2C%22view%22%3A%22homepage%20logged%20out%22%2C%22data%22%3A%5B%5D%2C%22sequence%22%3A4%2C%22dateTime%22%3A%222019-02-18T06%3A30%3A23.310Z%22%2C%22timezone%22%3A-330%2C%22v2BrowserId%22%3A%22abb47b15-3346-11e9-a43a-bdee174a28b8%22%2C%22v2SessionId%22%3A%22abb4a22b-3346-11e9-bbb2-8902d77a6a9d%22%7D - Failed to load resource: the server responded with a status of 400 (Bad Request)",
                "timestamp": 1550471435973,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471435973,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471435973,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.grubhub.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.grubhub.com/:26:78\n    at https://www.grubhub.com/:93:11",
                "timestamp": 1550471435988,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471439544,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471439544,
                "type": ""
            }
        ],
        "screenShotFile": "images\\00a4007d-00ce-00df-001f-00cc00ed00e6.png",
        "timestamp": 1550471435540,
        "duration": 8975
    },
    {
        "description": "Validation of SignUp using a new user name & password|Validation of SignUp and SignIn",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4912,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.109"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //div[@class=\"s-dropdown\"]//button[@class=\"s-btn mainNavProfile-container u-flex u-flex-align-xs--center\"])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //div[@class=\"s-dropdown\"]//button[@class=\"s-btn mainNavProfile-container u-flex u-flex-align-xs--center\"])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubSignUpIn.js:73:28)\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Validation of SignUp using a new user name & password\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubSignUpIn.js:28:5)\n    at addSpecsToSuite (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubSignUpIn.js:14:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.grubhub.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.grubhub.com/:26:78\n    at https://www.grubhub.com/:93:11",
                "timestamp": 1550471479051,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://clickstream.grubhub.com/event.gif?event=%7B%22name%22%3A%22reverse-geocoded-users-ip%22%2C%22platform%22%3A%22umami%20grubhub%22%2C%22browserId%22%3A%22iu2flnlqykxh3hqv2gttwi5rw1550471484989%22%2C%22sessionId%22%3A%221bbvedvwhb44vkmy16eiuqs9v1550471484989%22%2C%22sessionStartDateTime%22%3A%222019-02-18T06%3A31%3A24.989Z%22%2C%22userId%22%3A%22%22%2C%22referrer%22%3A%22%22%2C%22userAgent%22%3A%22Mozilla/5.0%20%28Windows%20NT%206.1%3B%20Win64%3B%20x64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/72.0.3626.109%20Safari/537.36%22%2C%22protocol%22%3A%22https%3A%22%2C%22hostname%22%3A%22www.grubhub.com%22%2C%22pathname%22%3A%22/%22%2C%22queryParams%22%3A%22%22%2C%22view%22%3A%22homepage%20logged%20out%22%2C%22data%22%3A%5B%5D%2C%22sequence%22%3A4%2C%22dateTime%22%3A%222019-02-18T06%3A31%3A24.997Z%22%2C%22timezone%22%3A-330%2C%22v2BrowserId%22%3A%22d0792b87-3346-11e9-9777-93afb8a23196%22%2C%22v2SessionId%22%3A%22d0795296-3346-11e9-b57e-cfcc6dcdef56%22%7D - Failed to load resource: the server responded with a status of 400 (Bad Request)",
                "timestamp": 1550471486409,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471490227,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471490227,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471497534,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471497534,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471497641,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471497641,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471497642,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471497642,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471497642,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471497642,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471497753,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471497753,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471497754,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471497760,
                "type": ""
            }
        ],
        "screenShotFile": "images\\00a60094-00e6-0051-00a4-001a00a20043.png",
        "timestamp": 1550471476368,
        "duration": 21431
    },
    {
        "description": "checks the sign in feature by using same credentials as used in sign up|Validation of SignUp and SignIn",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4912,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.109"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, a[at-prettyhomepagesignin=\"true\"])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, a[at-prettyhomepagesignin=\"true\"])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubSignUpIn.js:92:33)\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"checks the sign in feature by using same credentials as used in sign up\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubSignUpIn.js:87:5)\n    at addSpecsToSuite (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubSignUpIn.js:14:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://clickstream.grubhub.com/event.gif?event=%7B%22name%22%3A%22reverse-geocoded-users-ip%22%2C%22platform%22%3A%22umami%20grubhub%22%2C%22browserId%22%3A%22iu2flnlqykxh3hqv2gttwi5rw1550471484989%22%2C%22sessionId%22%3A%221bbvedvwhb44vkmy16eiuqs9v1550471484989%22%2C%22sessionStartDateTime%22%3A%222019-02-18T06%3A31%3A24.989Z%22%2C%22userId%22%3A%22%22%2C%22referrer%22%3A%22%22%2C%22userAgent%22%3A%22Mozilla/5.0%20%28Windows%20NT%206.1%3B%20Win64%3B%20x64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/72.0.3626.109%20Safari/537.36%22%2C%22protocol%22%3A%22https%3A%22%2C%22hostname%22%3A%22www.grubhub.com%22%2C%22pathname%22%3A%22/%22%2C%22queryParams%22%3A%22%22%2C%22view%22%3A%22homepage%20logged%20out%22%2C%22data%22%3A%5B%5D%2C%22sequence%22%3A4%2C%22dateTime%22%3A%222019-02-18T06%3A31%3A24.997Z%22%2C%22timezone%22%3A-330%2C%22v2BrowserId%22%3A%22d0792b87-3346-11e9-9777-93afb8a23196%22%2C%22v2SessionId%22%3A%22d0795296-3346-11e9-b57e-cfcc6dcdef56%22%7D - Failed to load resource: the server responded with a status of 400 (Bad Request)",
                "timestamp": 1550471498970,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471498970,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471498970,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471498970,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471498970,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471498970,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471498970,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471498970,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471498970,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471500206,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471500209,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471500213,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471500217,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471500471,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471500476,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471500478,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471500483,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471500484,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471500489,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471500490,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471500496,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471501199,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471501208,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471501208,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471501216,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471501835,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471501842,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471501843,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471501861,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471502275,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471502280,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471502281,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471502288,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471508554,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471508554,
                "type": ""
            }
        ],
        "screenShotFile": "images\\00f20019-0028-005f-0023-004d001e0043.png",
        "timestamp": 1550471498392,
        "duration": 10234
    },
    {
        "description": "Validation of SignUp using a new user name & password|Validation of SignUp and SignIn",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3200,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.109"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.grubhub.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.grubhub.com/:26:78\n    at https://www.grubhub.com/:93:11",
                "timestamp": 1550471531594,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://clickstream.grubhub.com/event.gif?event=%7B%22name%22%3A%22reverse-geocoded-users-ip%22%2C%22platform%22%3A%22umami%20grubhub%22%2C%22browserId%22%3A%22qjy5k1nc4tgdpn7f2uwq2uoxb1550471536404%22%2C%22sessionId%22%3A%2250c57joni3vwdvi46yb2yl2of1550471536404%22%2C%22sessionStartDateTime%22%3A%222019-02-18T06%3A32%3A16.404Z%22%2C%22userId%22%3A%22%22%2C%22referrer%22%3A%22%22%2C%22userAgent%22%3A%22Mozilla/5.0%20%28Windows%20NT%206.1%3B%20Win64%3B%20x64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/72.0.3626.109%20Safari/537.36%22%2C%22protocol%22%3A%22https%3A%22%2C%22hostname%22%3A%22www.grubhub.com%22%2C%22pathname%22%3A%22/%22%2C%22queryParams%22%3A%22%22%2C%22view%22%3A%22homepage%20logged%20out%22%2C%22data%22%3A%5B%5D%2C%22sequence%22%3A4%2C%22dateTime%22%3A%222019-02-18T06%3A32%3A16.412Z%22%2C%22timezone%22%3A-330%2C%22v2BrowserId%22%3A%22ef1ea10a-3346-11e9-80fa-47352f84927d%22%2C%22v2SessionId%22%3A%22ef1ec813-3346-11e9-9df1-2561885996b9%22%7D - Failed to load resource: the server responded with a status of 400 (Bad Request)",
                "timestamp": 1550471537814,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471541759,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471541760,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471548282,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471548282,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471548282,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471548282,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471548282,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471548282,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471548282,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471548283,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471548384,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471548384,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471548384,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471548384,
                "type": ""
            }
        ],
        "screenShotFile": "images\\002e00ff-0022-0083-0078-00ea000a0080.png",
        "timestamp": 1550471528870,
        "duration": 19986
    },
    {
        "description": "checks the sign in feature by using same credentials as used in sign up|Validation of SignUp and SignIn",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3200,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.109"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471549292,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471549297,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471549311,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471549316,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://clickstream.grubhub.com/event.gif?event=%7B%22name%22%3A%22reverse-geocoded-users-ip%22%2C%22platform%22%3A%22umami%20grubhub%22%2C%22browserId%22%3A%22qjy5k1nc4tgdpn7f2uwq2uoxb1550471536404%22%2C%22sessionId%22%3A%2250c57joni3vwdvi46yb2yl2of1550471536404%22%2C%22sessionStartDateTime%22%3A%222019-02-18T06%3A32%3A16.404Z%22%2C%22userId%22%3A%22%22%2C%22referrer%22%3A%22%22%2C%22userAgent%22%3A%22Mozilla/5.0%20%28Windows%20NT%206.1%3B%20Win64%3B%20x64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/72.0.3626.109%20Safari/537.36%22%2C%22protocol%22%3A%22https%3A%22%2C%22hostname%22%3A%22www.grubhub.com%22%2C%22pathname%22%3A%22/%22%2C%22queryParams%22%3A%22%22%2C%22view%22%3A%22homepage%20logged%20out%22%2C%22data%22%3A%5B%5D%2C%22sequence%22%3A4%2C%22dateTime%22%3A%222019-02-18T06%3A32%3A16.412Z%22%2C%22timezone%22%3A-330%2C%22v2BrowserId%22%3A%22ef1ea10a-3346-11e9-80fa-47352f84927d%22%2C%22v2SessionId%22%3A%22ef1ec813-3346-11e9-9df1-2561885996b9%22%7D - Failed to load resource: the server responded with a status of 400 (Bad Request)",
                "timestamp": 1550471550912,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471550912,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471550912,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471550913,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471550913,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471550913,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471550913,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471550913,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471550913,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471550913,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471550913,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.grubhub.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.grubhub.com/:26:78\n    at https://www.grubhub.com/:93:11",
                "timestamp": 1550471550941,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://clickstream.grubhub.com/event.gif?event=%7B%22name%22%3A%22reverse-geocoded-users-ip%22%2C%22platform%22%3A%22umami%20grubhub%22%2C%22browserId%22%3A%22qjy5k1nc4tgdpn7f2uwq2uoxb1550471536404%22%2C%22sessionId%22%3A%2250c57joni3vwdvi46yb2yl2of1550471536404%22%2C%22sessionStartDateTime%22%3A%222019-02-18T06%3A32%3A16.404Z%22%2C%22userId%22%3A%2262266835%22%2C%22referrer%22%3A%22%22%2C%22userAgent%22%3A%22Mozilla/5.0%20%28Windows%20NT%206.1%3B%20Win64%3B%20x64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/72.0.3626.109%20Safari/537.36%22%2C%22protocol%22%3A%22https%3A%22%2C%22hostname%22%3A%22www.grubhub.com%22%2C%22pathname%22%3A%22/%22%2C%22queryParams%22%3A%22%22%2C%22view%22%3A%22homepage%20logged%20out%22%2C%22data%22%3A%5B%5D%2C%22sequence%22%3A9%2C%22dateTime%22%3A%222019-02-18T06%3A32%3A32.296Z%22%2C%22timezone%22%3A-330%2C%22v2BrowserId%22%3A%22ef1ea10a-3346-11e9-80fa-47352f84927d%22%2C%22v2SessionId%22%3A%22ef1ec813-3346-11e9-9df1-2561885996b9%22%7D - Failed to load resource: the server responded with a status of 400 (Bad Request)",
                "timestamp": 1550471553132,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471556139,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471556139,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471560293,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471560293,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471560293,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471560298,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471560298,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471560304,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471560308,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471560316,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=delivery_estimate_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471560535,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471560636,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=6&hideHateos=true&searchMetrics=true&facet=open_now%3Atrue&sorts=default_withCarouselImageBoost&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true - Failed to load resource: the server responded with a status of 422 ()",
                "timestamp": 1550471560636,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1162722 e",
                "timestamp": 1550471560637,
                "type": ""
            }
        ],
        "screenShotFile": "images\\00c000fa-00f9-00ac-0092-00c8003200e2.png",
        "timestamp": 1550471549976,
        "duration": 11139
    },
    {
        "description": "Checks the GrubHub block directs to the homepage|Validation of elements present in the main nav bar after searching for a location",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5376,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.109"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, a[class = \"mainNavBrand-logo\"])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, a[class = \"mainNavBrand-logo\"])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubMainNavBar.js:51:32)\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Checks the GrubHub block directs to the homepage\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubMainNavBar.js:46:5)\n    at addSpecsToSuite (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubMainNavBar.js:16:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.grubhub.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.grubhub.com/:26:78\n    at https://www.grubhub.com/:93:11",
                "timestamp": 1550471589801,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://clickstream.grubhub.com/event.gif?event=%7B%22name%22%3A%22reverse-geocoded-users-ip%22%2C%22platform%22%3A%22umami%20grubhub%22%2C%22browserId%22%3A%227jntbq5zawa8pxvalg4632lrc1550471594916%22%2C%22sessionId%22%3A%22kos4rpx8tzo08blxutrnu9pu01550471594916%22%2C%22sessionStartDateTime%22%3A%222019-02-18T06%3A33%3A14.916Z%22%2C%22userId%22%3A%22%22%2C%22referrer%22%3A%22%22%2C%22userAgent%22%3A%22Mozilla/5.0%20%28Windows%20NT%206.1%3B%20Win64%3B%20x64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/72.0.3626.109%20Safari/537.36%22%2C%22protocol%22%3A%22https%3A%22%2C%22hostname%22%3A%22www.grubhub.com%22%2C%22pathname%22%3A%22/%22%2C%22queryParams%22%3A%22%22%2C%22view%22%3A%22homepage%20logged%20out%22%2C%22data%22%3A%5B%5D%2C%22sequence%22%3A4%2C%22dateTime%22%3A%222019-02-18T06%3A33%3A14.928Z%22%2C%22timezone%22%3A-330%2C%22v2BrowserId%22%3A%2211feda01-3347-11e9-9883-23ac8d6dea3a%22%2C%22v2SessionId%22%3A%2211ff0110-3347-11e9-a513-c50e15daca83%22%7D - Failed to load resource: the server responded with a status of 400 (Bad Request)",
                "timestamp": 1550471596286,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1163311 \"Unhandled Promise rejection:\" \"a.ɵcrt is not a function\" \"; Zone:\" \"\\u003Croot>\" \"; Task:\" \"Promise.then\" \"; Value:\" TypeError: a.ɵcrt is not a function\n    at Module.427 (https://assets.grubhub.com/js/12-10fad99ff97a28aaad25.js:1:100973)\n    at s (https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js:1:528)\n    at https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js:1:895560\n    at t.invoke (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:554922)\n    at e.run (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550090)\n    at https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:561408\n    at t.invokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:555606)\n    at e.runTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550784)\n    at v (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:557858)\n    at e.invokeTask [as invoke] (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:556751)\n    at m (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:567686)\n    at HTMLLinkElement.b (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:567928)\n    at HTMLLinkElement.nrWrapper (https://www.grubhub.com/:276:19679) \"TypeError: a.ɵcrt is not a function\\n    at Module.427 (https://assets.grubhub.com/js/12-10fad99ff97a28aaad25.js:1:100973)\\n    at s (https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js:1:528)\\n    at https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js:1:895560\\n    at t.invoke (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:554922)\\n    at e.run (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550090)\\n    at https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:561408\\n    at t.invokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:555606)\\n    at e.runTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550784)\\n    at v (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:557858)\\n    at e.invokeTask [as invoke] (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:556751)\\n    at m (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:567686)\\n    at HTMLLinkElement.b (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:567928)\\n    at HTMLLinkElement.nrWrapper (https://www.grubhub.com/:276:19679)\"",
                "timestamp": 1550471598798,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js 0:554921 Uncaught TypeError: a.ɵcrt is not a function",
                "timestamp": 1550471598801,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1163311 TypeError: u.ɵcrt is not a function\n    at Module.517 (https://assets.grubhub.com/js/28-10fad99ff97a28aaad25.js:1:1210)\n    at s (https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js:1:528)\n    at https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js:1:895560\n    at t.invoke (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:554922)\n    at e.run (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550090)\n    at https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:561408\n    at t.invokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:555606)\n    at e.runTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550784)\n    at v (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:557858)\n    at nrWrapper (https://www.grubhub.com/:276:19679)",
                "timestamp": 1550471599912,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471600487,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471600487,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1163311 Error: Uncaught (in promise): Error: Cannot find 'SearchModule' in './modules/search/search.module'\nError: Cannot find 'SearchModule' in './modules/search/search.module'\n    at ur (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:60996)\n    at https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:60946\n    at t.invoke (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:554922)\n    at Object.onInvoke (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:46625)\n    at t.invoke (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:554862)\n    at e.run (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550090)\n    at https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:561408\n    at t.invokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:555606)\n    at Object.onInvokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:46537)\n    at t.invokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:555527)\n    at e.runTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550784)\n    at v (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:557858)\n    at e.invokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:556751)\n    at i.useG.invoke (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:556613)\n    at n.args.(anonymous function) (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:571999)\n    at nrWrapper (https://www.grubhub.com/:276:19679)\n    at j (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:560620)\n    at j (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:560178)\n    at https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:561445\n    at t.invokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:555606)\n    at Object.onInvokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:46537)\n    at t.invokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:555527)\n    at e.runTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550784)\n    at v (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:557858)\n    at e.invokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:556751)\n    at i.useG.invoke (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:556613)\n    at n.args.(anonymous function) (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:571999)\n    at nrWrapper (https://www.grubhub.com/:276:19679)",
                "timestamp": 1550471602603,
                "type": ""
            }
        ],
        "screenShotFile": "images\\00e9009c-00fa-005d-0021-006500f1008a.png",
        "timestamp": 1550471587062,
        "duration": 16412
    },
    {
        "description": "validation location button|Validation of elements present in the main nav bar after searching for a location",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5376,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.109"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://clickstream.grubhub.com/event.gif?event=%7B%22name%22%3A%22reverse-geocoded-users-ip%22%2C%22platform%22%3A%22umami%20grubhub%22%2C%22browserId%22%3A%227jntbq5zawa8pxvalg4632lrc1550471594916%22%2C%22sessionId%22%3A%22kos4rpx8tzo08blxutrnu9pu01550471594916%22%2C%22sessionStartDateTime%22%3A%222019-02-18T06%3A33%3A14.916Z%22%2C%22userId%22%3A%22%22%2C%22referrer%22%3A%22%22%2C%22userAgent%22%3A%22Mozilla/5.0%20%28Windows%20NT%206.1%3B%20Win64%3B%20x64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/72.0.3626.109%20Safari/537.36%22%2C%22protocol%22%3A%22https%3A%22%2C%22hostname%22%3A%22www.grubhub.com%22%2C%22pathname%22%3A%22/%22%2C%22queryParams%22%3A%22%22%2C%22view%22%3A%22homepage%20logged%20out%22%2C%22data%22%3A%5B%5D%2C%22sequence%22%3A4%2C%22dateTime%22%3A%222019-02-18T06%3A33%3A14.928Z%22%2C%22timezone%22%3A-330%2C%22v2BrowserId%22%3A%2211feda01-3347-11e9-9883-23ac8d6dea3a%22%2C%22v2SessionId%22%3A%2211ff0110-3347-11e9-a513-c50e15daca83%22%7D - Failed to load resource: the server responded with a status of 400 (Bad Request)",
                "timestamp": 1550471604301,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471604301,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471604301,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.grubhub.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.grubhub.com/:26:78\n    at https://www.grubhub.com/:93:11",
                "timestamp": 1550471604318,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471606800,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471606800,
                "type": ""
            }
        ],
        "screenShotFile": "images\\00ae00a8-00d9-0005-00b2-004d00a000c1.png",
        "timestamp": 1550471603828,
        "duration": 7919
    },
    {
        "description": "clicks on the restaurant/dish search and give a input and search|Validation of elements present in the main nav bar after searching for a location",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5376,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.109"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //div[@class = \"s-input-group s-input-group--hasLeftAddon s-input-group--hasRightAddon s-has-feedback navbar-menu-search s-input-group--transparent-nav\"]//input[@type = \"search\"])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //div[@class = \"s-input-group s-input-group--hasLeftAddon s-input-group--hasRightAddon s-has-feedback navbar-menu-search s-input-group--transparent-nav\"]//input[@type = \"search\"])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubMainNavBar.js:102:30)\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"clicks on the restaurant/dish search and give a input and search\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubMainNavBar.js:97:1)\n    at addSpecsToSuite (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubMainNavBar.js:16:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471612633,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471612633,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.grubhub.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.grubhub.com/:26:78\n    at https://www.grubhub.com/:93:11",
                "timestamp": 1550471612649,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471613408,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471613408,
                "type": ""
            }
        ],
        "screenShotFile": "images\\00140086-0066-0016-0062-00e400fc0024.png",
        "timestamp": 1550471612206,
        "duration": 5981
    },
    {
        "description": "Validation of Sign In button|Validation of elements present in the main nav bar after searching for a location",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5376,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.109"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471619041,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471619041,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.grubhub.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.grubhub.com/:26:78\n    at https://www.grubhub.com/:93:11",
                "timestamp": 1550471619064,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471619662,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471619662,
                "type": ""
            }
        ],
        "screenShotFile": "images\\001a00b3-003b-006b-00d0-00990071002e.png",
        "timestamp": 1550471618621,
        "duration": 7729
    },
    {
        "description": "checks the cart button after searching location|Validation of elements present in the main nav bar after searching for a location",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5376,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.109"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, button[class=\"ghs-toggleCart s-btn s-iconBtn s-iconBtn--small mainNavMenu-cartBtn u-flex-center-center s-btn-tertiary--inverted s-iconBtn--large\"])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, button[class=\"ghs-toggleCart s-btn s-iconBtn s-iconBtn--small mainNavMenu-cartBtn u-flex-center-center s-btn-tertiary--inverted s-iconBtn--large\"])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubMainNavBar.js:141:24)\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"checks the cart button after searching location\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubMainNavBar.js:136:1)\n    at addSpecsToSuite (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubMainNavBar.js:16:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471627218,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471627218,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.grubhub.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.grubhub.com/:26:78\n    at https://www.grubhub.com/:93:11",
                "timestamp": 1550471627254,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471627884,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471627884,
                "type": ""
            }
        ],
        "screenShotFile": "images\\005f0001-00f0-00c8-00a8-00c8005a00c4.png",
        "timestamp": 1550471626787,
        "duration": 5916
    },
    {
        "description": "Checks the GrubHub block directs to the homepage|Validation of elements present in the main nav bar after searching for a location",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5316,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.109"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, a[class = \"mainNavBrand-logo\"])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, a[class = \"mainNavBrand-logo\"])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubMainNavBar.js:51:32)\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Checks the GrubHub block directs to the homepage\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubMainNavBar.js:46:5)\n    at addSpecsToSuite (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubMainNavBar.js:16:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.grubhub.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.grubhub.com/:26:78\n    at https://www.grubhub.com/:93:11",
                "timestamp": 1550471642990,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://clickstream.grubhub.com/event.gif?event=%7B%22name%22%3A%22reverse-geocoded-users-ip%22%2C%22platform%22%3A%22umami%20grubhub%22%2C%22browserId%22%3A%227yrv4awan0b31qztl1ndzek0q1550471647163%22%2C%22sessionId%22%3A%2296j61l4iaalt0arbamam3tpz41550471647162%22%2C%22sessionStartDateTime%22%3A%222019-02-18T06%3A34%3A07.162Z%22%2C%22userId%22%3A%22%22%2C%22referrer%22%3A%22%22%2C%22userAgent%22%3A%22Mozilla/5.0%20%28Windows%20NT%206.1%3B%20Win64%3B%20x64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/72.0.3626.109%20Safari/537.36%22%2C%22protocol%22%3A%22https%3A%22%2C%22hostname%22%3A%22www.grubhub.com%22%2C%22pathname%22%3A%22/%22%2C%22queryParams%22%3A%22%22%2C%22view%22%3A%22homepage%20logged%20out%22%2C%22data%22%3A%5B%5D%2C%22sequence%22%3A4%2C%22dateTime%22%3A%222019-02-18T06%3A34%3A07.169Z%22%2C%22timezone%22%3A-330%2C%22v2BrowserId%22%3A%2231231c74-3347-11e9-b4e0-f10b78a68ae0%22%2C%22v2SessionId%22%3A%2231234380-3347-11e9-9961-6fadc19d8986%22%7D - Failed to load resource: the server responded with a status of 400 (Bad Request)",
                "timestamp": 1550471648714,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1163311 \"Unhandled Promise rejection:\" \"a.ɵcrt is not a function\" \"; Zone:\" \"\\u003Croot>\" \"; Task:\" \"Promise.then\" \"; Value:\" TypeError: a.ɵcrt is not a function\n    at Module.427 (https://assets.grubhub.com/js/12-10fad99ff97a28aaad25.js:1:100973)\n    at s (https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js:1:528)\n    at https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js:1:895560\n    at t.invoke (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:554922)\n    at e.run (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550090)\n    at https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:561408\n    at t.invokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:555606)\n    at e.runTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550784)\n    at v (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:557858)\n    at nrWrapper (https://www.grubhub.com/:276:19679) \"TypeError: a.ɵcrt is not a function\\n    at Module.427 (https://assets.grubhub.com/js/12-10fad99ff97a28aaad25.js:1:100973)\\n    at s (https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js:1:528)\\n    at https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js:1:895560\\n    at t.invoke (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:554922)\\n    at e.run (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550090)\\n    at https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:561408\\n    at t.invokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:555606)\\n    at e.runTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550784)\\n    at v (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:557858)\\n    at nrWrapper (https://www.grubhub.com/:276:19679)\"",
                "timestamp": 1550471650597,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js 0:554921 Uncaught TypeError: a.ɵcrt is not a function",
                "timestamp": 1550471650601,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1163311 TypeError: u.ɵcrt is not a function\n    at Module.517 (https://assets.grubhub.com/js/28-10fad99ff97a28aaad25.js:1:1210)\n    at s (https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js:1:528)\n    at https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js:1:895560\n    at t.invoke (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:554922)\n    at e.run (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550090)\n    at https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:561408\n    at t.invokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:555606)\n    at e.runTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550784)\n    at v (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:557858)\n    at nrWrapper (https://www.grubhub.com/:276:19679)",
                "timestamp": 1550471652243,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471653734,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471653734,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1163311 TypeError: s.ɵcrt is not a function\n    at Module.505 (https://assets.grubhub.com/js/18-10fad99ff97a28aaad25.js:1:132166)\n    at s (https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js:1:528)\n    at https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js:1:895560\n    at t.invoke (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:554922)\n    at e.run (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550090)\n    at https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:561408\n    at t.invokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:555606)\n    at e.runTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550784)\n    at v (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:557858)\n    at nrWrapper (https://www.grubhub.com/:276:19679)",
                "timestamp": 1550471655523,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1163311 Error: Uncaught (in promise): Error: Cannot find 'SearchModule' in './modules/search/search.module'\nError: Cannot find 'SearchModule' in './modules/search/search.module'\n    at ur (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:60996)\n    at https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:60946\n    at t.invoke (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:554922)\n    at Object.onInvoke (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:46625)\n    at t.invoke (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:554862)\n    at e.run (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550090)\n    at https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:561408\n    at t.invokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:555606)\n    at Object.onInvokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:46537)\n    at t.invokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:555527)\n    at e.runTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550784)\n    at v (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:557858)\n    at e.invokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:556751)\n    at i.useG.invoke (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:556613)\n    at n.args.(anonymous function) (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:571999)\n    at nrWrapper (https://www.grubhub.com/:276:19679)\n    at j (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:560620)\n    at j (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:560178)\n    at https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:561445\n    at t.invokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:555606)\n    at Object.onInvokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:46537)\n    at t.invokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:555527)\n    at e.runTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550784)\n    at v (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:557858)\n    at e.invokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:556751)\n    at i.useG.invoke (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:556613)\n    at n.args.(anonymous function) (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:571999)\n    at nrWrapper (https://www.grubhub.com/:276:19679)",
                "timestamp": 1550471655967,
                "type": ""
            }
        ],
        "screenShotFile": "images\\004b003c-00fc-00e7-0074-00c90039008c.png",
        "timestamp": 1550471639122,
        "duration": 17457
    },
    {
        "description": "validation location button|Validation of elements present in the main nav bar after searching for a location",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5316,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.109"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://clickstream.grubhub.com/event.gif?event=%7B%22name%22%3A%22reverse-geocoded-users-ip%22%2C%22platform%22%3A%22umami%20grubhub%22%2C%22browserId%22%3A%227yrv4awan0b31qztl1ndzek0q1550471647163%22%2C%22sessionId%22%3A%2296j61l4iaalt0arbamam3tpz41550471647162%22%2C%22sessionStartDateTime%22%3A%222019-02-18T06%3A34%3A07.162Z%22%2C%22userId%22%3A%22%22%2C%22referrer%22%3A%22%22%2C%22userAgent%22%3A%22Mozilla/5.0%20%28Windows%20NT%206.1%3B%20Win64%3B%20x64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/72.0.3626.109%20Safari/537.36%22%2C%22protocol%22%3A%22https%3A%22%2C%22hostname%22%3A%22www.grubhub.com%22%2C%22pathname%22%3A%22/%22%2C%22queryParams%22%3A%22%22%2C%22view%22%3A%22homepage%20logged%20out%22%2C%22data%22%3A%5B%5D%2C%22sequence%22%3A4%2C%22dateTime%22%3A%222019-02-18T06%3A34%3A07.169Z%22%2C%22timezone%22%3A-330%2C%22v2BrowserId%22%3A%2231231c74-3347-11e9-b4e0-f10b78a68ae0%22%2C%22v2SessionId%22%3A%2231234380-3347-11e9-9961-6fadc19d8986%22%7D - Failed to load resource: the server responded with a status of 400 (Bad Request)",
                "timestamp": 1550471657520,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471657521,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471657521,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.grubhub.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.grubhub.com/:26:78\n    at https://www.grubhub.com/:93:11",
                "timestamp": 1550471657556,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471658462,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471658462,
                "type": ""
            }
        ],
        "screenShotFile": "images\\0097003f-0021-00c0-0015-000100dc0052.png",
        "timestamp": 1550471656958,
        "duration": 14072
    },
    {
        "description": "clicks on the restaurant/dish search and give a input and search|Validation of elements present in the main nav bar after searching for a location",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5316,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.109"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471672239,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471672239,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.grubhub.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.grubhub.com/:26:78\n    at https://www.grubhub.com/:93:11",
                "timestamp": 1550471672261,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471674819,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471674819,
                "type": ""
            }
        ],
        "screenShotFile": "images\\00620049-0099-004b-0012-00ca001000c1.png",
        "timestamp": 1550471671845,
        "duration": 7391
    },
    {
        "description": "Validation of Sign In button|Validation of elements present in the main nav bar after searching for a location",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5316,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.109"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471680271,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471680271,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.grubhub.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.grubhub.com/:26:78\n    at https://www.grubhub.com/:93:11",
                "timestamp": 1550471680302,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471680856,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471680856,
                "type": ""
            }
        ],
        "screenShotFile": "images\\002900f8-00a8-0039-00f7-00ac002600a9.png",
        "timestamp": 1550471679829,
        "duration": 6912
    },
    {
        "description": "checks the cart button after searching location|Validation of elements present in the main nav bar after searching for a location",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5316,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.109"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471687560,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471687560,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.grubhub.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.grubhub.com/:26:78\n    at https://www.grubhub.com/:93:11",
                "timestamp": 1550471687604,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471688366,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471688366,
                "type": ""
            }
        ],
        "screenShotFile": "images\\00e5000b-00ef-0062-00c5-007a002900cd.png",
        "timestamp": 1550471687147,
        "duration": 6686
    },
    {
        "description": "Checks the GrubHub block directs to the homepage|Validation of elements present in the main nav bar after searching for a location",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7024,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.109"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, a[class = \"mainNavBrand-logo\"])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, a[class = \"mainNavBrand-logo\"])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubMainNavBar.js:51:32)\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Checks the GrubHub block directs to the homepage\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubMainNavBar.js:46:5)\n    at addSpecsToSuite (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubMainNavBar.js:16:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.grubhub.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.grubhub.com/:26:78\n    at https://www.grubhub.com/:93:11",
                "timestamp": 1550471744090,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://clickstream.grubhub.com/event.gif?event=%7B%22name%22%3A%22reverse-geocoded-users-ip%22%2C%22platform%22%3A%22umami%20grubhub%22%2C%22browserId%22%3A%22kg7qsjykn6fpuxtvn3vl84xp71550471749086%22%2C%22sessionId%22%3A%22yvpdn1vp389ze9lavzfwybfuc1550471749086%22%2C%22sessionStartDateTime%22%3A%222019-02-18T06%3A35%3A49.086Z%22%2C%22userId%22%3A%22%22%2C%22referrer%22%3A%22%22%2C%22userAgent%22%3A%22Mozilla/5.0%20%28Windows%20NT%206.1%3B%20Win64%3B%20x64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/72.0.3626.109%20Safari/537.36%22%2C%22protocol%22%3A%22https%3A%22%2C%22hostname%22%3A%22www.grubhub.com%22%2C%22pathname%22%3A%22/%22%2C%22queryParams%22%3A%22%22%2C%22view%22%3A%22homepage%20logged%20out%22%2C%22data%22%3A%5B%5D%2C%22sequence%22%3A4%2C%22dateTime%22%3A%222019-02-18T06%3A35%3A49.095Z%22%2C%22timezone%22%3A-330%2C%22v2BrowserId%22%3A%226de37abb-3347-11e9-af09-dbe5eab602e6%22%2C%22v2SessionId%22%3A%226de3a1cf-3347-11e9-8bf0-c3fc48b9f067%22%7D - Failed to load resource: the server responded with a status of 400 (Bad Request)",
                "timestamp": 1550471750537,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1163311 \"Unhandled Promise rejection:\" \"a.ɵcrt is not a function\" \"; Zone:\" \"\\u003Croot>\" \"; Task:\" \"Promise.then\" \"; Value:\" TypeError: a.ɵcrt is not a function\n    at Module.427 (https://assets.grubhub.com/js/12-10fad99ff97a28aaad25.js:1:100973)\n    at s (https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js:1:528)\n    at https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js:1:895560\n    at t.invoke (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:554922)\n    at e.run (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550090)\n    at https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:561408\n    at t.invokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:555606)\n    at e.runTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550784)\n    at v (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:557858)\n    at nrWrapper (https://www.grubhub.com/:276:19679) \"TypeError: a.ɵcrt is not a function\\n    at Module.427 (https://assets.grubhub.com/js/12-10fad99ff97a28aaad25.js:1:100973)\\n    at s (https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js:1:528)\\n    at https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js:1:895560\\n    at t.invoke (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:554922)\\n    at e.run (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550090)\\n    at https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:561408\\n    at t.invokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:555606)\\n    at e.runTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550784)\\n    at v (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:557858)\\n    at nrWrapper (https://www.grubhub.com/:276:19679)\"",
                "timestamp": 1550471752321,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js 0:554921 Uncaught TypeError: a.ɵcrt is not a function",
                "timestamp": 1550471752326,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1163311 TypeError: u.ɵcrt is not a function\n    at Module.517 (https://assets.grubhub.com/js/28-10fad99ff97a28aaad25.js:1:1210)\n    at s (https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js:1:528)\n    at https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js:1:895560\n    at t.invoke (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:554922)\n    at e.run (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550090)\n    at https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:561408\n    at t.invokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:555606)\n    at e.runTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550784)\n    at v (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:557858)\n    at nrWrapper (https://www.grubhub.com/:276:19679)",
                "timestamp": 1550471754070,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471756152,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471756152,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1163311 TypeError: s.ɵcrt is not a function\n    at Module.505 (https://assets.grubhub.com/js/18-10fad99ff97a28aaad25.js:1:132166)\n    at s (https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js:1:528)\n    at https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js:1:895560\n    at t.invoke (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:554922)\n    at e.run (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550090)\n    at https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:561408\n    at t.invokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:555606)\n    at e.runTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550784)\n    at v (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:557858)\n    at nrWrapper (https://www.grubhub.com/:276:19679)",
                "timestamp": 1550471757657,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://assets.grubhub.com/js/main-10fad99ff97a28aaad25.js 0:1163311 Error: Uncaught (in promise): Error: Cannot find 'SearchModule' in './modules/search/search.module'\nError: Cannot find 'SearchModule' in './modules/search/search.module'\n    at ur (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:60996)\n    at https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:60946\n    at t.invoke (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:554922)\n    at Object.onInvoke (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:46625)\n    at t.invoke (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:554862)\n    at e.run (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550090)\n    at https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:561408\n    at t.invokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:555606)\n    at Object.onInvokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:46537)\n    at t.invokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:555527)\n    at e.runTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550784)\n    at v (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:557858)\n    at e.invokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:556751)\n    at i.useG.invoke (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:556613)\n    at n.args.(anonymous function) (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:571999)\n    at nrWrapper (https://www.grubhub.com/:276:19679)\n    at j (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:560620)\n    at j (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:560178)\n    at https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:561445\n    at t.invokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:555606)\n    at Object.onInvokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:46537)\n    at t.invokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:555527)\n    at e.runTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:550784)\n    at v (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:557858)\n    at e.invokeTask (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:556751)\n    at i.useG.invoke (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:556613)\n    at n.args.(anonymous function) (https://assets.grubhub.com/js/vendor-10fad99ff97a28aaad25.js:1:571999)\n    at nrWrapper (https://www.grubhub.com/:276:19679)",
                "timestamp": 1550471758328,
                "type": ""
            }
        ],
        "screenShotFile": "images\\003b0087-0025-008f-0014-009000bf00cf.png",
        "timestamp": 1550471741420,
        "duration": 17717
    },
    {
        "description": "validation location button|Validation of elements present in the main nav bar after searching for a location",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7024,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.109"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://clickstream.grubhub.com/event.gif?event=%7B%22name%22%3A%22reverse-geocoded-users-ip%22%2C%22platform%22%3A%22umami%20grubhub%22%2C%22browserId%22%3A%22kg7qsjykn6fpuxtvn3vl84xp71550471749086%22%2C%22sessionId%22%3A%22yvpdn1vp389ze9lavzfwybfuc1550471749086%22%2C%22sessionStartDateTime%22%3A%222019-02-18T06%3A35%3A49.086Z%22%2C%22userId%22%3A%22%22%2C%22referrer%22%3A%22%22%2C%22userAgent%22%3A%22Mozilla/5.0%20%28Windows%20NT%206.1%3B%20Win64%3B%20x64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/72.0.3626.109%20Safari/537.36%22%2C%22protocol%22%3A%22https%3A%22%2C%22hostname%22%3A%22www.grubhub.com%22%2C%22pathname%22%3A%22/%22%2C%22queryParams%22%3A%22%22%2C%22view%22%3A%22homepage%20logged%20out%22%2C%22data%22%3A%5B%5D%2C%22sequence%22%3A4%2C%22dateTime%22%3A%222019-02-18T06%3A35%3A49.095Z%22%2C%22timezone%22%3A-330%2C%22v2BrowserId%22%3A%226de37abb-3347-11e9-af09-dbe5eab602e6%22%2C%22v2SessionId%22%3A%226de3a1cf-3347-11e9-8bf0-c3fc48b9f067%22%7D - Failed to load resource: the server responded with a status of 400 (Bad Request)",
                "timestamp": 1550471759933,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471759933,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471759933,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.grubhub.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.grubhub.com/:26:78\n    at https://www.grubhub.com/:93:11",
                "timestamp": 1550471759978,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471766331,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471766331,
                "type": ""
            }
        ],
        "screenShotFile": "images\\008b0048-002d-0017-006f-00e8009a000e.png",
        "timestamp": 1550471759503,
        "duration": 29209
    },
    {
        "description": "clicks on the restaurant/dish search and give a input and search|Validation of elements present in the main nav bar after searching for a location",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7024,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.109"
        },
        "message": [
            "Failed: unknown error: Element <input at-search-autocomplete-input=\"true\" placeholder=\"Pizza, sushi, chinese\" type=\"search\" autocomplete=\"off\" class=\"s-form-control ghs-searchInput input-overflow\" autocapitalize=\"off\" autocorrect=\"off\" role=\"combobox\" aria-multiline=\"false\" aria-expanded=\"false\" aria-autocomplete=\"both\"> is not clickable at point (933, 30). Other element would receive the click: <div class=\"navi-modal-content\">...</div>\n  (Session info: chrome=72.0.3626.109)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 6.1.7601 SP1 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <input at-search-autocomplete-input=\"true\" placeholder=\"Pizza, sushi, chinese\" type=\"search\" autocomplete=\"off\" class=\"s-form-control ghs-searchInput input-overflow\" autocapitalize=\"off\" autocorrect=\"off\" role=\"combobox\" aria-multiline=\"false\" aria-expanded=\"false\" aria-autocomplete=\"both\"> is not clickable at point (933, 30). Other element would receive the click: <div class=\"navi-modal-content\">...</div>\n  (Session info: chrome=72.0.3626.109)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 6.1.7601 SP1 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubMainNavBar.js:102:30)\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"clicks on the restaurant/dish search and give a input and search\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubMainNavBar.js:97:1)\n    at addSpecsToSuite (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubMainNavBar.js:16:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471790088,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471790088,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.grubhub.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.grubhub.com/:26:78\n    at https://www.grubhub.com/:93:11",
                "timestamp": 1550471790105,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471795433,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471795433,
                "type": ""
            }
        ],
        "screenShotFile": "images\\005900b7-00ae-0019-002a-00aa00150081.png",
        "timestamp": 1550471789575,
        "duration": 9737
    },
    {
        "description": "Validation of Sign In button|Validation of elements present in the main nav bar after searching for a location",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7024,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.109"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471800385,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471800386,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.grubhub.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.grubhub.com/:26:78\n    at https://www.grubhub.com/:93:11",
                "timestamp": 1550471800406,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471801479,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471801479,
                "type": ""
            }
        ],
        "screenShotFile": "images\\00a900aa-0056-0060-0073-00b6003c009d.png",
        "timestamp": 1550471799991,
        "duration": 26681
    },
    {
        "description": "checks the cart button after searching location|Validation of elements present in the main nav bar after searching for a location",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7024,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.109"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471828089,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471828089,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.grubhub.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.grubhub.com/:26:78\n    at https://www.grubhub.com/:93:11",
                "timestamp": 1550471828137,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471830110,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471830110,
                "type": ""
            }
        ],
        "screenShotFile": "images\\00d300d9-00de-0066-0082-00f400170078.png",
        "timestamp": 1550471827623,
        "duration": 7076
    },
    {
        "description": "checks the delivery,pickup,restaurants and catering filter|Working of different filters after the location search",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2436,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.109"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.",
            "Failed: script timeout: result was not received in 30 seconds\n  (Session info: chrome=72.0.3626.109)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 6.1.7601 SP1 x86_64)"
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:436:11)\n    at tryOnTimeout (timers.js:300:5)\n    at listOnTimeout (timers.js:263:5)\n    at Timer.processTimers (timers.js:223:10)",
            "ScriptTimeoutError: script timeout: result was not received in 30 seconds\n  (Session info: chrome=72.0.3626.109)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 6.1.7601 SP1 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Protractor.waitForAngular() - Locator: by.cssContainingText(\"span.h6\", \"Restaurants\")\n    at Driver.schedule (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at ProtractorBrowser.executeAsyncScript_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:425:28)\n    at angularAppRoot.then (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:456:33)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubFiltersInSearch.js:57:41)\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"checks the delivery,pickup,restaurants and catering filter\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubFiltersInSearch.js:42:8)\n    at addSpecsToSuite (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubFiltersInSearch.js:14:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.grubhub.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.grubhub.com/:26:78\n    at https://www.grubhub.com/:93:11",
                "timestamp": 1550471882888,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471888763,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471888763,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://clickstream.grubhub.com/event.gif?event=%7B%22name%22%3A%22reverse-geocoded-users-ip%22%2C%22platform%22%3A%22umami%20grubhub%22%2C%22browserId%22%3A%22ng7sutmjbgq7k8gpde7tycxyb1550471888455%22%2C%22sessionId%22%3A%222dqiye0wu1ex4lrbvrkh7izp31550471888454%22%2C%22sessionStartDateTime%22%3A%222019-02-18T06%3A38%3A08.454Z%22%2C%22userId%22%3A%22%22%2C%22referrer%22%3A%22%22%2C%22userAgent%22%3A%22Mozilla/5.0%20%28Windows%20NT%206.1%3B%20Win64%3B%20x64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/72.0.3626.109%20Safari/537.36%22%2C%22protocol%22%3A%22https%3A%22%2C%22hostname%22%3A%22www.grubhub.com%22%2C%22pathname%22%3A%22/%22%2C%22queryParams%22%3A%22%22%2C%22view%22%3A%22homepage%20logged%20out%22%2C%22data%22%3A%5B%5D%2C%22sequence%22%3A9%2C%22dateTime%22%3A%222019-02-18T06%3A38%3A10.573Z%22%2C%22timezone%22%3A-330%2C%22v2BrowserId%22%3A%22c0f495e5-3347-11e9-9b58-d13a5843ae6e%22%2C%22v2SessionId%22%3A%22c0f5593f-3347-11e9-8bd7-ef013262e004%22%7D - Failed to load resource: the server responded with a status of 400 (Bad Request)",
                "timestamp": 1550471891712,
                "type": ""
            }
        ],
        "screenShotFile": "images\\0032007b-00aa-0064-000d-002500da003c.png",
        "timestamp": 1550471880186,
        "duration": 74424
    },
    {
        "description": "checks the Ratings filter|Working of different filters after the location search",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2436,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.109"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.",
            "Failed: script timeout: result was not received in 30 seconds\n  (Session info: chrome=72.0.3626.109)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 6.1.7601 SP1 x86_64)"
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:436:11)\n    at tryOnTimeout (timers.js:300:5)\n    at listOnTimeout (timers.js:263:5)\n    at Timer.processTimers (timers.js:223:10)",
            "ScriptTimeoutError: script timeout: result was not received in 30 seconds\n  (Session info: chrome=72.0.3626.109)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 6.1.7601 SP1 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Protractor.waitForAngular() - Locator: By(css selector, button[title = '2 And Above'])\n    at Driver.schedule (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at ProtractorBrowser.executeAsyncScript_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:425:28)\n    at angularAppRoot.then (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:456:33)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubFiltersInSearch.js:81:31)\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"checks the Ratings filter\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubFiltersInSearch.js:74:5)\n    at addSpecsToSuite (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\mindfire\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (E:\\GitHub Documents\\Eat24\\Test Cases\\GrubFiltersInSearch.js:14:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471956358,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471956358,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://clickstream.grubhub.com/event.gif?event=%7B%22name%22%3A%22reverse-geocoded-users-ip%22%2C%22platform%22%3A%22umami%20grubhub%22%2C%22browserId%22%3A%22ng7sutmjbgq7k8gpde7tycxyb1550471888455%22%2C%22sessionId%22%3A%222dqiye0wu1ex4lrbvrkh7izp31550471888454%22%2C%22sessionStartDateTime%22%3A%222019-02-18T06%3A38%3A08.454Z%22%2C%22userId%22%3A%22%22%2C%22referrer%22%3A%22%22%2C%22userAgent%22%3A%22Mozilla/5.0%20%28Windows%20NT%206.1%3B%20Win64%3B%20x64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/72.0.3626.109%20Safari/537.36%22%2C%22protocol%22%3A%22https%3A%22%2C%22hostname%22%3A%22www.grubhub.com%22%2C%22pathname%22%3A%22/%22%2C%22queryParams%22%3A%22%22%2C%22view%22%3A%22homepage%20logged%20out%22%2C%22data%22%3A%5B%5D%2C%22sequence%22%3A9%2C%22dateTime%22%3A%222019-02-18T06%3A38%3A10.573Z%22%2C%22timezone%22%3A-330%2C%22v2BrowserId%22%3A%22c0f495e5-3347-11e9-9b58-d13a5843ae6e%22%2C%22v2SessionId%22%3A%22c0f5593f-3347-11e9-8bd7-ef013262e004%22%7D - Failed to load resource: the server responded with a status of 400 (Bad Request)",
                "timestamp": 1550471956358,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.grubhub.com/ 28:24 TypeError: Cannot read property 'email' of null\n    at https://www.grubhub.com/:26:78\n    at https://www.grubhub.com/:93:11",
                "timestamp": 1550471956408,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'start_url' ignored, should be same origin as document.",
                "timestamp": 1550471959355,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://assets.grubhub.com/manifest.json - Manifest: property 'scope' ignored, should be same origin as document.",
                "timestamp": 1550471959355,
                "type": ""
            }
        ],
        "screenShotFile": "images\\001400e5-0041-0057-0048-008c00300073.png",
        "timestamp": 1550471955831,
        "duration": 56843
    }
];

    this.sortSpecs = function () {
        this.results = results.sort(function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) return -1;else if (a.sessionId > b.sessionId) return 1;

    if (a.timestamp < b.timestamp) return -1;else if (a.timestamp > b.timestamp) return 1;

    return 0;
});
    };

    this.loadResultsViaAjax = function () {

        $http({
            url: './combined.json',
            method: 'GET'
        }).then(function (response) {
                var data = null;
                if (response && response.data) {
                    if (typeof response.data === 'object') {
                        data = response.data;
                    } else if (response.data[0] === '"') { //detect super escaped file (from circular json)
                        data = CircularJSON.parse(response.data); //the file is escaped in a weird way (with circular json)
                    }
                    else
                    {
                        data = JSON.parse(response.data);
                    }
                }
                if (data) {
                    results = data;
                    that.sortSpecs();
                }
            },
            function (error) {
                console.error(error);
            });
    };


    if (clientDefaults.useAjax) {
        this.loadResultsViaAjax();
    } else {
        this.sortSpecs();
    }


});

app.filter('bySearchSettings', function () {
    return function (items, searchSettings) {
        var filtered = [];
        if (!items) {
            return filtered; // to avoid crashing in where results might be empty
        }
        var prevItem = null;

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            item.displaySpecName = false;

            var isHit = false; //is set to true if any of the search criteria matched
            countLogMessages(item); // modifies item contents

            var hasLog = searchSettings.withLog && item.browserLogs && item.browserLogs.length > 0;
            if (searchSettings.description === '' ||
                (item.description && item.description.toLowerCase().indexOf(searchSettings.description.toLowerCase()) > -1)) {

                if (searchSettings.passed && item.passed || hasLog) {
                    isHit = true;
                } else if (searchSettings.failed && !item.passed && !item.pending || hasLog) {
                    isHit = true;
                } else if (searchSettings.pending && item.pending || hasLog) {
                    isHit = true;
                }
            }
            if (isHit) {
                checkIfShouldDisplaySpecName(prevItem, item);

                filtered.push(item);
                prevItem = item;
            }
        }

        return filtered;
    };
});

