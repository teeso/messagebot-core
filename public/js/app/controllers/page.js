app.controller('pageController', ['$scope', '$rootScope', '$location', function($scope, $rootScope, $location){

  $scope.date = new Date();

  $rootScope.actionHelper($scope, {}, '/api/session', 'PUT', function(data){
    if(data.user){
      $rootScope.user      = data.user;
      $rootScope.csrfToken = data.csrfToken;

      if($location.path() === '/'){      $location.path('/dashboard'); }
      if($location.path() === '/login'){ $location.path('/dashboard'); }
    }
  }, function(error){
    var matchedAndOK = false;
    var path = $location.path();

    $rootScope.routes.forEach(function(r){
      if( !matchedAndOK && path === r[0] && r[3] === false ){
        matchedAndOK = true;
      }
    });

    if(matchedAndOK){
      // OK to be here logged-out
    }else{
      $location.path('/');
    }
  });

  $scope.getNavigationHighlight = function(path){
    var parts = $location.path().split('/');
    parts.shift();
    var simplePath = parts[0];
    if(simplePath == path){
      return "active";
    }else{
      return "";
    }
  };

}]);