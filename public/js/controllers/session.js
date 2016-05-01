app.controller('session:create', ['$scope', '$rootScope', '$location', function($scope, $rootScope, $location){
  $scope.formData    = {};

  if($rootScope.user){
    $location.path('/dashboard');
  }

  $scope.processForm = function(){
    $rootScope.actionHelper($scope, $scope.formData, '/api/session', 'POST', function(data){
      if(data.user){ $rootScope.user = data.user; }
      location.reload(); // <- to force the CSRF Token to hydrate
    });
  };
}]);

app.controller('session:destroy', ['$scope', '$rootScope', '$location', function($scope, $rootScope, $location){
  $scope.submitForm = function(){
    $scope.processForm.call(this);
  };

  $scope.processForm = function(){
    $rootScope.actionHelper($scope, {}, '/api/session', 'DELETE', function(data){
      delete $rootScope.user;
      $location.path('/');
    });
  };
}]);