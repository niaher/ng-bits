angular.module("ngBits.breeze", ["breeze.angular"])
	.run(['breeze', function () {
		// Ensure that breeze is minimally configured by loading it when app runs.
		// The configuration is located inside breeze.angular module.
	}])
	.factory("makeDataContext", ["breeze", "$q", function (breeze, $q) {
		return function (url, initializer) {
			var metadataInitialized = false;

			function context() {
				this.manager = new breeze.EntityManager(url);

				var readyDeferred = $q.defer();
				this.whenReady = readyDeferred.promise;

				var self = this;
				this.manager.metadataStore.metadataFetched.subscribe(function () {
					if (!metadataInitialized) {
						metadataInitialized = true;
						(initializer || window.angular.noop)(self);

						readyDeferred.resolve();
					}
				});

				this.manager.fetchMetadata()
					.catch(function (error) {
						readyDeferred.reject(error);
					});

				this.getPrimitives = function (obj) {
					var result = {};
					for (var name in obj) {
						var propertyValue = obj[name];
						if (obj.hasOwnProperty(name) && typeof (propertyValue) != "object") {
							result[name] = propertyValue;
						}
					}

					return result;
				};
			}

			context.prototype.query = function (entitySet) {
				return new breeze.EntityQuery(entitySet).using(this.manager);
			};

			context.prototype.logValidationErrors = function () {
				var changes = this.manager.getChanges();
				for (var i = 0; i < changes.length; ++i) {
					var errors = changes[i].entityAspect.getValidationErrors();
					if (errors.length > 0) {
						console.warn(errors);
					}
				}
			};

			context.prototype.Predicate = breeze.Predicate;

			return new context();
		};
	}]);
