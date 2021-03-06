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
			}

			context.prototype.getPrimitives = function (obj) {
				var result = {};
				for (var name in obj) {
					var propertyValue = obj[name];

					if (propertyValue && propertyValue.complexAspect) {
						result[name] = context.prototype.getPrimitives(propertyValue._backingStore);
						continue;
					}

					if (obj.hasOwnProperty(name)) {
						if (typeof (propertyValue) != "object" ||
							angular.isDate(propertyValue)) {
							result[name] = propertyValue;
						}
					}
				}

				return result;
			};

			context.prototype.addUnmappedProperty = function (entityType, propertyName) {
				this.manager.metadataStore.getEntityType(entityType).addProperty(new breeze.DataProperty({
					name: propertyName,
					nameOnServer: propertyName,
					isUnmapped: true
				}));
			};

			context.prototype.getLookupFn = function (property, enums) {
				return function () {
					var value = this[property];
					if (value) {
						return enums[value];
					}

					return null;
				};
			};

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
