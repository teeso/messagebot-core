const should = require('should')
const async = require('async')
const path = require('path')
const specHelper = require(path.join(__dirname, '/../specHelper'))
let email = 'admin@localhost.com'
let password = 'password'
let api
let userGuid
let otheruserGuid

describe('actions:user', () => {
  before(() => { api = specHelper.api })

  let cleanUsersTable = function (callback) {
    let jobs = []
    api.models.User.findAll().then((users) => {
      users.forEach((user) => {
        if (user.email !== 'admin@localhost.com') {
          jobs.push((next) => {
            api.models.Person.destroy({where: {guid: user.personGuid}}).then(() => {
              next()
            }).catch(next)
          })

          jobs.push((next) => {
            user.destroy().then(() => { next() }).catch(next)
          })
        }
      })

      async.series(jobs, (error) => {
        if (error) { return callback(error) }
        callback()
      })
    }).catch(callback)
  }

  before((done) => { cleanUsersTable(done) })
  after((done) => { cleanUsersTable(done) })

  describe('user:create', () => {
    it('succeeds (admin)', (done) => {
      specHelper.requestWithLogin(email, password, 'user:create', {
        email: 'user@fake.com',
        firstName: 'user',
        lastName: 'user',
        password: 'abc123',
        role: 'admin'
      }, (response) => {
        should.not.exist(response.error)
        response.user.email.should.equal('user@fake.com')
        response.user.role.should.equal('admin')
        should.not.exist(response.user.pasword)
        userGuid = response.user.guid
        done()
      })
    })

    it('creates a person with each uesr', (done) => {
      api.models.User.find({where: {guid: userGuid}}).then((user) => {
        api.models.Person.find({where: {guid: user.personGuid}}).then((person) => {
          person.hydrate((error) => {
            should.not.exist(error)
            person.source.should.equal('admin')
            Object.keys(person.data).length.should.equal(4)
            person.data.firstName.should.equal('user')
            person.data.email.should.equal('user@fake.com')
            done()
          })
        }).catch(done)
      }).catch(done)
    })

    it('succeeds (other role)', (done) => {
      specHelper.requestWithLogin(email, password, 'user:create', {
        email: 'otherUser@fake.com',
        firstName: 'user',
        lastName: 'user',
        password: 'abc123',
        role: 'marketer'
      }, (response) => {
        should.not.exist(response.error)
        response.user.email.should.equal('otherUser@fake.com')
        response.user.role.should.equal('marketer')
        should.not.exist(response.user.pasword)
        otheruserGuid = response.user.guid
        done()
      })
    })

    it('succeeds (creates the proper person)', (done) => {
      api.models.User.find({where: {guid: userGuid}}).then((user) => {
        should.exist(user)
        api.models.Person.find({where: {guid: user.personGuid}}).then((person) => {
          person.hydrate((error) => {
            should.not.exist(error)
            person.source.should.equal('admin')
            Object.keys(person.data).length.should.equal(4)
            person.data.firstName.should.equal(user.firstName)
            person.data.lastName.should.equal(user.lastName)
            person.data.email.should.equal(user.email)
            done()
          })
        }).catch(done)
      }).catch(done)
    })

    it('fails (only admin roles can create other uers)', (done) => {
      specHelper.requestWithLogin('otherUser@fake.com', 'abc123', 'user:create', {
        email: 'someoneElse@fake.com',
        firstName: 'user',
        lastName: 'user',
        password: 'abc123',
        role: 'admin'
      }, (response) => {
        response.error.should.equal('Error: admin role requried')
        done()
      })
    })

    it('fails (uniqueness failure)', (done) => {
      specHelper.requestWithLogin(email, password, 'user:create', {
        email: 'user@fake.com',
        firstName: 'user',
        lastName: 'user',
        password: 'abc123',
        role: 'admin'
      }, (response) => {
        response.error.should.match(/Error: personGuid .* already exists with email of user@fake.com/)
        done()
      })
    })

    it('fails (missing param)', (done) => {
      specHelper.requestWithLogin(email, password, 'user:create', {
        firstName: 'user',
        lastName: 'user',
        password: 'abc123',
        role: 'admin'
      }, (response) => {
        response.error.should.equal('Error: email is a required parameter for this action')
        done()
      })
    })
  })

  describe('user:view', () => {
    it('succeeds (admin, self)', (done) => {
      specHelper.requestWithLogin(email, password, 'user:view', {}, (response) => {
        should.not.exist(response.error)
        response.user.email.should.equal('admin@localhost.com')
        done()
      })
    })

    it('succeeds (admin, other user)', (done) => {
      specHelper.requestWithLogin(email, password, 'user:view', {
        userGuid: userGuid
      }, (response) => {
        should.not.exist(response.error)
        response.user.email.should.equal('user@fake.com')
        done()
      })
    })

    it('succeeds (non-admin, self)', (done) => {
      specHelper.requestWithLogin('otherUser@fake.com', 'abc123', 'user:view', {}, (response) => {
        should.not.exist(response.error)
        response.user.email.should.equal('otherUser@fake.com')
        done()
      })
    })

    it('fails (non-admin, other user)', (done) => {
      specHelper.requestWithLogin('otherUser@fake.com', 'abc123', 'user:view', {
        userGuid: userGuid
      }, (response) => {
        should.not.exist(response.error)
        done()
      })
    })

    it('fails (not found)', (done) => {
      specHelper.requestWithLogin(email, password, 'user:view', {
        userGuid: 999
      }, (response) => {
        response.error.should.equal('Error: user not found')
        done()
      })
    })
  })

  describe('user:edit', () => {
    it('succeeds (admin, self)', (done) => {
      specHelper.requestWithLogin('user@fake.com', 'abc123', 'user:edit', {
        firstName: 'new first name'
      }, (response) => {
        should.not.exist(response.error)
        response.user.firstName.should.equal('new first name')
        done()
      })
    })

    it('edits the person as well', (done) => {
      api.models.User.find({where: {guid: userGuid}}).then((user) => {
        should.exist(user)
        api.models.Person.find({where: {guid: user.personGuid}}).then((person) => {
          person.hydrate((error) => {
            should.not.exist(error)
            person.source.should.equal('admin')
            Object.keys(person.data).length.should.equal(4)
            person.data.firstName.should.equal('new first name')
            person.data.lastName.should.equal('user')
            done()
          })
        }).catch(done)
      }).catch(done)
    })

    it('succeeds (admin, other user)', (done) => {
      specHelper.requestWithLogin('user@fake.com', 'abc123', 'user:edit', {
        userGuid: otheruserGuid,
        firstName: 'new first name'
      }, (response) => {
        should.not.exist(response.error)
        response.user.firstName.should.equal('new first name')
        done()
      })
    })

    it('succeeds (non-admin, sef)', (done) => {
      specHelper.requestWithLogin('otherUser@fake.com', 'abc123', 'user:edit', {
        firstName: 'some other first name'
      }, (response) => {
        should.not.exist(response.error)
        response.user.firstName.should.equal('some other first name')
        done()
      })
    })

    it('succeeds (non-admin, can change own password)', (done) => {
      specHelper.requestWithLogin('otherUser@fake.com', 'abc123', 'user:edit', {
        password: 'xyz123'
      }, (response) => {
        should.not.exist(response.error)
        done()
      })
    })

    it('succeeds (admin, can change other users password)', (done) => {
      specHelper.requestWithLogin('user@fake.com', 'abc123', 'user:edit', {
        password: 'abc123',
        userGuid: otheruserGuid
      }, (response) => {
        should.not.exist(response.error)
        done()
      })
    })

    it('succeeds (admin, can change other users role)', (done) => {
      specHelper.requestWithLogin('user@fake.com', 'abc123', 'user:edit', {
        role: 'analyst',
        userGuid: otheruserGuid
      }, (response) => {
        should.not.exist(response.error)
        response.user.role.should.equal('analyst')
        done()
      })
    })

    it('fails (non-admin, can change other users password)', (done) => {
      specHelper.requestWithLogin('otherUser@fake.com', 'abc123', 'user:edit', {
        password: 'xyz123',
        userGuid: userGuid
      }, (response) => {
        response.error.should.equal('Error: only admin role can modify other users')
        done()
      })
    })

    it('fails (non-admin, self, change role)', (done) => {
      specHelper.requestWithLogin('otherUser@fake.com', 'abc123', 'user:edit', {
        role: 'admin'
      }, (response) => {
        response.error.should.equal('Error: only admin role can modify role')
        done()
      })
    })

    it('fails (non-admin, other user, change role)', (done) => {
      specHelper.requestWithLogin('otherUser@fake.com', 'abc123', 'user:edit', {
        role: 'admin',
        userGuid: userGuid
      }, (response) => {
        response.error.should.equal('Error: only admin role can modify role')
        done()
      })
    })

    it('fails (admin, uniqueness failure)', (done) => {
      specHelper.requestWithLogin('otherUser@fake.com', 'abc123', 'user:edit', {
        email: 'admin@localhost.com'
      }, (response) => {
        response.error.should.equal('Error: Validation error')
        done()
      })
    })
  })

  describe('users:roles', () => {
    it('succeeds', (done) => {
      specHelper.requestWithLogin(email, password, 'users:roles', {}, (response) => {
        should.not.exist(response.error)
        response.roles.should.deepEqual([
          'new',
          'disabled',
          'admin',
          'marketer',
          'analyst',
          'developer',
          'designer'
        ])
        done()
      })
    })
  })

  describe('users:list', () => {
    it('succeeds', (done) => {
      specHelper.requestWithLogin(email, password, 'users:list', {}, (response) => {
        should.not.exist(response.error)
        response.users.length.should.equal(3)

        let sortedUsersEmail = response.users.map((u) => {
          return u.email
        }).sort()

        sortedUsersEmail[0].should.equal('admin@localhost.com')
        sortedUsersEmail[1].should.equal('otherUser@fake.com')
        sortedUsersEmail[2].should.equal('user@fake.com')
        done()
      })
    })
  })

  describe('user:delete', () => {
    it('succeeds (admin, other user)', (done) => {
      api.models.User.find({where: {guid: userGuid}}).then((user) => {
        specHelper.requestWithLogin(email, password, 'user:delete', {
          userGuid: userGuid
        }, (response) => {
          should.not.exist(response.error)
          api.models.Person.find({where: {guid: user.personGuid}}).then((person) => {
            should.not.exist(person)
            api.models.PersonData.count({where: {personGuid: user.personGuid}}).then((count) => {
              count.should.equal(0)
              done()
            })
          })
        })
      }).catch(done)
    })

    it('fails (admin, self (null))', (done) => {
      specHelper.requestWithLogin(email, password, 'user:delete', {}, (response) => {
        response.error.should.equal('Error: userGuid is a required parameter for this action')
        done()
      })
    })

    it('fails (admin, self (explicit))', (done) => {
      api.models.User.findOne({where: {email: email}}).then((u) => {
        specHelper.requestWithLogin(email, password, 'user:delete', {
          userGuid: u.guid
        }, (response) => {
          response.error.should.equal('Error: you cannot delete yourself')
          done()
        })
      })
    })

    it('fails (admin, not-found)', (done) => {
      specHelper.requestWithLogin(email, password, 'user:delete', {
        userGuid: 999
      }, (response) => {
        response.error.should.equal('Error: user not found')
        done()
      })
    })

    it('fails (non-admin, other user)', (done) => {
      specHelper.requestWithLogin('otherUser@fake.com', 'abc123', 'user:delete', {
        userGuid: userGuid
      }, (response) => {
        response.error.should.equal('Error: admin role requried')
        done()
      })
    })

    it('fails (non-admin, self)', (done) => {
      specHelper.requestWithLogin('otherUser@fake.com', 'abc123', 'user:delete', {}, (response) => {
        response.error.should.equal('Error: admin role requried')
        done()
      })
    })
  })
})
