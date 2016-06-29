'use strict';

var fs = require('fs');
var async = require('async');

exports.task = {
  name:          'campaigns:send',
  description:   'campaigns:send',
  frequency:     0,
  queue:         'messagebot:campaigns',
  plugins:       [],
  pluginOptions: {},

  run: function(api, params, next){
    var jobs = [];
    var campaign;
    var list;
    var listPerson;
    var person;
    var file;
    var body;
    var transport;

    jobs.push(function(done){
      api.models.campaign.findOne({where: {id: params.campaignId}}).then(function(c){
        campaign = c;
        if(!campaign){ return done(new Error('campaign not found')); }
        done();
      }).catch(done);
    });

    jobs.push(function(done){
      api.models.list.findOne({where: {id: params.listId}}).then(function(l){
        list = l;
        if(!list){ return done(new Error('list not found')); }
        done();
      }).catch(done);
    });

    jobs.push(function(done){
      api.models.listPerson.findOne({where: {id: params.listPersonId}}).then(function(lp){
        listPerson = lp;
        if(!listPerson){ return done(new Error('listPerson not found')); }
        done();
      }).catch(done);
    });

    jobs.push(function(done){
      person = new api.models.person(listPerson.personGuid);
      person.hydrate(function(error){
        if(error){ return done(error); }
        done();
      });
    });

    jobs.push(function(done){
      api.template.renderToDisk(campaign.templateId, person.data.guid, function(error, f){
        if(error){ return done(error); }
        file = f;
        done();
      });
    });

    jobs.push(function(done){
      fs.readFile(file, function(error, buffer){
        if(error){ return done(error); }
        body = buffer.toString();
        done();
      });
    });

    jobs.push(function(done){
      api.transports.forEach(function(t){
        if(t.name === campaign.transport){ transport = t; }
        if(!transport){ return done(new Error('transport not found')); }

        var missingKey;
        transport.requiredDataKeys.person.forEach(function(k){
          if(!person.data.data[k]){ missingKey = k; }
        })
        
        // TODO: Event validation

        if(missingKey){ return done(new Error('person missing data.' + k)); }
        done();
      });
    });

    jobs.push(function(done){
      transport.deliver({
        body: body
      }, person, done);
    });

    async.series(jobs, next);
  }
};