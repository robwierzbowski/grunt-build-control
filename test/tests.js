/*jshint -W030 */

'use strict';

var path = require('path');
var fs = require('fs-extra');
var async = require('async');
var childProcess = require('child_process');
var should = require('chai').should();


var GRUNT_EXEC = 'node ' + path.resolve('node_modules/grunt-cli/bin/grunt');



/**
 * Executes a Scenario given by tests.
 *
 * - A scenario has a `gruntfile.js` configuration.
 * - Each build task will upload to a mock repo (folder name is `remote`)
 * - It then clones the remote to `verify`. Validations can be done in the `verify` folder
 *
 * NOTE: this function DOES change the process's working directory to the `scenario` so that
 * validations are easier access.
 */
var execScenario = function(cb) {
  var mockRepoDir = path.normalize(__dirname + '/mock-repo');

  var remoteDir = path.join(mockRepoDir, 'remote');
  var verifyDir = path.join(mockRepoDir, 'verify');


  var tasks = [];


  tasks.push(function createRemote(next) {
    fs.ensureDirSync(remoteDir);
    childProcess.exec('git init --bare', {cwd: remoteDir}, function(err) {
      if (err) throw new Error(err);
      next(err);
    });
  });


  tasks.push(function executeGruntCommand(next) {
    //options
    GRUNT_EXEC += ' --no-color';

    childProcess.exec(GRUNT_EXEC, {cwd: mockRepoDir}, function(err, stdout, stderr) {
      next(err, {stdout: stdout, stderr: stderr});
    });
  });


  tasks.push(function createVerifyFromRemote(next) {
    fs.removeSync(verifyDir); // since we're cloning from `remote/` we'll just remove the folder if it exists
    childProcess.exec('git clone remote verify', {cwd: mockRepoDir}, function(err) {
      if (err) throw new Error(err);
      next(err);
    });
  });


  async.series(tasks, function returnCallbackStatus(err, results) {
    // return results from executeGruntCommand
    cb(err, results[1]);
  });
};



/**
 * Tests
 *
 * Each test is using the perspective as a "user", take a look at the "basic deploy" suite.
 *
 * `describe` suite's title should have the same name as the scenario folder.
 *
 * Assumptions:
 *    - each tests' current working directory has been set to `test/mock-repo`
 */
describe('buildcontrol', function() {
  this.timeout(10000);


  beforeEach(function(done) {
    // ensure that we reset to `test/` dir
    process.chdir(__dirname);

    // clean testing folder `test/mock-repo`
    fs.removeSync('mock-repo');
    fs.ensureDirSync('mock-repo');

    // copy scenario to `test/mock-repo`
    fs.copySync('scenarios/' + this.currentTest.parent.title, 'mock-repo');

    // ensure all tests are are using the working directory: `test/mock-repo`
    process.chdir('mock-repo');
    done();
  });



  describe('basic deployment', function() {
    it('should have pushed a file and had the correct commit in "verify" repo', function(done) {
      // the working directory is `test/mock-repo`.
      var tasks = [];

      /**
       * Test case specific setup
       */
        // make `mock-repo` a actual repository
      tasks.push(function git_init(next) {
        childProcess.exec('git init', next);
      });

      tasks.push(function git_add(next) {
        childProcess.exec('git add .', next);
      });

      tasks.push(function git_commit(next) {
        childProcess.exec('git commit -m "basic deployment"', next);
      });

      /**
       * Execute scenario
       */
      tasks.push(function execute_scenario(next) {
        execScenario(function(err) {
          should.not.exist(err);
          next();
        });
      });

      /**
       * Should style validations
       */
      tasks.push(function verify_file_exists(next) {
        fs.existsSync('verify/empty_file').should.be.true;
        next();
      });

      tasks.push(function verify_commit_message(next) {
        childProcess.exec('git rev-parse HEAD', function(err, sha) {
          sha = sha.substr(0, 7);

          childProcess.exec('git log --pretty=oneline --no-color', {cwd: 'verify'}, function(err, stdout) {
            stdout.should.have.string('from commit ' + sha);
            next();
          });
        });
      });

      async.series(tasks, done);
    });




  });


  describe('merge multiple repos', function() {
    it('merge multiple repos', function(done) {
      execScenario(function(err, results) {
        should.not.exist(err);
        var numberFile = fs.readFileSync('verify/numbers.txt', {encoding: 'utf8'});
        numberFile.should.be.eql('0 1 2\n');
        done();
      });
    });

  });


  describe('simple deploy', function() {
    it('should deploy multiple times with the correct commit message', function(done) {
      var tasks = [];

      tasks.push(function(next) {
        execScenario(function() {
          var numberFile = fs.readFileSync('verify/numbers.txt', {encoding: 'utf8'});
          numberFile.should.be.eql('1 2 3 4\n');
          next();
        });
      });

      tasks.push(function(next) {
        fs.writeFileSync('dist/numbers.txt', '100 200');

        execScenario(function(err, results) {
          var numberFile = fs.readFileSync('verify/numbers.txt', {encoding: 'utf8'});
          numberFile.should.be.eql('100 200');
          next();
        });
      });

      tasks.push(function(next) {
        childProcess.exec('git log --pretty=oneline --abbrev-commit --no-color', {cwd: 'verify'}, function(err, stdout) {
          stdout.should.have.string('simple deploy commit message');
          next();
        });
      });

      async.series(tasks, done);
    });


    it('should not have <TOKEN> in the message', function(done) {
      execScenario(function(err, result) {
        should.not.exist(err);
        result.stdout.should.not.have.string('<TOKEN>');
        done();
      });
    });

  });


  describe('secure endpoint', function() {
    it('should not log out secure information', function(done) {
      var tasks = [];

      tasks.push(function(next) {
        execScenario(function(err, results) {
          results.stdout.should.not.have.string('privateUsername');
          results.stdout.should.not.have.string('1234567890abcdef');
          results.stdout.should.have.string('github.com/pubUsername/temp.git');
          results.stdout.should.have.string('<CREDENTIALS>');
          next();
        });
      });

      async.series(tasks, done);
    });


    it('should have the correct remote url in git', function(done) {
      var tasks = [];

      tasks.push(function(next) {
        execScenario(function() {
          next();
        });
      });

      tasks.push(function(next) {
        childProcess.exec('git remote -v', {cwd: 'dist'}, function(err, stdout) {
          stdout.should.have.string('https://privateUsername:1234567890abcdef@github.com/pubUsername/temp.git');
          next();
        });
      });

      async.series(tasks, done);
    });

  });

});
