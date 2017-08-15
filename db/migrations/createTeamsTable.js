module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.createTable(
      'teams',
      {
        id: {
          type: Sequelize.BIGINT,
          primaryKey: true,
          autoIncrement: true
        },
        createdAt: {
          type: Sequelize.DATE
        },
        updatedAt: {
          type: Sequelize.DATE
        },

        'name': {
          type: Sequelize.STRING,
          allowNull: false
        },
        'trackingDomainRegexp': {
          type: Sequelize.STRING,
          allowNull: false
        },
        'trackingDomain': {
          type: Sequelize.STRING,
          allowNull: false
        }

      }
    ).then(() => {
      return queryInterface.addIndex(
        'teams', ['name'], {
          indicesType: 'UNIQUE'
        }
      ).then(() => {
        return queryInterface.addIndex(
          'teams', ['trackingDomainRegexp'], {
            indicesType: 'UNIQUE'
          }
        ).then(() => {
          return queryInterface.addIndex(
            'teams', ['trackingDomain'], {
              indicesType: 'UNIQUE'
            }
          )
        })
      })
    })
  },

  down: function (queryInterface, Sequelize) {
    queryInterface.deleteTable('teams')
  }
}
