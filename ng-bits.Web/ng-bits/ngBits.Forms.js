angular.module("ngBits.forms", [])
	.directive("myFormRow", [function () {
		return {
			restrict: "A",
			scope: true,
			controller: ["$scope", "$element", function ($scope, $element) {
				this.setValidity = function (isValid) {
					$scope.isValid = isValid;

					if (isValid) {
						$element.removeClass("has-error");
					} else {
						$element.addClass("has-error");
					}
				};

				// Pristine forms are valid.
				this.setValidity(true);
			}]
		};
	}])
	.directive("myFormRowInput", [function () {
		function parsePath(path) {
			var result = {};

			// Look for ',' syntax
			var paths = path.split(',');
			var pPath = paths.pop(); // after ','
			var ePath = paths.pop(); // before ','

			if (ePath) {
				result.entityPath = ePath.trim();
				result.propertyPath = pPath;
			} else {
				// Didn't use ',' syntax and didn't specify entityPath in model.
				// Therefore entire path spec must be in pPath; parse it.
				var splitByDot = pPath.split('.');
				result.propertyPath = splitByDot.pop();
				result.entityPath = splitByDot.join('.');
			}

			return result;
		}

		return {
			require: "^myFormRow",
			scope: true,
			link: function ($scope, $element, $attrs, parentController) {
				var modelPath = $attrs["myFormRowInput"] || $attrs["ngModel"];
				var path = parsePath(modelPath);

				var entity = $scope.$eval(path.entityPath);
				var entityAspect = entity.entityAspect;
				var errors = [];

				$scope.$watch(function () {
					errors = entityAspect.getValidationErrors(path.propertyPath);
					return errors.length;
				}, function (newValue) {
					parentController.setValidity(newValue == 0);
				});
			}
		};
	}]);
