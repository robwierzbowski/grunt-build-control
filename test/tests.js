/*jshint -W030 */

'use strict';

var path = require('path');
var fs = require('fs-extra');
var async = require('async');
var childProcess = require('child_process');
var should = require('chai').should();
var _ = require('lodash');


var GRUNT_EXEC = 'node ' + path.resolve('node_modules/grunt-cli/bin/grunt');



/**
 * Executes a Scenario given by tests.
 *
 * A Scenario can contain:
 *    repo - the folder to contain the repository
 *    repo/gruntfile.js - the gruntfile to be tested
 *    remote - (optional) can contain a setup cloud repository
 *    validate - (will be overwritten) it is cloned from remote (used to validate a push)
 *
 **
 * NOTE: this function DOES change the process's working directory to the `scenario` so that
 * validations are easier access.
 */
var execScenario = function(cb) {
  var mockRepoDir = path.normalize(__dirname + '/mock');

  var distDir = path.join(mockRepoDir, 'repo');
  var remoteDir = path.join(mockRepoDir, 'remote');
  var verifyDir = path.join(mockRepoDir, 'validate');


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

    childProcess.exec(GRUNT_EXEC, {cwd: distDir}, function(err, stdout, stderr) {
      next(err, {stdout: stdout, stderr: stderr});
    });
  });


  tasks.push(function createVerifyFromRemote(next) {
    fs.removeSync(verifyDir); // since we're cloning from `remote/` we'll just remove the folder if it exists
    childProcess.exec('git clone remote validate', {cwd: mockRepoDir}, function(err) {
      if (err) throw new Error(err);
      next(err);
    });
  });


  async.series(tasks, function returnCallbackStatus(err, results) {
    // return results from executeGruntCommand
    cb(err, results[1].stdout, results[1].stderr);
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
 *    - each tests' current working directory has been set to `test/mock`
 */
describe('buildcontrol', function() {
  this.timeout(10000);


  beforeEach(function(done) {
    var scenarioPath = this.currentTest.parent.title;

    // ensure that we reset to `test/` dir
    process.chdir(__dirname);

    // clean testing folder `test/mock`
    fs.removeSync('mock');
    fs.ensureDirSync('mock');

    try {
    // copy scenario to `test/mock`
      fs.copySync('scenarios/' + scenarioPath, 'mock');

      // ensure all tests are are using the working directory: `test/mock`
    process.chdir('mock');

      done();
    }
    catch (err) {
      if (err && err.code === 'ENOENT')
        throw new Error('could not find scenario "' + scenarioPath + '" in test/scenarios/');

      throw new Error(err);
    }
  });



  describe('basic deployment', function() {
    it('should have pushed a file and had the correct commit in "verify" repo', function(done) {
      // the working directory is `test/mock`.
      var tasks = [];

      /**
       * Test case specific setup
       */
        // make `mock` a actual repository
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
        fs.existsSync('validate/empty_file').should.be.true;
        next();
      });

      tasks.push(function verify_commit_message(next) {
        childProcess.exec('git rev-parse HEAD', function(err, sha) {
          sha = sha.substr(0, 7);

          childProcess.exec('git log --pretty=oneline --no-color', {cwd: 'validate'}, function(err, stdout) {
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
      execScenario(function(err, stdout, stderr) {
        should.not.exist(err);
        var numberFile = fs.readFileSync('validate/numbers.txt', {encoding: 'utf8'});
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
          var numberFile = fs.readFileSync('validate/numbers.txt', {encoding: 'utf8'});
          numberFile.should.be.eql('1 2 3 4\n');
          next();
        });
      });

      tasks.push(function(next) {
        fs.writeFileSync('repo/dist/numbers.txt', '100 200');

        execScenario(function(err, results) {
          var numberFile = fs.readFileSync('validate/numbers.txt', {encoding: 'utf8'});
          numberFile.should.be.eql('100 200');
          next();
        });
      });

      tasks.push(function(next) {
        childProcess.exec('git log --pretty=oneline --abbrev-commit --no-color', {cwd: 'validate'}, function(err, stdout) {
          stdout.should.have.string('simple deploy commit message');
          next();
        });
      });

      async.series(tasks, done);
    });


    it('should not have <TOKEN> in the message', function(done) {
      execScenario(function(err, stdout) {
        should.not.exist(err);
        stdout.should.not.have.string('<TOKEN>');
        done();
      });
    });

  });


  describe('secure endpoint', function() {
    it('should not log out secure information', function(done) {
      var tasks = [];

      tasks.push(function(next) {
        execScenario(function(err, stdout) {
          stdout.should.not.have.string('privateUsername');
          stdout.should.not.have.string('1234567890abcdef');
          stdout.should.have.string('github.com/pubUsername/temp.git');
          stdout.should.have.string('<CREDENTIALS>');
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
        childProcess.exec('git remote -v', {cwd: 'repo/dist'}, function(err, stdout) {
          stdout.should.have.string('https://privateUsername:1234567890abcdef@github.com/pubUsername/temp.git');
          next();
        });
      });

      async.series(tasks, done);
    });

  });


  describe('untracked branch in src repo', function() {
    it('should track a branch in ../ if it was untracked', function(done) {
      var tasks = [];

      tasks.push(function(next) {
        fs.removeSync('repo');
        childProcess.exec('git clone remote repo', next);
      });


      tasks.push(function(next) {
        fs.ensureDirSync('repo/build');
        fs.writeFileSync('repo/build/hello.txt', 'hello world!');
        next();
      });

      //tasks.push(function(next) { childProcess.exec('git branch --track build origin/build', {cwd: 'repo'}, next); });

      tasks.push(function(next) {
        execScenario(function(err, stdout) {
          next(err);
        });
      });

      tasks.push(function(next) {
        childProcess.exec('git checkout build', {cwd: 'repo'}, function(err, stdout) {
          next();
        });
      });

      tasks.push(function(next) {
        childProcess.exec('git log', {cwd: 'repo'}, function(err, stdout) {
          stdout.should.have.string('a build commit');
          next();
        });
      });

      async.series(tasks, done);
    });


    it('should not set tracking info it branch already exists', function(done) {
      var tasks = [];

      tasks.push(function(next) {
        fs.removeSync('repo');
        childProcess.exec('git clone remote repo', next);
      });

      tasks.push(function(next) {
        childProcess.exec('git branch build', {cwd: 'repo'}, next);
      });

      tasks.push(function(next) {
        fs.ensureDirSync('repo/build');
        fs.writeFileSync('repo/build/hello.txt', 'hello world!');
        next();
      });

      tasks.push(function(next) {
        execScenario(function(err, stdout) {
          next(err);
        });
      });

      tasks.push(function(next) {
        childProcess.exec('git branch -lvv', {cwd: 'repo'}, function(err, stdout) {
          stdout.should.not.have.string('origin/build');
          next();
        });
      });

      async.series(tasks, done);
    });

  });


  describe('remote urls', function() {
    function generateRemote(url, cb) {
      var tasks = [];

      // read template
      var gruntfile = fs.readFileSync('repo/gruntfile.js', {encoding: 'UTF8'});

      // generate template
      gruntfile = _.template(gruntfile, {remoteURL: url});

      // write generated gruntfile
      fs.writeFileSync('repo/gruntfile.js', gruntfile);

      // execute grunt command
      tasks.push(function(next) {
        //options
        GRUNT_EXEC += ' --no-color';

        childProcess.exec(GRUNT_EXEC, {cwd: 'repo'}, function(err, stdout, stderr) {
          // mask error because remote paths may not exist
          next(null, {stdout: stdout, stderr: stderr});
        });
      });

      // get remote url
      tasks.push(function(next) {
        childProcess.exec('git remote -v', {cwd: 'repo/dist'}, function(err, stdout) {
          next(err, stdout);
        });
      });

      // callback
      async.series(tasks, function(err, results) {
        cb(err, results[1]);
      });
    }


    var shouldMatch = [
      '/path/to/repo.git/',
      'path/to/repo.git/',
      '/path/to/repo',
      //'\\\\path\\\\to\\\\repo',   // assuming works, there's a lot of escaping to be done
      'path/to/repo',
      'C:/user/repo',
      'file:///path/to/repo.git/',
      'git://github.com:kevinawoo/temp.git',
      'git@github.com:kevinawoo/temp.git',
      'http://git.com/path/to/repo.git/',
      'https://github.com/user/repo',
      'ssh://user@server/project.git',
      'user@server:project.git',
      '../'
    ];


    async.each(shouldMatch, function(url) {
      it('should have created remote for: ' + url, function(done) {
        generateRemote(url, function(err, remoteURL) {
          remoteURL.should.have.string(url);
          done();
        });
      });
    });


    var shouldNotMatch = [
      'origin',
      'weird$1+name',
      'remote_name',
      'remote_name_extended',
      'remote-name',
      'remote.test'
    ];

    async.each(shouldNotMatch, function(url) {
      it('should not have created remote for: ' + url, function(done) {
        generateRemote(url, function(err, remoteURL) {
          remoteURL.should.not.have.string(url);
          remoteURL.should.be.empty;
          done();
        });
      });
    });

  });


  describe('push diff branches', function() {
    it('should push local:stage to stage:master and local:prod to prod:master', function(done) {
      var tasks = [];

      tasks.push(function(next) {
        execScenario(function(err, stdout) {
          fs.removeSync('validate');  // not needed because there's two diff remotes
          next(err);
        });
      });

      tasks.push(function(next) {
        fs.removeSync('stage_validate');
        childProcess.exec('git clone stage_remote stage_validate', next);
      });

      tasks.push(function(next) {
        childProcess.exec('git log --pretty=oneline --abbrev-commit --no-color', {cwd: 'stage_validate'}, function(err, stdout) {
          stdout.should.have.string('first stage commit');
          stdout.should.have.string('new stage commit');
          next();
        });
      });


      tasks.push(function(next) {
        fs.removeSync('prod_validate');
        childProcess.exec('git clone prod_remote prod_validate', next);
      });

      tasks.push(function(next) {
        childProcess.exec('git log --pretty=oneline --abbrev-commit --no-color', {cwd: 'prod_validate'}, function(err, stdout) {
          stdout.should.have.string('first prod commit');
          stdout.should.have.string('new prod commit');
          next();
        });
      });

      async.series(tasks, done);
    });


    it('should do it multiple times', function(done) {
      this.timeout(15000);

      var tasks = [];

      tasks.push(function(next) {
        execScenario(next);
      });

      tasks.push(function(next) {
        fs.writeFileSync('repo/dist/empty_file', 'file not empty anymore');
        next();
      });

      tasks.push(function(next) {
        execScenario(next);
      });

      tasks.push(function(next) {
        childProcess.exec('git clone stage_remote stage_validate', next);
      });

      tasks.push(function(next) {
        childProcess.exec('git log --pretty=oneline --abbrev-commit --no-color', {cwd: 'stage_validate'}, function(err, stdout) {
          stdout.match(/new stage commit/g).should.be.length(2);
          next();
        });
      });

      tasks.push(function(next) {
        childProcess.exec('git clone prod_remote prod_validate', next);
      });

      tasks.push(function(next) {
        childProcess.exec('git log --pretty=oneline --abbrev-commit --no-color', {cwd: 'prod_validate'}, function(err, stdout) {
          stdout.match(/new prod commit/g).should.be.length(2);
          next();
        });
      });

      async.series(tasks, done);
    });
  });


  describe('git config', function(done) {
    it('should set git config variables properly', function(done) {
      var tasks = [];

      tasks.push(function(next) {
        childProcess.exec('git init', {cwd: 'repo/dist'}, next);
      });

      tasks.push(function(next) {
        execScenario(function(err, stdout, stderr) {
          should.not.exist(err);
          next(err);
        });
      });

      tasks.push(function(next) {
        childProcess.exec('git config user.name', {cwd: 'repo/dist'}, function(err, stdout, stderr) {
          stdout.should.have.string('John Doe');
          next(err);
        });
      });

      async.series(tasks, done);
    });
  });


  describe('deploy to named remote', function() {
    it('should have deployed to origin', function(done) {
      var tasks = [];

      tasks.push(function(next) {
        childProcess.exec('git init', {cwd: 'repo/dist'}, next);
      });

      tasks.push(function(next) {
        childProcess.exec('git remote add origin ../../remote', {cwd: 'repo/dist'}, next);
      });

      tasks.push(function(next) {
        execScenario(next);
      });

      tasks.push(function(next) {
        childProcess.exec('git log --pretty=oneline --abbrev-commit --no-color', {cwd: 'validate'}, function(err, stdout) {
          stdout.should.have.string('new grunt-build commit');
          next();
        });
      });

      async.series(tasks, done);
    });
  });
});
