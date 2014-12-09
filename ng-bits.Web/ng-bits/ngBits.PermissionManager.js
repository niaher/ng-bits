.provider("permissions", function () {
	var contextlessPermissions = [],
		contextPermissions = [],
		pendingPromises = [],
		handlers = {};

	function arrayHasString(array, string) {
		for (var i = 0; i < array.length; i++) {
			if (array[i] == string) {
				return true;
			}
		}

		return false;
	}

	this.registerContext = function (name, handler) {
		handlers[name] = handler;
	};

	this.registerPermissions = function (permissions) {
		contextlessPermissions = permissions;
	};

	this.$get = ["$q", function($q) {
		return {
			hasPermission: function (permission, context) {
				if (angular.isDefined(context)) {
					var entityType = context.entityType.shortName;
					var permissionsKey = entityType + "-" + context.entityAspect.getKey().toJSON().values.toString();
					var permissionArray = contextPermissions[permissionsKey];

					if (angular.isUndefined(permissionArray)) {
						throw Error("Permissions for the given context are undefined.");
					}

					return arrayHasString(permissionArray, permission);
				}

				return arrayHasString(contextlessPermissions, permission);
			},
			getContextPermissions: function (context, forceRefresh) {
				var entityType = context.entityType.shortName;
				var permissionsKey = entityType + "-" + context.entityAspect.getKey().toJSON().values.toString();

				var pendingPromise = pendingPromises[permissionsKey];
				if (angular.isDefined(pendingPromise) && pendingPromise != null) {
					return pendingPromise;
				}

				var deferred = $q.defer();

				var permissionArray = contextPermissions[permissionsKey];

				if (forceRefresh || angular.isUndefined(permissionArray)) {
					pendingPromises[permissionsKey] = deferred.promise;

					var handler = handlers[entityType];

					if (handler) {
						handler.then(function(response) {
							var permissions = [];
							for (var i = 0; i < response.length; ++i) {
								permissions.push(response[i].Name);
							}

							contextPermissions[permissionsKey] = permissions;
							deferred.resolve();
							pendingPromises[permissionsKey] = null;
						});
					} else {
						throw Error("Permission checks are not supported for entities of type " + entityType + ".");
					}
				} else {
					deferred.resolve();
				}

				return deferred.promise;
			}
		};
	}];
})
