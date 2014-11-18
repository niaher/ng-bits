angular.module("ngBits.breeze.directives", ["ngBits.breeze"])
	.directive("myEntities", ["dataContext", function (dataContext) {
		return {
			scope: true,
			restrict: "A",
			controller: ["$scope", function ($scope) {
				$scope.items = [];
			}],
			link: function ($scope, $element, $attrs) {
				dataContext.query($attrs.entities)
					.execute()
					.then(function (data) {
						$scope.$evalAsync(function () {
							$scope.items = data.results;
						});
					});
			}
		};
	}])
