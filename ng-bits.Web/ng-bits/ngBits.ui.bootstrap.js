angular.module("ngBits.ui.bootstrap", ["ui.bootstrap"])
	.directive("typeahead", [function () {
		return {
			priority: 999,
			restrict: "A",
			compile: function () {
				return {
					pre: function (scope, iElement, iAttrs) {
						iAttrs.typeaheadLoading = "isLoading";
					},
					post: function(scope, iElement) {
						scope.$watch("isLoading", function (newValue) {
							if (newValue) {
								iElement.addClass("loading");
							} else {
								iElement.removeClass("loading");
							}
						});
					}
				};
			}
		};
	}]);
