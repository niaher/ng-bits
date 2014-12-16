// Uses ngProgress (https://github.com/VictorBjelkholm/ngProgress)
// to show loading indicator for each ajax/full-postback request.

angular.module("ngBits.progress", [])
	.config(["$httpProvider", function ($httpProvider) {$httpProvider.interceptors.push(["$injector", function ($injector) {
		var completeProgress, getNgProgress, ngProgress, working;
		working = false;

		getNgProgress = function () {
			ngProgress = ngProgress || $injector.get("ngProgress");
			ngProgress.color("rgb(197, 30, 43)");
			return ngProgress;
		};

		completeProgress = function () {
			if (working) {
				var ngProgressInstance = getNgProgress();
				ngProgressInstance.complete();
				working = false;
			}
		};

		return {
			request: function (request) {
				if (!working) {
					var ngProgressInstance = getNgProgress();
					ngProgressInstance.reset();
					ngProgressInstance.start();
					working = true;
				}
				return request;
			},
			requestError: function (request) {
				completeProgress();
				return request;
			},
			response: function (response) {
				completeProgress();
				return response;
			},
			responseError: function (response) {
				completeProgress();
				return response;
			}
		}
	}]);
}]);
