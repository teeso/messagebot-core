var should = require('should') // eslint-disable-line
var path = require('path')
var specHelper = require(path.join(__dirname, '/../specHelper'))
var api
var listPerson

describe('models:listPeople', () => {
  beforeEach(() => { api = specHelper.api })

  afterEach((done) => {
    if (listPerson.isNewRecord === false) {
      listPerson.destroy().then(() => { done() })
    } else {
      done()
    }
  })

  it('can create a new listPerson with valid params', (done) => {
    listPerson = api.models.ListPerson.build({
      teamId: 1,
      listId: 1,
      personGuid: 'abc123'
    })

    listPerson.save().then(() => {
      api.models.ListPerson.findOne({where: {personGuid: 'abc123'}}).then((listPerson) => {
        listPerson.teamId.should.equal(1)
        done()
      })
    })
  })

  it('will not create a new listPerson with invalid params (missing requirement)', (done) => {
    listPerson = api.models.ListPerson.build({
      teamId: 1
    })

    listPerson.save().then(() => {
      throw new Error('should not get here')
    }).catch((errors) => {
      errors.errors.length.should.be.above(1)
      errors.errors[0].message.should.equal('listId cannot be null')
      errors.errors[1].message.should.equal('personGuid cannot be null')
      done()
    })
  })

  it('will not create a new listPerson with invalid params (duplicate key)', (done) => {
    listPerson = api.models.ListPerson.build({
      teamId: 1,
      listId: 1,
      personGuid: 'abc123'
    })

    listPerson.save().then(() => {
      var otherlistPerson = api.models.ListPerson.build({
        teamId: 1,
        listId: 1,
        personGuid: 'abc123'
      })

      otherlistPerson.save().then(() => {
        throw new Error('should not get here')
      }).catch((errors) => {
        errors.errors.length.should.be.above(0)
        errors.errors[0].message.should.match(/must be unique/)
        done()
      })
    })
  })
})
