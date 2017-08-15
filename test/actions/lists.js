var should = require('should')
var async = require('async')
var path = require('path')
var specHelper = require(path.join(__dirname, '/../specHelper'))
var email = 'admin@localhost.com'
var password = 'password'
var api
var listId
var team

describe('actions:lists', () => {
  beforeEach(() => { api = specHelper.api })

  beforeEach((done) => {
    api.models.Team.findOne().then((_team) => {
      team = _team
      done()
    })
  })

  before((done) => { specHelper.truncate('lists', done) })
  before((done) => { specHelper.truncate('listPeople', done) })
  after((done) => { specHelper.truncate('lists', done) })
  after((done) => { specHelper.truncate('listPeople', done) })

  describe('list:create', () => {
    it('succeeds', (done) => {
      specHelper.requestWithLogin(email, password, 'list:create', {
        name: 'test list',
        description: 'test list',
        type: 'static'
      }, (response) => {
        should.not.exist(response.error)
        response.list.folder.should.equal('default')
        response.list.name.should.equal('test list')
        listId = response.list.id
        done()
      })
    })

    it('fails (uniqueness failure)', (done) => {
      specHelper.requestWithLogin(email, password, 'list:create', {
        name: 'test list',
        description: 'test list',
        type: 'static'
      }, (response) => {
        response.error.should.match(/must be unique/)
        done()
      })
    })

    it('fails (missing param)', (done) => {
      specHelper.requestWithLogin(email, password, 'list:create', {
        description: 'test list',
        type: 'static'
      }, (response) => {
        response.error.should.equal('Error: name is a required parameter for this action')
        done()
      })
    })
  })

  describe('list:view', () => {
    it('succeeds', (done) => {
      specHelper.requestWithLogin(email, password, 'list:view', {
        listId: listId
      }, (response) => {
        should.not.exist(response.error)
        response.list.folder.should.equal('default')
        response.list.name.should.equal('test list')
        done()
      })
    })

    it('fails (not found)', (done) => {
      specHelper.requestWithLogin(email, password, 'list:view', {
        listId: 999
      }, (response) => {
        response.error.should.equal('Error: list not found')
        done()
      })
    })
  })

  describe('list:copy', () => {
    it('succeeds', (done) => {
      specHelper.requestWithLogin(email, password, 'list:copy', {
        listId: listId,
        name: 'new list'
      }, (response) => {
        should.not.exist(response.error)
        response.list.id.should.not.equal(listId)
        response.list.folder.should.equal('default')
        response.list.name.should.equal('new list')
        done()
      })
    })

    it('fails (uniqueness param)', (done) => {
      specHelper.requestWithLogin(email, password, 'list:copy', {
        listId: listId,
        name: 'test list'
      }, (response) => {
        response.error.should.match(/must be unique/)
        done()
      })
    })

    it('fails (missing param)', (done) => {
      specHelper.requestWithLogin(email, password, 'list:copy', {
        listId: listId
      }, (response) => {
        response.error.should.equal('Error: name is a required parameter for this action')
        done()
      })
    })
  })

  describe('list:edit', () => {
    it('succeeds', (done) => {
      specHelper.requestWithLogin(email, password, 'list:edit', {
        listId: listId,
        name: 'a better list name'
      }, (response) => {
        should.not.exist(response.error)
        response.list.name.should.equal('a better list name')
        done()
      })
    })

    it('fails (uniqueness failure)', (done) => {
      specHelper.requestWithLogin(email, password, 'list:edit', {
        listId: listId,
        name: 'new list'
      }, (response) => {
        response.error.should.equal('Error: Validation error')
        done()
      })
    })
  })

  describe('lists:types', () => {
    it('succeeds', (done) => {
      specHelper.requestWithLogin(email, password, 'lists:types', {}, (response) => {
        should.not.exist(response.error)
        response.validTypes.should.deepEqual(['dynamic', 'static'])
        done()
      })
    })
  })

  describe('lists:list', () => {
    it('succeeds', (done) => {
      specHelper.requestWithLogin(email, password, 'lists:list', {}, (response) => {
        should.not.exist(response.error)
        response.lists.length.should.equal(2)
        response.lists[0].name.should.equal('a better list name')
        response.lists[1].name.should.equal('new list')
        done()
      })
    })
  })

  describe('lists:folders', () => {
    it('succeeds', (done) => {
      specHelper.requestWithLogin(email, password, 'lists:folders', {}, (response) => {
        should.not.exist(response.error)
        response.folders.length.should.equal(1)
        response.folders.should.deepEqual(['default'])
        done()
      })
    })
  })

  describe('list:people', () => {
    var dynamicListId
    var person
    var csvPeople = []

    before((done) => {
      specHelper.requestWithLogin(email, password, 'list:create', {
        name: 'dynamic list',
        description: 'dynamic list',
        type: 'dynamic'
      }, (response) => {
        should.not.exist(response.error)
        dynamicListId = response.list.id
        done()
      })
    })

    before((done) => {
      person = api.models.Person.build({
        teamId: team.id,
        source: 'tester',
        device: 'phone',
        listOptOuts: [],
        globalOptOut: false
      })
      person.data = {
        firstName: 'fname',
        lastName: 'lame',
        email: 'fake@faker.fake'
      }

      person.save().then(() => {
        done()
      }).catch(done)
    })

    after((done) => { person.destroy().then(() => { done() }) })
    after((done) => {
      var jobs = []
      csvPeople.forEach((guid) => {
        jobs.push((next) => {
          api.models.Person.destroy({where: {
            teamId: team.id,
            guid: guid
          }}).then(() => {
            next()
          }).catch(next)
        })
      })

      async.parallel(jobs, done)
    })

    describe('list:people:add', () => {
      it('succeeds with personGuids via Form', (done) => {
        specHelper.requestWithLogin(email, password, 'list:people:add', {
          listId: listId,
          personGuids: person.guid
        }, (response) => {
          should.not.exist(response.error)
          response.personGuids.length.should.equal(1)
          done()
        })
      })

      it('fails (re-adding an existing person)', (done) => {
        specHelper.requestWithLogin(email, password, 'list:people:add', {
          listId: listId,
          personGuids: person.guid
        }, (response) => {
          should.not.exist(response.error)
          response.personGuids.length.should.equal(1)
          done()
        })
      })

      it('succeeds with people via CSV Upload', (done) => {
        specHelper.requestWithLogin(email, password, 'list:people:add', {
          listId: listId,
          file: { path: path.join(__dirname, '/../../samples/email-upload.csv') }
        }, (response) => {
          var jobs = []
          should.not.exist(response.error)
          response.personGuids.length.should.equal(4)
          csvPeople = response.personGuids

          response.personGuids.forEach((pesonGuid) => {
            jobs.push((next) => {
              api.models.Person.findOne({where: {guid: pesonGuid}}).then((person) => {
                person.hydrate((error) => {
                  should.not.exist(error)
                  person.source.should.equal('form_upload')
                  person.device.should.equal('phone')
                  var keys = Object.keys(person.data)
                  keys.should.not.containEql('source')
                  keys.should.not.containEql('device')
                  keys.should.containEql('email')
                  keys.should.containEql('firstName')
                  keys.should.containEql('lastName')
                  next()
                })
              }).catch(next)
            })
          })

          async.series(jobs, done)
        })
      })

      it('succeeds will update people with CSV upload', (done) => {
        specHelper.requestWithLogin(email, password, 'list:people:add', {
          listId: listId,
          file: { path: path.join(__dirname, '/../../samples/email-upload2.csv') }
        }, (response) => {
          should.not.exist(response.error)
          response.personGuids.length.should.equal(1)
          api.models.Person.findOne({where: {guid: response.personGuids[0]}}).then((person) => {
            person.hydrate((error) => {
              should.not.exist(error)
              person.source.should.equal('other_source')
              person.device.should.equal('phone')
              var keys = Object.keys(person.data)
              keys.should.not.containEql('source')
              keys.should.not.containEql('device')
              keys.should.containEql('email') // the conflicting key is email which should trigger the merge
              keys.should.containEql('firstName')
              keys.should.containEql('lastName')

              person.data.firstName.should.equal('Evan') // data from first uplaod
              person.data.lastName.should.equal('newLastName') // data from this upload which should be merged
              done()
            })
          }).catch(done)
        })
      })

      it('fails (list is not found)', (done) => {
        specHelper.requestWithLogin(email, password, 'list:people:add', {
          listId: 999,
          personGuids: person.guid
        }, (response) => {
          response.error.should.equal('Error: list not found')
          done()
        })
      })

      it('fails (no people provided)', (done) => {
        specHelper.requestWithLogin(email, password, 'list:people:add', {
          listId: listId,
          personGuids: ''
        }, (response) => {
          response.error.should.equal('Error: No people are provided via CSV')
          done()
        })
      })

      it('fails (list is not static)', (done) => {
        specHelper.requestWithLogin(email, password, 'list:people:add', {
          listId: dynamicListId,
          personGuids: person.guid
        }, (response) => {
          response.error.should.equal('Error: you cannot modify static list membership via this method')
          done()
        })
      })
    })

    describe('list:people:delete', () => {
      it('succeeds with personGuids', (done) => {
        specHelper.requestWithLogin(email, password, 'list:people:delete', {
          listId: listId,
          personGuids: person.guid
        }, (response) => {
          should.not.exist(response.error)
          response.deletedListPeople.length.should.equal(1)
          response.deletedListPeople[0].personGuid.should.equal(person.guid)
          done()
        })
      })

      it('fails (person not in list)', (done) => {
        specHelper.requestWithLogin(email, password, 'list:people:delete', {
          listId: listId,
          personGuids: 'abc123'
        }, (response) => {
          response.error.should.equal('Error: List Person (guid abc123) not found in this list')
          done()
        })
      })

      it('fails (list is not found)', (done) => {
        specHelper.requestWithLogin(email, password, 'list:people:delete', {
          listId: 999,
          personGuids: person.guid
        }, (response) => {
          response.error.should.equal('Error: list not found')
          done()
        })
      })

      it('fails (list is not static)', (done) => {
        specHelper.requestWithLogin(email, password, 'list:people:add', {
          listId: dynamicListId,
          personGuids: person.guid
        }, (response) => {
          response.error.should.equal('Error: you cannot modify static list membership via this method')
          done()
        })
      })
    })

    describe('list:people:count', () => {
      it('succeeds with personGuids', (done) => {
        specHelper.requestWithLogin(email, password, 'list:people:count', {
          listId: listId
        }, (response) => {
          should.not.exist(response.error)
          done()
        })
      })

      it('fails (list is not found)', (done) => {
        specHelper.requestWithLogin(email, password, 'list:people:count', {
          listId: 999
        }, (response) => {
          response.error.should.equal('Error: list not found')
          done()
        })
      })
    })

    describe('list:people:view', () => {
      it('succeeds with all', (done) => {
        specHelper.requestWithLogin(email, password, 'list:people:view', {
          listId: listId
        }, (response) => {
          should.not.exist(response.error)
          response.total.should.equal(4)
          response.people.length.should.equal(4)
          csvPeople.should.containEql(response.people[0].guid)
          csvPeople.should.containEql(response.people[1].guid)
          csvPeople.should.containEql(response.people[2].guid)
          csvPeople.should.containEql(response.people[3].guid)
          done()
        })
      })

      it('succeeds with from/size', (done) => {
        specHelper.requestWithLogin(email, password, 'list:people:view', {
          listId: listId,
          from: 1,
          size: 1
        }, (response) => {
          should.not.exist(response.error)
          response.total.should.equal(4)
          response.people.length.should.equal(1)
          csvPeople.should.containEql(response.people[0].guid)
          done()
        })
      })

      it('fails (list is not found)', (done) => {
        specHelper.requestWithLogin(email, password, 'list:people:view', {
          listId: 999
        }, (response) => {
          response.error.should.equal('Error: list not found')
          done()
        })
      })
    })
  })

  describe('list:delete', () => {
    it('succeeds', (done) => {
      specHelper.requestWithLogin(email, password, 'list:delete', {
        listId: listId
      }, (response) => {
        should.not.exist(response.error)
        done()
      })
    })

    it('fails (not found)', (done) => {
      specHelper.requestWithLogin(email, password, 'list:delete', {
        listId: listId
      }, (response) => {
        response.error.should.equal('Error: list not found')
        done()
      })
    })
  })
})
