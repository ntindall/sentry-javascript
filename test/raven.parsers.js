var assert = require('assert');
var raven = require('../');
var client = new raven.Client()
raven.parsers = require('../lib/parsers');

describe('raven.parsers', function(){
  describe('#parseText()', function(){
    it('should parse some text without kwargs', function(){
      var parsed = raven.parsers.parseText('Howdy');
      parsed['message'].should.equal('Howdy');
    });

    it('should parse some text with kwargs', function(){
      var parsed = raven.parsers.parseText('Howdy', {'foo': 'bar'});
      parsed['message'].should.equal('Howdy');
      parsed['foo'].should.equal('bar');
    });
  });

  describe('#parseQuery()', function(){
    it('should parse a query', function(){
      var query = 'SELECT * FROM `something`';
      var engine = 'mysql';
      var parsed = raven.parsers.parseQuery(query, engine);
      parsed['message'].should.equal('SELECT * FROM `something`');
      parsed.should.have.property('sentry.interfaces.Query');
      parsed['sentry.interfaces.Query'].query.should.equal('SELECT * FROM `something`');
      parsed['sentry.interfaces.Query'].engine.should.equal('mysql');
    });
  });

  describe('#parseRequest()', function(){
    it('should parse a request object', function(){
      var mockReq = {
        method: 'GET',
        url: '/some/path?key=value',
        headers: {
          host: 'mattrobenolt.com'
        },
        body: '',
        cookies: {},
        socket: {
          encrypted: true
        },
        connection: {
          remoteAddress: '69.69.69.69'
        }
      };
      var parsed = raven.parsers.parseRequest(mockReq);
      parsed.should.have.property('sentry.interfaces.Http');
      parsed['sentry.interfaces.Http'].url.should.equal('https://mattrobenolt.com/some/path?key=value');
      parsed['sentry.interfaces.Http'].env.NODE_ENV.should.equal(process.env.NODE_ENV);
      parsed['sentry.interfaces.Http'].env.REMOTE_ADDR.should.equal('69.69.69.69');
    });
  });

  describe('#parseError()', function(){
    it('should parse plain Error object', function(done){
      raven.parsers.parseError(new Error(), {}, function(parsed){
        parsed['message'].should.equal('Error: <no message>');
        parsed.should.have.property('sentry.interfaces.Exception');
        parsed['sentry.interfaces.Exception']['type'].should.equal('Error');
        parsed['sentry.interfaces.Exception']['value'].should.equal('');
        parsed.should.have.property('sentry.interfaces.Stacktrace');
        parsed['sentry.interfaces.Stacktrace'].should.have.property('frames');
        done();
      });
    });

    it('should parse Error with message', function(done){
      raven.parsers.parseError(new Error('Crap'), {}, function(parsed){
        parsed['message'].should.equal('Error: Crap');
        parsed.should.have.property('sentry.interfaces.Exception');
        parsed['sentry.interfaces.Exception']['type'].should.equal('Error');
        parsed['sentry.interfaces.Exception']['value'].should.equal('Crap');
        parsed.should.have.property('sentry.interfaces.Stacktrace');
        parsed['sentry.interfaces.Stacktrace'].should.have.property('frames');
        done();
      });
    });

    it('should parse TypeError with message', function(done){
      raven.parsers.parseError(new TypeError('Crap'), {}, function(parsed){
        parsed['message'].should.equal('TypeError: Crap');
        parsed.should.have.property('sentry.interfaces.Exception');
        parsed['sentry.interfaces.Exception']['type'].should.equal('TypeError');
        parsed['sentry.interfaces.Exception']['value'].should.equal('Crap');
        parsed.should.have.property('sentry.interfaces.Stacktrace');
        parsed['sentry.interfaces.Stacktrace'].should.have.property('frames');
        done();
      });
    });

    it('should parse thrown Error', function(done){
      try {
        throw new Error('Derp');
      } catch(e) {
        raven.parsers.parseError(e, {}, function(parsed){
          parsed['message'].should.equal('Error: Derp');
          parsed.should.have.property('sentry.interfaces.Exception');
          parsed['sentry.interfaces.Exception']['type'].should.equal('Error');
          parsed['sentry.interfaces.Exception']['value'].should.equal('Derp');
          parsed.should.have.property('sentry.interfaces.Stacktrace');
          parsed['sentry.interfaces.Stacktrace'].should.have.property('frames');
          done();
        });
      }
    });

    it('should have a string stack after parsing', function(done){
      try {
        throw new Error('Derp');
      } catch(e) {
        raven.parsers.parseError(e, {}, function(parsed){
          e.stack.should.be.a.String;
          done();
        });
      }
    });

    it('should parse caught real error', function(done){
      try {
        var o = {};
        o['...']['Derp']();
      } catch(e) {
        raven.parsers.parseError(e, {}, function(parsed){
          parsed['message'].should.equal('TypeError: Cannot call method \'Derp\' of undefined');
          parsed.should.have.property('sentry.interfaces.Exception');
          parsed['sentry.interfaces.Exception']['type'].should.equal('TypeError');
          parsed['sentry.interfaces.Exception']['value'].should.equal('Cannot call method \'Derp\' of undefined');
          parsed.should.have.property('sentry.interfaces.Stacktrace');
          parsed['sentry.interfaces.Stacktrace'].should.have.property('frames');
          done();
        });
      }
    });

    it('should parse an error with additional information', function(done){
      try {
        assert.strictEqual(1, 2);
      } catch(e) {
        raven.parsers.parseError(e, {}, function(parsed){
          parsed.should.have.property('sentry.interfaces.Stacktrace');
          parsed['sentry.interfaces.Stacktrace'].should.have.property('frames');
          parsed.should.have.property('extra');
          parsed['extra'].should.have.property('AssertionError');
          parsed['extra']['AssertionError'].should.have.property('actual');
          parsed['extra']['AssertionError']['actual'].should.equal(1);
          parsed['extra']['AssertionError'].should.have.property('expected');
          parsed['extra']['AssertionError']['expected'].should.equal(2);
          parsed['extra']['AssertionError'].should.have.property('operator');
          parsed['extra']['AssertionError']['operator'].should.equal('===');
          done();
        });
      }
    });
  });
});