angular.module("ngBits.controllers", [])
	.factory("makeItemController", ["_", "$log", function (_, $log) {
		function getEventName(namespace, eventName) {
			return (namespace.length > 0 ? namespace + ":" : "") + eventName;
		}

		function getSettings($scope, dataContext, item, userSettings) {
			return angular.extend({
				eventNamespace: "",
				exitUrl: "/",
				getQuery: function () {
					return dataContext.query(item.entityType.defaultResourceName).where("Id", "==", item.Id);
				},
				getName: function (i) {
					return "item #" + i.Id;
				},
				"delete": function (i) {
					i.entityAspect.setDeleted();
				},
				error: _.bind($log.error, console),
				success: _.bind($log.log, console),
				publish: _.bind($scope.$emit, $scope),
				getDetailsUrl: function (i) {
					return "/Details/" + i.Id;
				}
			}, userSettings);
		}

		return function ($scope, dataContext, item, $location, userSettings) {
			$scope.item = item;
			$scope.mode = item.entityAspect.entityState.isAdded() ? "edit" : "read";

			var settings = getSettings($scope, dataContext, item, userSettings);

			$scope.cancel = function () {
				var itemEntityState = item.entityAspect.entityState;

				if (itemEntityState.isAdded() || itemEntityState.isDetached()) {
					$location.path(settings.exitUrl);
				} else {
					dataContext.detachEntity(item);

					var query = settings.getQuery();

					query.execute().then(function (data) {
						$scope.$apply(function () {
							angular.extend(item, data.results[0]);
							$scope.mode = "read";
						});
					});
				}
			};

			$scope.delete = function () {
				var sure = confirm("You are about to delete " + settings.getName(item) + ". This action is irreversable. Are you sure you want to proceed?");

				if (sure) {
					settings.delete(item);

					dataContext.saveChanges().then(function () {
						var eventName = getEventName(settings.eventNamespace, item.entityType.shortName + ":Deleted");
						settings.publish(eventName, item);

						$scope.$apply(function () {
							$location.path(settings.exitUrl);
						});
					});
				}
			};

			$scope.edit = function () {
				$scope.mode = "edit";
			};

			$scope.save = function () {
				var validationErrors = item.entityAspect.getValidationErrors();

				var change = item.entityAspect.entityState.name;

				if (validationErrors.length) {
					settings.error(validationErrors[0].errorMessage);
				} else {
					dataContext.saveChanges().then(function () {
						var eventName = getEventName(settings.eventNamespace, item.entityType.shortName + ":" + change);

						settings.publish(eventName, item);
						settings.success("Changes saved");

						if (change == "Added") {
							$location.path(settings.getDetailsUrl(item));
						} else {
							$scope.mode = "read";
						}

						$scope.$apply();
					});

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
						return $location.search(value);
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

		return function ($scope, dataContext, options) {
			$scope.items = [];

			$scope.pagination = {
				currentPage: []
			};

			var routeParameters = getRouteParameterStore(options.useLocation);

			$scope.query = {
				pageSize: parseInt(routeParameters.get("s"), 10) || 10,
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

			$scope.reading = false;

			$scope.read = function (page) {
				if (!$scope.reading) {
					$scope.reading = true;

					if (angular.isUndefined(page) || page == null) {
						page = $scope.pagination.currentPage;
					}

					$scope.pagination.currentPage = page;

					var query = dataContext.query(options.entitySet)
						.orderBy(options.orderBy)
						.skip((page - 1) * parseInt($scope.query.pageSize, 10))
						.take(parseInt($scope.query.pageSize, 10))
						.inlineCount(true);

					if (options.adjustQuery) {
						query = options.adjustQuery(query);
					}

					if ($scope.query.search.length) {
						query = query.where(options.searchProperty, "contains", $scope.query.search);
					}

					query.execute()
						.then(function (data) {
							$scope.items = data.results;
							$scope.reading = false;

							$scope.$apply(function () {
								routeParameters.set({ page: page, q: $scope.query.search, s: $scope.query.pageSize });
								$scope.totalItems = data.inlineCount;
							});
						});
				}
			};

			$scope.read();
		}
	}]);