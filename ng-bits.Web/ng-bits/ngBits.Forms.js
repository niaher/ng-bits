﻿angular.module("ngBits.form")
	.directive("formRow", [function () {
		return {
			restrict: "E",
			transclude: true,
			replace: true,
			templateUrl: "Templates/UNOPS.FormRow.html",
			scope: true,
			link: function ($scope, $element, $attrs) {
				$scope.label = $attrs['label'];
				$scope.addon = $attrs['addon'];
			},
			controller: ["$scope", function ($scope) {
				this.setValidity = function (isValid) {
					$scope.isValid = isValid;
				};

				// Pristine forms are valid.
				this.setValidity(true);
			}]
		};
	}])
	.directive("formRowInput", [function () {
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
			require: "^formRow",
			scope: true,
			link: function ($scope, $element, $attrs, parentController) {
				var modelPath = $attrs["formRowInput"] || $attrs["ngModel"];
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
