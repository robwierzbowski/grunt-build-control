/*jshint -W030, mocha:true */
'use strict';

var chai = require('chai');
var expect = chai.expect;
var should = chai.should();

var path = require('path');
var fs = require('fs-extra');
var async = require('async');
var childProcess = require('child_process');
var _ = require('lodash');
var Promise = require('bluebird');


var GRUNT_EXEC = 'node ' + path.resolve('node_modules/grunt-cli/bin/grunt');

/**
 *  @callback scenarioCallback
 * @param {Error} err - If there's an error, this will not be null
 * @param {String} stdout - stdout from running grunt
 * @param {String} stderr - stderr from running grunt
 */

/**
 * Executes a Scenario given by tests.
 * The `describe` block needs to correspond with the name of the Mock folder to be tested
 *
 * A Scenario contains:
 *    repo - the folder to contain the repository
 *    repo/gruntfile.js - the gruntfile to be tested
 *    remote - (optional) folder to be the stand in for the the cloud repository
 *    validate - (will be overwritten) its cloned from remote/ (used to validate a push)
 *
 **
 * NOTE: this function DOES change the process's working directory to the `scenario` so that
 * validations are easier access.
 *
 * @param {scenarioCallback} cb - The callback that handles the response
 */
var execScenario = function(cb) {
  var mockRepoDir = path.normalize(__dirname + '/mock');

  var distDir = path.join(mockRepoDir, 'repo');
  var remoteDir = path.join(mockRepoDir, 'remote');
  var verifyDir = path.join(mockRepoDir, 'validate');

  return Promise.resolve()

    // create the "remote" to be pushed to
    .tap(function () {
      fs.ensureDirSync(remoteDir);
      return childProcessExec('git init --bare', {cwd: remoteDir});
    })

    // make `repo/` a repository
    .tap(function() {
      //return childProcessExec('git init', {cwd: distDir});
    })

    // execute the grunt default command
    .then(function () {
      return childProcessExec(GRUNT_EXEC + ' --no-color', {cwd: distDir});
    })

    // clone the "remote" into "verify/"
    .tap(function () {
      fs.removeSync(verifyDir); // since we're cloning from `remote/` we'll just remove the folder if it exists
      return childProcessExec('git clone remote validate', {cwd: mockRepoDir});
    })
    .then(function (gruntOutput) {
      return cb(gruntOutput.error, gruntOutput.stdout, gruntOutput.stderr);
    });
};


function childProcessExec(command, options) {
  return new Promise(function (resolve) {
    childProcess.exec(command, options, function (err, stdout, stderr) {
      return resolve({
        error: err,
        stdout: stdout,
        stderr: stderr
      });
    });
  });
}




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
  this.timeout(20000);


  beforeEach(function(done) {
    // the describe is the mock folder's name.
    var scenarioPath = this.currentTest.parent.title;

    // ensure that we reset to `test/` dir
    process.chdir(__dirname);

    // clean testing folder `test/mock`
    fs.removeSync('mock');
    fs.ensureDirSync('mock');

    try {
    // copy scenario to `test/mock`
      fs.copySync('scenarios/' + scenarioPath, 'mock');

      // ensure all tests are are assuming the current working directory is: `test/mock`
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
    it('should have pushed a file and had the correct commit in "verify" repo', function () {
      // the current working directory is `test/mock/

      return Promise.resolve()
        .then(function () {
          return childProcessExec('git init', {cwd: 'repo'});
        })
        .then(function () {
          return childProcessExec('git add .', {cwd: 'repo'})
        })
        .then(function () {
          return childProcessExec('git commit -m "basic deployment"', {cwd: 'repo'});
        })

        // verify output from grunt
        .then(function () {
          return execScenario(function (err, stdout, stderr) {
            expect(err).to.equal(null);
            expect(stdout).to.contain('Initialized empty Git repository');
            expect(stdout).to.contain('Committing changes to "master".');
            expect(stdout).to.match(/Built repo from commit \w+ on branch master/g);
            expect(stdout).to.contain('Pushing master to ../../remote');
          });
        })

        // verify that the commit actually got pushed
        .then(function () {
          return childProcessExec('git rev-parse HEAD', {cwd: 'repo'})
        })
        .then(function (results) {
          // the commit sha from the source repo
          return results.stdout.substr(0, 7);
        })

        .then(function (sha) {
          return childProcessExec('git log --pretty=oneline --no-color', {cwd: 'validate'})
            .then(function (results) {
              expect(results.error).to.equal(null);
              expect(results.stdout).have.string('from commit ' + sha);
            });
        });
    });
  });

  describe('feature branch deployment', function() {
    it('should contain the correct sourceBranch name', function(done) {
      var tasks = [];

      /**
       * Test case specific setup
       */
      tasks.push(function git_init(next) {
        childProcess.exec('git init', next);
      });

      tasks.push(function git_init(next) {
        childProcess.exec('git checkout -b feature/numbers', next);
      });

      tasks.push(function git_add(next) {
        childProcess.exec('git add .', next);
      });

      tasks.push(function git_commit(next) {
        childProcess.exec('git commit -m "feature branch deployment"', next);
      });

      /**
       * Execute scenario
       */
      tasks.push(function execute_scenario(next) {
        execScenario(function(err) {
          expect(err).to.not.exist;
          next();
        });
      });

      tasks.push(function verify_commit_message(next) {
        childProcess.exec('git log -1 --pretty=%B', {cwd: 'validate'}, function(err, stdout) {
          var commitMsg = stdout.replace(/\n/g, '');
          expect(commitMsg).to.equal('feature/numbers');
          next();
        });
      });

      async.series(tasks, done);
    });

  });


  describe('merge multiple repos', function() {
    this.timeout(30000);

    it('merge multiple repos', function(done) {
      execScenario(function(err, stdout, stderr) {
        expect(err).to.not.exist;
        var numberFile = fs.readFileSync('validate/numbers.txt', {encoding: 'utf8'});
        expect(numberFile).be.eql('0 1 2\n');
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
          expect(numberFile).be.eql('1 2 3 4\n');
          next();
        });
      });

      tasks.push(function(next) {
        fs.writeFileSync('repo/dist/numbers.txt', '100 200');

        execScenario(function(err, results) {
          var numberFile = fs.readFileSync('validate/numbers.txt', {encoding: 'utf8'});
          expect(numberFile).be.eql('100 200');
          next();
        });
      });

      tasks.push(function(next) {
        childProcess.exec('git log --pretty=oneline --abbrev-commit --no-color', {cwd: 'validate'}, function(err, stdout) {
          expect(stdout).have.string('simple deploy commit message');
          next();
        });
      });

      async.series(tasks, done);
    });


    it('should not have <TOKEN> in the message', function(done) {
      execScenario(function(err, stdout) {
        expect(err).to.not.exist;
        expect(stdout).not.have.string('<TOKEN>');
        done();
      });
    });

  });


  describe('secure endpoint', function() {
    it('should not log out secure information', function(done) {
      var tasks = [];

      tasks.push(function(next) {
        execScenario(function(err, stdout) {
          expect(stdout).not.have.string('privateUsername');
          expect(stdout).not.have.string('1234567890abcdef');
          expect(stdout).have.string('github.com/pubUsername/temp.git');
          expect(stdout).have.string('<CREDENTIALS>');
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
          expect(stdout).have.string('https://privateUsername:1234567890abcdef@github.com/pubUsername/temp.git');
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
          expect(stdout).have.string('a build commit');
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
          expect(stdout).not.have.string('origin/build');
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
          expect(remoteURL).have.string(url);
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
          expect(remoteURL).not.have.string(url);
          expect(remoteURL).be.empty;
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
          expect(stdout).have.string('first stage commit');
          expect(stdout).have.string('new stage commit');
          next();
        });
      });


      tasks.push(function(next) {
        fs.removeSync('prod_validate');
        childProcess.exec('git clone prod_remote prod_validate', next);
      });

      tasks.push(function(next) {
        childProcess.exec('git log --pretty=oneline --abbrev-commit --no-color', {cwd: 'prod_validate'}, function(err, stdout) {
          expect(stdout).have.string('first prod commit');
          expect(stdout).have.string('new prod commit');
          next();
        });
      });

      async.series(tasks, done);
    });


    it('should do it multiple times', function(done) {
      this.timeout(30000);

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
          expect(stdout.match(/new stage commit/g)).be.length(2);
          next();
        });
      });

      tasks.push(function(next) {
        childProcess.exec('git clone prod_remote prod_validate', next);
      });

      tasks.push(function(next) {
        childProcess.exec('git log --pretty=oneline --abbrev-commit --no-color', {cwd: 'prod_validate'}, function(err, stdout) {
          expect(stdout.match(/new prod commit/g)).be.length(2);
          next();
        });
      });

      async.series(tasks, done);
    });
  });


  describe('git config', function() {
    it('should set git config variables properly', function(done) {
      var tasks = [];

      tasks.push(function(next) {
        childProcess.exec('git init', {cwd: 'repo/dist'}, next);
      });

      tasks.push(function(next) {
        execScenario(function(err, stdout, stderr) {
          expect(err).to.not.exist;
          next(err);
        });
      });

      tasks.push(function(next) {
        childProcess.exec('git config user.name', {cwd: 'repo/dist'}, function(err, stdout, stderr) {
          expect(stdout).have.string('John Doe');
          next(err);
        });
      });

      tasks.push(function(next) {
        childProcess.exec('git config user.email', {cwd: 'repo/dist'}, function(err, stdout, stderr) {
          expect(stdout).have.string('johndoe@example.com');
          next(err);
        });
      });

      tasks.push(function(next) {
        childProcess.exec('git config http.sslVerify', {cwd: 'repo/dist'}, function(err, stdout, stderr) {
          expect(stdout).have.string('false');
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
          expect(stdout).have.string('new grunt-build commit');
          next();
        });
      });

      async.series(tasks, done);
    });
  });


  describe('force push', function() {
    beforeEach(function(done) {
      var tasks = [];

      // initialize dist to be a repo and make a commit
      // this commit is a "bad" commit
      tasks.push(function(next) {
        execScenario(next);
      });

      // we set our dist repo to be one commit behind remote
      tasks.push(function(next) {
        childProcess.exec('git reset --hard HEAD^ ', {cwd: 'repo/dist'}, next);
      });


      // now we'll go and diverge.
      // remember we're 1 behind, 1 ahead
      tasks.push(function(next) {
        fs.writeFileSync('repo/dist/numbers.txt', '9 9 9 9');
        childProcess.exec('git commit -m "number 3 commit" .', {cwd: 'repo/dist'}, next);
      });

      async.series(tasks, done);
    });



    it('should force push', function(done) {
      var tasks = [];

      // we're now going to push to the remote, since we've commited before
      // there will be nothing new to commit. This is just a push to remote
      // however, we're forcing remote to track the dist repo.
      tasks.push(function(next) {
        execScenario(function(err, stdout) {
          next(err);
        });
      });

      // the dist repo has 2 commits, namely "number 3 commit"
      // and it should not have the old commit "commit to be overwritten"
      tasks.push(function(next) {
        childProcess.exec('git log --pretty=oneline --abbrev-commit --no-color', {cwd: 'validate'}, function(err, stdout) {
          expect(stdout).have.string('number 3 commit');
          expect(stdout).not.have.string('commit to be overwritten');
          next();
        });
      });


      async.series(tasks, done);
    });
  });


  describe('elastic beanstalk config not found', function() {
    it('should check for an existing eb config', function(done) {
      var tasks = [];

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
        execScenario(function(err, stdout, stderr) {
          expect(err).to.exists;
          expect(stdout).to.match(/config not found/gi);
          next();
        });
      });

      async.series(tasks, done);
    });

  });


  describe('elastic beanstalk config found, deploying', function() {
    it('should check for an existing eb config', function(done) {
      var tasks = [];

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
        execScenario(function(err, stdout, stderr) {
          expect(stdout).to.match(/Deploying to Elastic Beanstalk/gi);
          next();
        });
      });

      async.series(tasks, done);
    });

  });


  describe('connect commits', function () {
    it('should not be able to deploy if there is uncommitted files', function () {
      return Promise.resolve()

        .then(function () {
          return childProcessExec('git init', {cwd: 'repo'});
        })
        .then(function () {
          fs.writeFileSync('repo/file.txt', 'brand file contents.\n');
          return childProcessExec('git add .', {cwd: 'repo'});
        })

        .then(function () {
          return childProcessExec('git commit -m "first commit"', {cwd: 'repo'});
        })

        .then(function () {
          fs.ensureDirSync('repo/build');
          fs.writeFileSync('repo/build/hello.txt', 'hello world!\n');

          // pretend there was some unchanged files
          fs.writeFileSync('repo/file.txt', 'more content added.\n');
          return execScenario(function (err, stdout, stderr) {
            expect(err).to.not.equal(null);
            expect(stdout).to.contain('more content added.');
            expect(stdout).to.contain('Warning: There are uncommitted changes in your working directory.');
          });
        });
    });
  });


  describe('quiet fetch', function () {
    it('should suppress fetch progress if the `fetchProgress` flag is unset', function () {
      return Promise.resolve()

        // Create the remote
        .then(function() {
          return execScenario(function() {});
        })

        .then(function () {
          // Make the working copy 'fresh'
          fs.remove('repo/dist/.git');

          // Add a new file to it
          fs.writeFileSync('repo/dist/hello.txt', 'hello world!\n');

          // Run the scenario, it should fetch the remote repo before committing.
          return execScenario(function (err, stdout, stderr) {
            expect(err).to.equal(null);
            expect(stdout).not.to.contain('Counting objects');
          });
        });
    });
  });
});
