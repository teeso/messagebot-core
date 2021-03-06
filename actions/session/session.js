exports.sessionCreate = {
  name: 'session:create',
  description: 'session:create',
  outputExample: {},

  inputs: {
    email: { required: true },
    password: { required: true }
  },

  run: function (api, data, next) {
    data.response.success = false
    api.models.User.findOne({where: {email: data.params.email}}).then((user) => {
      if (!user) { return next(new Error('user not found')) }
      user.checkPassword(data.params.password, (error, match) => {
        if (error) {
          return next(error)
        } else if (!match) {
          return next(new Error('password does not match'))
        } else {
          api.session.create(data.connection, user, (error, sessionData) => {
            if (error) { return next(error) }
            data.response.user = user.apiData()
            data.response.success = true
            next()
          })
        }
      })
    }).catch(next)
  }
}

exports.sessionDelete = {
  name: 'session:delete',
  description: 'session:delete',
  outputExample: {},

  inputs: {},

  run: function (api, data, next) {
    api.session.destroy(data.connection, next)
  }
}

exports.sessionCheck = {
  name: 'session:check',
  description: 'session:check',
  outputExample: {},

  inputs: {},

  run: function (api, data, next) {
    api.session.load(data.connection, (error, sessionData) => {
      if (error) {
        return next(error)
      } else if (!sessionData) {
        return next(new Error('Please log in to continue'))
      } else {
        api.models.User.findOne({where: {guid: sessionData.userGuid}}).then((user) => {
          if (!user) { return next(new Error('user not found')) }
          data.response.user = user.apiData()
          data.response.success = true
          next()
        }).catch(next)
      }
    })
  }
}
