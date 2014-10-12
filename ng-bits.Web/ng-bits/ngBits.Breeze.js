angular.module("ngBits.breeze", ["breeze.angular"])
	.run(['breeze', function () {
		// Ensure that breeze is minimally configured by loading it when app runs.
		// The configuration is located inside breeze.angular module.
	}])
	.factory("makeDataContext", ["breeze", function (breeze) {
		return function (url, initializer) {
			var metadataInitialized = false;

			function context() {
				this.manager = new breeze.EntityManager(url);

				var self = this;
				this.manager.metadataStore.metadataFetched.subscribe(function () {
					if (!metadataInitialized) {
						metadataInitialized = true;
						(initializer || window.angular.noop).call(self);
					}
				});
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