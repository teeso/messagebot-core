var dateformat = require('dateformat');
var async      = require('async');

var alias = function(api, team){
  return api.utils.cleanTeamName(team.name) + '-' + api.env + '-' + 'events';
};

exports.messagesSearch = {
  name:                   'messages:search',
  description:            'messages:search',
  outputExample:          {},
  middleware:             ['logged-in-session', 'status-required-admin'],

  inputs: {
    searchKeys:   { required: true },
    searchValues: { required: true },
    from:         {
      required: false,
      formatter: function(p){ return parseInt(p); },
      default:   function(p){ return 0; },
    },
    size:         {
      required: false,
      formatter: function(p){ return parseInt(p); },
      default:   function(p){ return 100; },
    },
    sort:         { required: false }
  },

  run: function(api, data, next){
    var team = api.utils.determineActionsTeam(data);
    if(!team){ return next(new Error('Team not found for this request')); }

    api.elasticsearch.search(api, alias(api, team), data.params.searchKeys, data.params.searchValues, data.params.from, data.params.size, data.params.sort, function(error, results, total){
      if(error){ return next(error); }
      data.response.total    = total;
      data.response.messages = results;
      next();
    });
  }
};

exports.messagesAggregation = {
  name:                   'messages:aggregation',
  description:            'messages:aggregation',
  outputExample:          {},
  middleware:             ['logged-in-session', 'status-required-admin'],

  inputs: {
    searchKeys:   { required: true },
    searchValues: { required: true },
    maximumSelections: {
      required: true,
      formatter: function(p){ return parseInt(p); },
      default:   function(p){ return 5; },
    },
    selections: {
      required: false,
      formatter: function(p){
        if(p.length === 0){ return []; }
        return p.split(',');
      },
      default:   function(p){ return []; },
    },
    start:        {
      required: false,
      formatter: function(p){ return new Date(parseInt(p)); },
      default:   function(p){ return 0; },
    },
    end:          {
      required: false,
      formatter: function(p){ return new Date(parseInt(p)); },
      default:   function(p){ return new Date().getTime(); },
    },
    interval: { required: false }
  },

  run: function(api, data, next){
    var jobs = [];
    var aggJobs = [];
    var transports = [];
    data.response.aggregations = {};

    var team = api.utils.determineActionsTeam(data);
    if(!team){ return next(new Error('Team not found for this request')); }

    jobs.push(function(done){
      api.elasticsearch.distinct(
        api,
        alias(api, team),
        data.params.searchKeys,
        data.params.searchValues,
        data.params.start,
        data.params.end,
        'createdAt',
        'transport',
        function(error, buckets){
          if(error){ return done(error); }
          buckets.buckets.forEach(function(b){
            transports.push(b.key);
          });
          data.response.selections = transports;
          data.response.selectionsName = 'transports';
          done();
        }
      );
    });

    jobs.push(function(done){
      aggJobs.push(function(aggDone){
        api.elasticsearch.aggregation(
          api,
          alias(api, team),
          ['guid'],
          ['_exists'],
          data.params.start,
          data.params.end,
          'createdAt',
          'date_histogram',
          'createdAt',
          data.params.interval,
          function(error, buckets){
            if(error){ return aggDone(error); }
            data.response.aggregations._all = buckets.buckets;
            aggDone();
          }
        );
      });

      done();
    });

    jobs.push(function(done){
      transports.forEach(function(transport){
        if(aggJobs.length <= data.params.maximumSelections && (data.params.selections.length === 0 || data.params.selections.indexOf(transport) >= 0)){
          aggJobs.push(function(aggDone){
            api.elasticsearch.aggregation(
              api,
              alias(api, team),
              ['transport'].concat(data.params.searchKeys),
              [transport].concat(data.params.searchValues),
              data.params.start,
              data.params.end,
              'createdAt',
              'date_histogram',
              'createdAt',
              data.params.interval,
              function(error, buckets){
                if(error){ return aggDone(error); }
                data.response.aggregations[transport] = buckets.buckets;
                aggDone();
              }
            );
          });
        }
      });

      done();
    });

    jobs.push(function(done){
      async.series(aggJobs, done);
    });

    async.series(jobs, next);
  }
};
