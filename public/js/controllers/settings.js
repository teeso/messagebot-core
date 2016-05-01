app.controller('settings', ['$scope', '$rootScope', '$location', function($scope, $rootScope, $location){
  $scope.transports = {};

  $scope.loadTransports = function(){
    $rootScope.authenticatedActionHelper($scope, {}, '/api/transports', 'GET', function(data){
      $scope.transports = data.transports;
    });
  };

  $scope.loadTransports();
}]);