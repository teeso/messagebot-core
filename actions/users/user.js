var validStatuses = [
  'new',
  'disabled',
  'admin',
  'marketer',
  'analyst',
  'developer',
  'designer',
];

var validateSatuses = function(p){
  if(validStatuses.indexOf(p) < 0){ return false; }
  return true;
};

exports.userCreate = {
  name:                   'user:create',
  description:            'user:create',
  outputExample:          {},
  middleware:             [ 'logged-in-session' ],

  inputs: {
    email:       { required: true },
    password:    { required: true },
    firstName:   { required: true },
    lastName:    { required: true },
    status:      {
      required: false,
      validator: validateSatuses,
    },
  },

  run: function(api, data, next){
    var user = api.models.user.build(data.params);
    user.updatePassword(data.params.password, function(error){
      if(error){ return next(error); }

      user.save().then(
        api.models.user.findOne({where: {email: data.params.email}})
      ).then(function(userObj){
        data.response.user = userObj.apiData(api);
        next(error);
      })
      .catch(function(errors){
        next(errors.errors[0].message);
      });
    });
  }
};

exports.userStatuses = {
  name:                   'user:statusesList',
  description:            'user:statusesList',
  outputExample:          {},
  middleware:             [ 'logged-in-session' ],
  inputs:                 {},
  run: function(api, data, next){
    data.response.validStatuses = validStatuses;
    next();
  }
};

exports.userView = {
  name:                   'user:view',
  description:            'user:view',
  outputExample:          {},
  middleware:             [ 'logged-in-session' ],

  inputs: {
    userId: {
      required: false,
      formatter: function(p){ return parseInt(p); }
    }
  },

  run: function(api, data, next){
    var userId = data.session.userId;
    if(data.params.userId && data.session.satus === 'admin'){
      userId = data.params.userId;
    }

    api.models.user.findOne({where: {id: userId}}).then(function(user){
      if(!user){ return next(new Error('user not found')); }
      data.response.user = user.apiData(api);
      next();
    })
    .catch(next)
    ;
  }
};

exports.userEdit = {
  name:                   'user:edit',
  description:            'user:edit',
  outputExample:          {},
  middleware:             [ 'logged-in-session' ],

  inputs: {
    email:       { required: false },
    password:    { required: false },
    firstName:   { required: false },
    lastName:    { required: false },
    status:      {
      required: false,
      validator: validateSatuses,
    },
    userId: {
      required: false,
      formatter: function(p){ return parseInt(p); }
    }
  },

  run: function(api, data, next){
    var userId = data.session.userId;
    if(data.params.userId && data.session.satus === 'admin'){
      userId = data.params.userId;
    }

    api.models.user.findOne({where: {id: userId}}).then(function(user){
      if(!user){ return next(new Error('user not found')); }
      user.updateAttributes(data.params).then(function(){
        data.response.user = user.apiData(api);
        if(data.params.password){
          user.updatePassword(data.params.password, function(error){
            if(error){ return callback(error); }
            user.save().then(function(){
              next();
            }).catch(next);
          });
        }else{
          next();
        }
      }).catch(next);
    })
    .catch(next)
    ;
  }
};

exports.userDelete = {
  name:                   'user:delete',
  description:            'user:delete',
  outputExample:          {},
  middleware:             [ 'logged-in-session' ],

  inputs: {
    userId: {
      required: true,
      formatter: function(p){ return parseInt(p); }
    }
  },

  run: function(api, data, next){
    if(data.session.satus !== 'admin'){
      return next(new Error('only an admin can delete users'));
    }

    api.models.user.findOne({where: {id: data.params.userId}}).then(function(user){
      if(!user){ return next(new Error('user not found')); }
      user.destroy().then(function(){ next(); }).catch(next);
    })
    .catch(next)
    ;
  }
};
