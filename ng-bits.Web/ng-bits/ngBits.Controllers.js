if (!Function.prototype.bind) {
	Function.prototype.bind = function (oThis) {
		if (typeof this !== 'function') {
			// closest thing possible to the ECMAScript 5
			// internal IsCallable function
			throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
		}

		var aArgs = Array.prototype.slice.call(arguments, 1),
			fToBind = this,
			noop = function () { },
			fBound = function () {
				return fToBind.apply(this instanceof noop && oThis
					   ? this
					   : oThis,
					   aArgs.concat(Array.prototype.slice.call(arguments)));
			};

		noop.prototype = this.prototype;
		fBound.prototype = new noop();

		return fBound;
	};
}

angular.module("ngBits.controllers", [])
	.factory("makeItemController", ["$log", "$location", function ($log, $location) {
		function getEventName(namespace, eventName) {
			return (namespace.length > 0 ? namespace + ":" : "") + eventName;
		}

		function getSettings($scope, dataContext, item, userSettings) {
			var crudFn = function (i, cb) {
				$log.log(i);
				cb();
			};

			return angular.extend({
				eventNamespace: "",
				exitUrl: "/",
				getQuery: function () {
					return dataContext.query(item.entityType.defaultResourceName).where("Id", "==", item.Id);
				},
				getName: function (i) {
					return "item #" + i.Id;
				},
				"delete": crudFn,
				add: crudFn,
				update: crudFn,
				error: $log.error,
				success: $log.log,
				publish: $scope.$emit.bind($scope),
				getDetailsUrl: function (i) {
					return "/Details/" + i.Id;
				},
				keys: ["Id"]
			}, userSettings);
		}

		return function ($scope, dataContext, item, userSettings) {
			$scope.item = item;
			$scope.mode = item.entityAspect.entityState.isAdded() ? "edit" : "read";

			var settings = getSettings($scope, dataContext, item, userSettings);

			$scope.cancel = function () {
				var itemEntityState = item.entityAspect.entityState;

				if (itemEntityState.isAdded() || itemEntityState.isDetached()) {
					$location.path(settings.exitUrl);
				} else {
					dataContext.manager.detachEntity(item);

					var query = settings.getQuery();

					query.execute().then(function (data) {
						$scope.$evalAsync(function () {
							angular.extend(item, data.results[0]);
							$scope.mode = "read";
						});
					});
				}
			};

			$scope["delete"] = function () {
				var sure = confirm("You are about to delete " + settings.getName(item) + ". This action is irreversable. Are you sure you want to proceed?");

				if (sure) {
					settings["delete"](item._backingStore, function () {
						var eventName = getEventName(settings.eventNamespace, item.entityType.shortName + ":Deleted");
						settings.publish(eventName, item);

						$scope.$evalAsync(function () {
							$location.path(settings.exitUrl);
						});
					});
				}
			};

			$scope.edit = function () {
				$scope.mode = "edit";
			};

			$scope.save = function () {
				// Event for the input controls to listen to.
				$scope.$broadcast("form:submit");

				var validationErrors = item.entityAspect.getValidationErrors();

				var change = item.entityAspect.entityState.name;

				if (validationErrors.length) {
					settings.error(validationErrors[0].errorMessage);
				} else {
					var callback = function () {
						$scope.$evalAsync(function () {
							item.entityAspect.acceptChanges();

							var eventName = getEventName(settings.eventNamespace, item.entityType.shortName + ":" + change);

							settings.publish(eventName, item);
							settings.success("Changes saved");

							if (change == "Added") {
								$location.path(settings.getDetailsUrl(item));
							} else {
								$scope.mode = "read";
							}
						});
					};

					if (change == "Added") {
						settings.add(item._backingStore, function (result) {
							for (var i = 0; i < settings.keys.length; ++i) {
								var propertyName = settings.keys[i];
								item[propertyName] = result[propertyName];
							}

							callback();
						});
					} else {
						settings.update(item._backingStore, callback);
					}
				}
			};

			$scope.$on("$destroy", function () {
				if (!item.entityAspect.entityState.isDetached()) {
					item.entityAspect.rejectChanges();
				}
			});
		};
	}])
	.factory("makePagedController", ["$location", function ($location) {
		function getRouteParameterStore(useLocation) {
			if (useLocation || angular.isUndefined(useLocation)) {
				return {
					get: function (key) {
						return $location.search()[key];
					},
					set: function (value) {
						var current = $location.search();
						var newValue = angular.extend(current, value);
						return $location.search(newValue);
					},
				};
			} else {
				return {
					value: {},
					get: function (key) {
						return this.value[key];
					},
					set: function (value) {
						return this.value = value;
					},
				};
			}
		}

		return function ($scope, options) {
			$scope.items = [];

			$scope.pagination = {
				currentPage: []
			};

			var routeParameters = getRouteParameterStore(options.useLocation);

			$scope.query = {
				pageSize: parseInt(routeParameters.get("s"), 10) || options.pageSize || 10,
				search: routeParameters.get("q") || ""
			};

			$scope.pagination.currentPage = parseInt(routeParameters.get("page"), 10) || 1;

			// Set the total items to make sure it fits the currentPage. This is needed to make
			// sure that the pager renders correctly and doesn't reset currentPage to 1.
			$scope.totalItems = $scope.pagination.currentPage * $scope.query.pageSize;

			$scope.$watch("pagination.currentPage", function (newValue, oldValue) {
				if (newValue !== oldValue) {
					$scope.read(newValue);
				}
			});

			$scope.$watch("query.pageSize", function (newValue, oldValue) {
				if (newValue !== oldValue) {
					$scope.read(1);
				}
			});

			function render(items, inlineCount, page) {
				$scope.$evalAsync(function () {
					$scope.items = items;
					routeParameters.set({ page: page, q: $scope.query.search, s: $scope.query.pageSize });
					$scope.totalItems = inlineCount;
					$scope.reading = false;
				});
			}

			$scope.reading = false;

			$scope.read = function (page) {
				if (!$scope.reading) {
					$scope.reading = true;

					if (angular.isUndefined(page) || page == null) {
						page = $scope.pagination.currentPage;
					}

					$scope.pagination.currentPage = page;
					var pageSize = parseInt($scope.query.pageSize, 10);

					options.read($scope.query.search, page, pageSize).then(function (data) {
						render(data.results, data.inlineCount, page);
					});
				}
			};

			$scope.read();
		}
	}]);
