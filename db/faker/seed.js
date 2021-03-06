const async = require('async')
const path = require('path')
const common = require(path.join(__dirname, 'common.js'))

let seed = function (api, callback) {
  let routeBase = process.env.PUBLIC_URL || 'http://' + api.config.servers.web.bindIP + ':' + api.config.servers.web.port
  let usersCount = process.env.USERS_COUNT || 1000
  let jobs = []

  // only create entries within a 1-month window
  let start = new Date()
  start.setMonth(start.getMonth() - 1)
  let end = new Date()

  let i = 0
  while (i < usersCount) {
    jobs.push((done) => {
      let localJobs = []
      let person
      let message = ''

      // create the person
      localJobs.push((next) => {
        common.buildPerson(start, end, routeBase, (error, _person) => {
          if (error) { throw error }
          person = _person
          message += 'Created `' + person.data.firstName + ' ' + person.data.lastName + '` + ['
          return next()
        })
      })

      // build events
      localJobs.push((next) => {
        common.buildFunnel(person, routeBase, (error, events) => {
          if (error) { throw error }
          message += events.join(', ') + ']'
          return next()
        })
      })

      async.series(localJobs, (error) => {
        if (!error) { console.log(message) }
        done(error)
      })
    })
    i++
  }

  async.series(jobs, callback)
}

if (require.main === module) {
  common.connect((error, api) => {
    if (error) { throw (error) }
    console.log('seeding env with fake data: ' + api.env)
    seed(api, (error) => {
      if (error) { throw error }
      process.exit()
    })
  })
}

exports.seed = seed
