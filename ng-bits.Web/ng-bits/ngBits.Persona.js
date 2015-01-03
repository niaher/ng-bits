angular.module("ngBits.persona", [])
	.constant("navigator", window.navigator)
	.constant("$script", window.$script)
	.provider("persona", [
		"navigator", function (navigator) {
			var loginUrl;
			var logoutUrl;
			var getUser = angular.noop;

			this.init = function (options) {
				options = options || {};
				loginUrl = options.loginUrl;
				logoutUrl = options.logoutUrl;
				getUser = options.getUser;
			};

			this.$get = [
				"$http", function ($http) {
					function verifyAssertion(assertion) {
						$http.post(loginUrl + assertion).success(function (data) {
							var authenticated = data === true || data === "true";

							if (authenticated) {
								window.location.reload();
							} else {
								alert("Your credentials could not be authenticated.");
							}
						}).error(function () {
							navigator.id.logout();
							alert("Login error! Please try again.");
						});
					}

					function signoutUser() {
						$http.get(logoutUrl).success(function () {
							window.location.reload();
						}).error(function () {
							alert("Logout error! The page will refresh.");
							window.location.reload();
						});
					}

					var watching = false;

					return {
						watch: function () {
							if (!watching) {
								watching = true;
								navigator.id.watch({
									loggedInUser: getUser(),
									onlogin: verifyAssertion,
									onlogout: signoutUser
								});
							}
						},
						login: function () {
							if (getUser()) {
								navigator.id.logout();
							} else {
								navigator.id.request();
							}
						},
						user: function () {
							return getUser();
						}
					};
				}
			];
		}
	])
	.directive("personaLogin", [
		"persona", "$script", function (persona, $script) {
			return {
				restrict: "A",
				template: "<span ng-click='login()' ng-transclude></span>",
				transclude: true,
				scope: {},
				link: function ($scope) {
					$scope.login = function () {
						alert("Loading... Please wait.");
					};

					$script("https://login.persona.org/include.js", function () {
						$scope.login = function () {
							persona.watch();
							persona.login();
						};
					});
				}
			};
		}
	]);
