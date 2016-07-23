var should     = require('should');
var async      = require('async');
var specHelper = require(__dirname + '/../../specHelper');
var api;

describe('integartion:template', function(){
  describe('#render', function(){
    var person;
    var message;
    var template;
    var team;

    before(function(){ api = specHelper.api; });

    before(function(done){
      api.models.team.findOne().then(function(_team){
        team = _team;
        done();
      }).catch(done);
    });

    before(function(done){
      template = api.models.template.build({
        teamId:      1,
        name:        'my template',
        description: 'my template',
        folder:      'default',
        template:    'Hello there, {{ person.data.firstName }}'
      });

      template.save().then(function(){ done(); }).catch(done);
    });

    before(function(done){
      person = new api.models.person(team);
      person.data.source = 'tester';
      person.data.device = 'phone';
      person.data.location = [0, 0];
      person.data.data = {
        firstName: 'fname',
        lastName: 'lame',
        email: 'fake@faker.fake',
      };

      person.create(done);
    });

    before(function(done){
      message = new api.models.message(team);

      message.data.personGuid = person.data.guid;
      message.data.transport  = 'smtp';
      message.data.campaignId = '1';
      message.data.body       = '';
      message.data.view       = {};
      message.data.sentAt     = new Date();

      message.create(done);
    });

    before(function(done){ person.hydrate(done); });

    after(function(done){ person.del(done); });
    after(function(done){ message.del(done); });
    after(function(done){ template.destroy().then(function(){ done(); }); });

    it('renders a template (happy, no message)', function(done){
      template.render(person, null, function(error, html, view){
        should.not.exist(error);
        html.should.equal('Hello there, fname');
        view.person.data.firstName.should.equal('fname');
        view.template.id.should.equal(template.id);
        view.beacon.should.equal('<img src="https://tracking.site.com/api/message/track.gif?verb=read&guid=%%MESSAGEGUID%%" >');
        done();
      });
    });

    it('renders a template (happy, with message)', function(done){
      template.render(person, message, function(error, html, view){
        should.not.exist(error);
        html.should.equal('Hello there, fname');
        view.person.data.firstName.should.equal('fname');
        view.template.id.should.equal(template.id);
        view.beacon.should.equal('<img src="https://tracking.site.com/api/message/track.gif?verb=read&guid=' + message.data.guid + '" >');
        done();
      });
    });

    it('expands beacons properly', function(done){
      template.template = 'Hello there, {{ person.data.firstName }} {{{ beacon }}}';
      template.render(person, message, function(error, html, view){
        should.not.exist(error);
        html.should.equal('Hello there, fname <img src="https://tracking.site.com/api/message/track.gif?verb=read&guid=' + message.data.guid + '" >');
        view.beacon.should.equal('<img src="https://tracking.site.com/api/message/track.gif?verb=read&guid=' + message.data.guid + '" >');
        done();
      });
    });

    it('expands dates properly', function(done){
      var now = new Date();
      var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      var month = monthNames[now.getMonth()];

      template.template = 'Hello there, {{ person.data.firstName }} @ {{person.updatedAt.monthName}}';
      template.render(person, message, function(error, html, view){
        should.not.exist(error);
        html.should.equal('Hello there, fname @ ' + month);
        done();
      });
    });

    it('tracks links properly', function(done){
      template.template = 'Hello there, <a href="{{#track}}http://messagebot.io{{/track}}">click me</a>';
      template.render(person, message, function(error, html, view){
        should.not.exist(error);
        html.should.equal('Hello there, <a href="https://tracking.site.com/api/message/track.gif?verb=act&guid=' + message.data.guid + '&link=http://messagebot.io">click me</a>');
        done();
      });
    });

  });
});