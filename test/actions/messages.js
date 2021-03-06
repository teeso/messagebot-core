const should = require('should')
const async = require('async')
const path = require('path')
const specHelper = require(path.join(__dirname, '/../specHelper'))
let email = 'admin@localhost.com'
let password = 'password'
let api
let messageGuid
let team

describe('actions:message', () => {
  before(() => { api = specHelper.api })

  before((done) => {
    api.models.Team.findOne().then((_team) => {
      team = _team
      done()
    })
  })

  describe('message:create', () => {
    it('succeeds', (done) => {
      api.specHelper.runAction('message:create', {
        teamGuid: team.guid,
        personGuid: 'messagesTestPersonGuid',
        transport: 'smtp',
        campaignGuid: 1,
        body: 'hello',
        view: {},
        sentAt: new Date()
      }, (response) => {
        should.not.exist(response.error)
        should.exist(response.message.guid)
        messageGuid = response.message.guid
        done()
      })
    })

    it('fails (uniqueness failure)', (done) => {
      api.specHelper.runAction('message:create', {
        teamGuid: team.guid,
        guid: messageGuid,
        personGuid: 'messagesTestPersonGuid',
        transport: 'smtp',
        campaignGuid: 1,
        body: 'hello',
        view: {},
        sentAt: new Date()
      }, (response) => {
        response.error.should.equal('Error: Validation error')
        done()
      })
    })

    it('fails (missing param)', (done) => {
      api.specHelper.runAction('message:create', {
        teamGuid: team.guid,
        transport: 'smtp',
        campaignGuid: 1,
        body: 'hello',
        view: {},
        sentAt: new Date()
      }, (response) => {
        response.error.should.equal('Error: personGuid is a required parameter for this action')
        done()
      })
    })
  })

  describe('message:view', () => {
    it('succeeds', (done) => {
      api.specHelper.runAction('message:view', {
        teamGuid: team.guid,
        guid: messageGuid
      }, (response) => {
        should.not.exist(response.error)
        response.message.guid.should.equal(messageGuid)
        done()
      })
    })

    it('fails (not found)', (done) => {
      api.specHelper.runAction('message:view', {
        teamGuid: team.guid,
        guid: 'xxx'
      }, (response) => {
        response.error.should.equal('Error: Message (xxx) not found')
        done()
      })
    })
  })

  describe('message:edit', () => {
    it('succeeds', (done) => {
      api.specHelper.runAction('message:edit', {
        teamGuid: team.guid,
        guid: messageGuid,
        body: 'hello again'
      }, (response) => {
        should.not.exist(response.error)
        done()
      })
    })

    it('fails (not found)', (done) => {
      api.specHelper.runAction('message:edit', {
        teamGuid: team.guid,
        guid: 'xxx'
      }, (response) => {
        response.error.should.equal('Error: Message (xxx) not found')
        done()
      })
    })
  })

  describe('message:track', () => {
    let eventGuids = []

    after((done) => {
      let jobs = []
      eventGuids.forEach((e) => {
        jobs.push((next) => {
          api.models.Event.destroy({where: {guid: e}}).then(() => {
            next()
          }).catch(next)
        })
      })

      async.series(jobs, done)
    })

    it('succeeds (read, json)', (done) => {
      api.specHelper.runAction('message:track', {
        teamGuid: team.guid,
        guid: messageGuid,
        verb: 'read'
      }, (response) => {
        should.not.exist(response.error)
        should.exist(response.event.guid)
        eventGuids.push(response.event.guid)
        done()
      })
    })

    it('succeeds (act, json)', (done) => {
      api.specHelper.runAction('message:track', {
        teamGuid: team.guid,
        guid: messageGuid,
        verb: 'act'
      }, (response) => {
        should.not.exist(response.error)
        should.exist(response.event.guid)
        eventGuids.push(response.event.guid)
        done()
      })
    })

    it('succeeds (read, html)', (done) => {
      specHelper.WebRequestWithLogin(email, password, 'get', '/api/message/track', {
        teamGuid: team.guid,
        guid: messageGuid,
        verb: 'read'
      }, (response, res) => {
        should.not.exist(response.error)
        should.exist(response.event.guid)
        res.statusCode.should.equal(200)
        eventGuids.push(response.event.guid)
        done()
      })
    })

    it('succeeds (act, html)', (done) => {
      specHelper.WebRequestWithLogin(email, password, 'get', '/api/message/track', {
        teamGuid: team.guid,
        guid: messageGuid,
        verb: 'act'
      }, (response, res) => {
        should.not.exist(response.error)
        should.exist(response.event.guid)
        res.statusCode.should.equal(200)
        eventGuids.push(response.event.guid)
        done()
      })
    })

    it('succeeds (read, gif)', (done) => {
      specHelper.WebRequestWithLogin(email, password, 'get', '/api/message/track.gif', {
        teamGuid: team.guid,
        guid: messageGuid,
        verb: 'read'
      }, (response, res) => {
        response.toString().indexOf('GIF').should.equal(0)
        res.statusCode.should.equal(200)
        res.headers['x-powered-by'].should.equal('MessageBot')
        res.headers['content-type'].should.equal('image/gif')
        done()
      })
    })

    it('succeeds (act, gif)', (done) => {
      specHelper.WebRequestWithLogin(email, password, 'get', '/api/message/track.gif', {
        teamGuid: team.guid,
        guid: messageGuid,
        verb: 'act'
      }, (response, res) => {
        response.toString().indexOf('GIF').should.equal(0)
        res.statusCode.should.equal(200)
        res.headers['x-powered-by'].should.equal('MessageBot')
        res.headers['content-type'].should.equal('image/gif')
        done()
      })
    })

    it('succeeds (message timestamps updated)', (done) => {
      api.specHelper.runAction('message:view', {
        teamGuid: team.guid,
        guid: messageGuid
      }, (response) => {
        should.not.exist(response.error)
        response.message.guid.should.equal(messageGuid)
        should.exist(response.message.readAt)
        should.exist(response.message.actedAt)
        done()
      })
    })

    it('fails (bad verb)', (done) => {
      api.specHelper.runAction('message:track', {
        teamGuid: team.guid,
        guid: messageGuid,
        verb: 'did-it'
      }, (response) => {
        response.error.should.equal('Error: verb not allowed')
        done()
      })
    })

    it('fails (not found)', (done) => {
      api.specHelper.runAction('message:track', {
        teamGuid: team.guid,
        guid: 'a-fake-guid',
        verb: 'act'
      }, (response) => {
        response.error.should.equal('Error: Message (a-fake-guid) not found')
        done()
      })
    })
  })

  describe('messages:search', () => {
    it('succeeds', (done) => {
      specHelper.requestWithLogin(email, password, 'messages:search', {
        searchKeys: ['personGuid'],
        searchValues: ['messagesTestPersonGuid'],
        from: 0,
        size: 1
      }, (response) => {
        should.not.exist(response.error)
        response.total.should.equal(1)
        response.messages.length.should.equal(1)
        done()
      })
    })

    it('fails (not logged in)', (done) => {
      api.specHelper.runAction('people:search', {
        searchKeys: ['personGuid'],
        searchValues: ['messagesTestPersonGuid']
      }, (response) => {
        response.error.should.equal('Error: Please log in to continue')
        done()
      })
    })
  })

  describe('messages:aggregation', () => {
    it('succeeds', (done) => {
      specHelper.requestWithLogin(email, password, 'messages:aggregation', {
        searchKeys: ['personGuid'],
        searchValues: ['messagesTestPersonGuid']
      }, (response) => {
        should.not.exist(response.error)
        Object.keys(response.aggregations).length.should.equal(1)
        let key = Object.keys(response.aggregations)[0]
        let date = new Date(key)
        specHelper.dateCompare(date).should.equal(true)
        response.aggregations[key].should.deepEqual({smtp: 1})
        done()
      })
    })

    it('fails (not logged in)', (done) => {
      api.specHelper.runAction('messages:aggregation', {
        searchKeys: ['personGuid'],
        searchValues: ['messagesTestPersonGuid']
      }, (response) => {
        response.error.should.equal('Error: Please log in to continue')
        done()
      })
    })
  })

  describe('message:delete', () => {
    it('succeeds', (done) => {
      api.specHelper.runAction('message:delete', {
        teamGuid: team.guid,
        guid: messageGuid
      }, (response) => {
        should.not.exist(response.error)
        done()
      })
    })

    it('fails (not found)', (done) => {
      api.specHelper.runAction('message:delete', {
        teamGuid: team.guid,
        guid: messageGuid
      }, (response) => {
        response.error.should.equal('Error: Message (' + messageGuid + ') not found')
        done()
      })
    })
  })
})
