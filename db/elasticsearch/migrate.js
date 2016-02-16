#!/usr/bin/env node

var elasticsearch = require('elasticsearch');
var path          = require('path');
var fs            = require('fs');
var async         = require('async');
var dateformat    = require('dateformat');
var request       = require('request');

var ActionHeroPrototype = require(__dirname + '/../../node_modules/actionhero/actionhero.js').actionheroPrototype;
var actionhero = new ActionHeroPrototype();
var configChanges = {
  logger:  { transports: null },
  general: { developmentMode: false }
};

var indexes = [];

var end = function(error, callback){
  if(typeof callback === 'function'){
    return callback(error);
  }

  var returnCode = 0;
  if(error){
    console.log(error);
    returnCode = 1;
  }

  setTimeout(function(){
    process.exit(returnCode);
  }, 1000);
};

var log = function(msg){
  if(require.main === module){
    console.log(msg);
  }
};

var migrate = function(api, callback){
  var dir = path.normalize(api.projectRoot + '/db/elasticsearch/indexes');
  fs.readdirSync(dir).forEach(function(file){
    var nameParts = file.split("/");
    var name = nameParts[(nameParts.length - 1)].split(".")[0];
    var now = new Date();
    var thisMonth = dateformat(now, 'yyyy-mm');
    var nextMonth = dateformat(new Date( now.getTime() + (1000 * 60 * 60 * 24 * 30) ), 'yyyy-mm');
    var payload = require(dir + '/' + file);

    for(var alias in payload.aliases){
      payload.aliases[(api.env + '-' + alias)] = payload.aliases[alias];
      delete payload.aliases[alias];
    }

    indexes[api.env + '-' + name + '-' + thisMonth] = payload;
    indexes[api.env + '-' + name + '-' + nextMonth] = payload;
  });

  var migrationJobs = [];
  api.elasticsearch.client.indices.get({index: '*'}, function(error, indices){
    if(error){ return end(error, callback); }

    indices = Object.keys(indices);

    Object.keys(indexes).forEach(function(i){
      if(indices.indexOf(i) < 0){
        migrationJobs.push(function(next){
          log(' -> creating index: ' + i);
          var payload = indexes[i];
          // The ES client in v10.0.0 does not suppor much of the medatdat we need :(
          // payload.index = i;
          // api.elasticsearch.client.indices.create(payload, next);

          request.put(api.config.elasticsearch.urls[0] + '/' + i, {form: JSON.stringify(payload)}, function(error, data){
            if(error){ return next(error); }
            var body = JSON.parse(data.body);
            if(body.error){ return next(body.error); }
            return next();
          });
        });
      }else{
        log(' -> index: ' + i + ' already exists');
      }
    });

    async.series(migrationJobs, function(error){
      end(error, callback);
    });
  });
};


if(require.main === module){
  actionhero.initialize({configChanges: configChanges}, function(error, api){
    if(error){ return end(error); }
    api.log('elasticsearch migration env: ' + api.env);
    migrate(api);
  });
}

exports.migrate = migrate;
