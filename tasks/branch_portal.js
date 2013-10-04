/*
 * grunt-branch-portal
 * https://github.com/robwierzbowski/grunt-branch-portal
 *
 * Copyright (c) 2013 Rob Wierzbowski
 * Licensed under the MIT license.
 */

//// Output:
// grunt branch_portal:def
// Running "branch_portal:def" (branch_portal) task
// Commiting changes to branch "breancho".[breancho 1dfb3b9] Built from %sourceName%, commit undefined on branch undefined
//  4 files changed, 1 insertion(+)
//  rename corbu.js => gharn.css (100%)
//  create mode 100644 stopo.css
//  create mode 100644 this01.js
// Pushing breancho to git@github.com:robwierzbowski/grunt-portal-branch.gitTo git@github.com:robwierzbowski/grunt-portal-branch.git
//  * [new branch]      HEAD -> breancho

//// Add linebreaks
//// fix output
//// fix cm token replacement

'use strict';

module.exports = function (grunt) {
  var fs = require('fs');
  var path = require('path');
  var exec = require('child_process').exec;

  grunt.registerMultiTask('branch_portal', 'Work with branches that version a single directory.', function() {

    var done = this.async();
    var options = this.options({
      commit: false,
      push: false,
      commitMsg: 'Built from %sourceName%, commit %sourceCommit% on branch %sourceBranch%',
      force: false
    });
    var sourceInfo = {};

    // Check that requirements are met
    function checkRequirements (next) {
      // Check that required options are set. Sync function
      ['branch', 'dir'].forEach( function (element) {
        if (!options.hasOwnProperty(element)) {
          grunt.fail.warn('The "' + element + '" option is required.');
          done(false);
        }
      });

      // Check that the target directory exists
      fs.stat(options.dir, function (err, stats) {

        if (err) {
          grunt.log.writeln('The target directory "' + options.dir + '" doesn\'t exist. Creating it.');

          // Create the target directory if it doesn't exist.
          fs.mkdir(options.dir, function (err, stats) {
            if (err) {
              grunt.fail.warn('Unable to create the target directory "' + options.dir + '".');
              done(false);
              return;
            }

            next();
          });
        }
        else {
          next();
        }
      });
    }

    // Get source project information for %tokens%
    function buildSourceInfo (next) {
      // Super minimal flow control. Probably a better way to do this.
      var count = 2;

      exec('git symbolic-ref --quiet HEAD', function (err, stdout) {
        if (err) {
          sourceInfo.branch = '(unavailable)';
        }

        sourceInfo.branch = stdout.split('/').pop().replace(/\n/g, '');
        count -= 1;
        if (count === 0) {
          next();
        }
      });

      exec('git rev-parse --short HEAD', function (err, stdout) {
        if (err) {
          sourceInfo.commit = '(unavailable)';
        }

        sourceInfo.commit = stdout.replace(/\n/g, '');
        count -= 1;
        if (count === 0) {
          next();
        }
      });
    }

    // Initialize git repo if one doesn't exist
    // TODO: check that this errs and creates git repo correctly
    function initGit (next) {
      fs.stat(path.join(options.dir, '.git'), function (err, stats) {
        if (err) {
          exec('git init', {cwd: options.dir}, function (err, stdout) {
            if (err) {
              grunt.fail.warn(err);
              done(false);
            }
            grunt.log.write('Creating empty git repository in ' + options.dir);
            next();
          });
        }
        else {
          next();
        }
      });
    }

    // Create the portal branch if it doesn't exist
    // TODO: if branch is new needs a blank / initial commit
    function initBranch (next) {
      exec('git show-ref --verify --quiet refs/heads/' + options.branch, {cwd: options.dir}, function (err, stdout) {
        if (err) {
          // If the branch doesn't exist locally create an orphan branch
          exec('git checkout --orphan ' + options.branch, {cwd: options.dir}, function (err, stdout) {
            if (err) {
              grunt.fail.warn(err);
              done(false);
            }
            else {
              grunt.log.write('Creating new "' + options.branch + '" branch');
              next();
            }
          });
        }
        else {
          // Branch exists, continue
          next();
        }
      });
    }

    // Make the current working tree the branch HEAD without checking out files
    function safeCheckout (next) {
      exec('git symbolic-ref HEAD refs/heads/' + options.branch, {cwd: options.dir}, function (err, stdout) {
        if (err) {
          grunt.fail.warn(err);
          done(false);
        }
        else {
          next();
        }
      });
    }


    // TODO: Pull/fetch before each commit
    // Stage and commit to a branch
    function gitCommit (next) {
      var commitMsg;

      // Unstage any changes, just in case
      exec('git reset', {cwd: options.dir}, function (err, stdout) {
        if (err) {
          grunt.fail.warn(err);
          done(false);
        }
        // Make sure there are differneces to commit
        exec('git status --porcelain', {cwd: options.dir}, function (err, stdout) {
          if (err) {
            grunt.fail.warn(err);
            done(false);
          }
          else if (stdout === '') {
            // No changes, skip commit
            grunt.log.write('There have been no changes, skipping commit.'); //// reword
            next();
          }
          else if (stdout) {
            // Parse tokens in commit message
            commitMsg = options.commitMsg.replace(/%sourceCommit%/g, sourceInfo.commit)
                                         .replace(/%sourceBranch%/g, sourceInfo.branch);

            // Stage and commit
            exec('git add -A . && git commit -m "' + commitMsg + '"', {cwd: options.dir}, function (err, stdout) {
              if (err) {
                grunt.fail.warn(err);
                done(false);
              }
              else {
                grunt.log.write('Committed changes to branch "' + options.branch + '".');
                grunt.log.write(stdout);
                next();
              }
            });
          }
        });
      });
    }

    // Push portal branch to the remote
    function gitPush (next) {
      var args = '';

      // TODO: Impliment later
      // if (options.force) {
      //   args += '-f ';
      // }

      exec('git push ' + args + options.remote + ' HEAD:' + options.branch, {cwd: options.dir}, function (err, stdout, stderr) {
        if (err) {
          grunt.fail.warn(err);
          done(false);
        }
        else {
          grunt.log.write('Pushed ' + options.branch + ' to ' + options.remote);
          grunt.log.write(stderr);

          // TODO: Give good error messages:
          // - if push doesn't work because of network ?
          // - if push doesn't work because of repo - fix yo shit

          next();
        }
      });
    }

    // Run task
    checkRequirements( function () {
      initGit( function () {
        initBranch( function () {
          safeCheckout( function () {
            if (options.push) {
              gitCommit( function () {
                gitPush( function () {
                  done(true);
                });
              });
            }
            else if (options.commit) {
              gitCommit( function () {
                done(true);
              });
            }
          });
        });
      });
    });
  });
};
