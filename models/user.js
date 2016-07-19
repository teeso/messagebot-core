var bcrypt = require('bcrypt');
var bcryptComplexity = 10;

module.exports = function(sequelize, DataTypes){
  return sequelize.define('user', {
    'teamId': {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    'email': {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { isEmail: true },
    },
    'passwordHash': {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    'personGuid': {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    'status': {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'new',
    },
    'firstName': {
      type: DataTypes.STRING,
      allowNull: false,
    },
    'lastName': {
      type: DataTypes.STRING,
      allowNull: false,
    },
    'lastLoginAt': {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    instanceMethods: {
      name: function(){
        return [this.firstName, this.lastName].join(' ');
      },

      updatePassword: function(pw, callback){
        var self = this;
        bcrypt.hash(pw, bcryptComplexity, function(error, hash){
          if(error){ return callback(error); }
          self.passwordHash = hash;
          callback(null, self);
        });
      },

      checkPassword: function(pw, callback){
        var self = this;
        bcrypt.compare(pw, self.passwordHash, callback);
      },

      apiData: function(api){
        return {
          id:         this.id,
          personGuid: this.personGuid,
          email:      this.email,
          status:     this.status,
          firstName:  this.firstName,
          lastName:   this.lastName,
        };
      }
    }
  });
};
