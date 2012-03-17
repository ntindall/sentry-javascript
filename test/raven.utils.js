var raven = require('../')
  , fs = require('fs');

describe('raven.utils', function() {
  describe('#construct_checksum()', function(){
    it('should md5 hash the message', function(){
      var kwargs = {
        'foo': 'bar',
        'message': 'This is awesome!'
      };
      raven.utils.construct_checksum(kwargs).should.equal('caf30724990022cfec2532741d6b631e');
    });
  });

  describe('#get_signature()', function(){
    it('should sign a key, timestamp, and message with md5 hash', function(){
      raven.utils.get_signature('abc', 'This is awesome!', 1331932297938).should.equal('76cfb41aa49f91e5eb4ffbb1fe0c5b578459c537');
    });
  });

  describe('#parseDSN()', function(){
    it('should parse hosted Sentry DSN without path', function(){
      var dsn = raven.utils.parseDSN('https://8769c40cf49c4cc58b51fa45d8e2d166:296768aa91084e17b5ac02d3ad5bc7e7@app.getsentry.com/269');
      var expected = {
        protocol: 'https',
        public_key: '8769c40cf49c4cc58b51fa45d8e2d166',
        private_key: '296768aa91084e17b5ac02d3ad5bc7e7',
        host: 'app.getsentry.com',
        path: '',
        project_id: '269'
      };
      dsn.should.eql(expected);
    });

    it('should parse http not on hosted Sentry with path', function(){
      var dsn = raven.utils.parseDSN('http://8769c40cf49c4cc58b51fa45d8e2d166:296768aa91084e17b5ac02d3ad5bc7e7@mysentry.com/some/other/path/269');
      var expected = {
        protocol: 'http',
        public_key: '8769c40cf49c4cc58b51fa45d8e2d166',
        private_key: '296768aa91084e17b5ac02d3ad5bc7e7',
        host: 'mysentry.com',
        path: 'some/other/path',
        project_id: '269'
      };
      dsn.should.eql(expected);
    });

    describe('#parseStack()', function(){
      var stack;
      beforeEach(function(done){
        fs.readFile(__dirname + '/fixtures/stack.txt', 'utf8', function(err, data){
          stack = data;
          done();
        });
      });

      it('should not throw an error', function(done){
        raven.utils.parseStack(stack, done);
      });

      it('should parse the correct number of frames', function(done){
        raven.utils.parseStack(stack, function(err, frames){
          frames.length.should.equal(10);
          done();
        });
      });

      it('should parse all frames correctly', function(done){
        var expected = [{
             'function': 'trace',
              filename: './test/fixtures/stack.js',
              lineno: 11,
              pre_context: ['', 'function bar(a,b,c) {', '  var test=\'yay!\';', '  trace();', '}', '', 'function trace() {'],
              context_line: '  console.log(__stack[1].fun.arguments);',
              post_context: ['}', '', 'foo();', '']
            }, {
             'function': 'bar',
              filename: './test/fixtures/stack.js',
              lineno: 7,
              pre_context: ['function foo() {', '  bar(\'hey\');', '}', '', 'function bar(a,b,c) {', '  var test=\'yay!\';'],
              context_line: '  trace();',
              post_context: ['}', '', 'function trace() {', '  console.log(__stack[1].fun.arguments);', '}', '', 'foo();']
            }, {
             'function': 'foo',
              filename: './test/fixtures/stack.js',
              lineno: 2,
              pre_context: ['function foo() {'],
              context_line: '  bar(\'hey\');',
              post_context: ['}', '', 'function bar(a,b,c) {', '  var test=\'yay!\';', '  trace();', '}', '']
            }, {
             'function': 'Object.<anonymous>',
              filename: './test/fixtures/stack.js',
              lineno: 14,
              pre_context: ['  trace();', '}', '', 'function trace() {', '  console.log(__stack[1].fun.arguments);', '}', ''],
              context_line: 'foo();',
              post_context: ['']
            }, {
             'function': 'Module._compile',
              filename: 'module.js',
              lineno: 441
            }, {
             'function': 'Object..js',
              filename: 'module.js',
              lineno: 459
            }, {
             'function': 'Module.load',
              filename: 'module.js',
              lineno: 348
            }, {
             'function': 'Function._load',
              filename: 'module.js',
              lineno: 308
            }, {
             'function': 'Array.0',
              filename: 'module.js',
              lineno: 479
            }, {
             'function': 'EventEmitter._tickCallback',
              filename: 'node.js',
              lineno: 192
            }];
        raven.utils.parseStack(stack, function(err, frames){
          frames.should.eql(expected);
          done();
        });
      });
    });
  });
});