
var async = require('async')

exports.task = {
  name: 'lists:dailyRecount',
  description: 'lists:dailyRecount',
  frequency: (1000 * 60 * 60 * 24),
  queue: 'messagebot:lists',
  plugins: [],
  pluginOptions: {},

  run: function (api, params, next) {
    var jobs = []

    api.models.List.findAll().then(function (lists) {
      lists.forEach(function (list) {
        jobs.push(function (done) {
          api.tasks.enqueue('lists:peopleCount', {listId: list.id}, 'messagebot:lists', done)
        })
      })

      async.series(jobs, function (error) {
        process.nextTick(function () { return next(error) })
      })
    }).catch(next)
  }
}
