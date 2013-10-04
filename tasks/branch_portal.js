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
  require('shelljs/global');


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
    function checkRequirements () {
      // Check that required options are set.
      ['branch', 'dir'].forEach( function (element) {
        if (!options.hasOwnProperty(element)) {
          grunt.fail.warn('The "' + element + '" option is required.');
          return false;
        }
      });

      // Check that the dest directory exists
      if(!test('-d', options.dir)) {
        grunt.log.writeln('The target directory "' + options.dir + '" doesn\'t exist. Creating it.');

        if(mkdir(options.dir)) {
          grunt.fail.warn('Unable to create the target directory "' + options.dir + '".');
          return false;
        }
      }

      cd(options.dir);

      return true;
    }

    // Initialize git repo if one doesn't exist
    function initGit () {
      if(!test('-d', path.join(options.dir, '.git'))) {
        grunt.log.writeln("Creating local git repo.");

        if(exec('git init').code !== 0) {
          grunt.fail.warn("Could not initialize the local git repo.");
          return false;
        }
      }

      return true;
    }

    // Create the portal branch if it doesn't exist
    function initBranch () {
      if(exec('git show-ref --verify --quiet refs/heads/' + options.branch).code === 0) {
        return true;
      }

      if(exec('git checkout --orphan ' + options.branch).code !== 0) {
        grunt.fail.warn("Could not create branch.");
        return false;
      }

      grunt.log.writeln('Checking to see if the branch exists remotely...');

      if(exec('git ls-remote --exit-code ' + options.remote + ' ' + options.branch).code === 0) {
        grunt.log.writeln('Remote branch exists.');
        return true;
      }

      grunt.log.writeln('Remote branch does not exist. Adding an initial commit.');

      if(exec('git commit --allow-empty -m "Initial Commit."').code !== 0) {
        grunt.log.writeln('Could not create an initial commit.');
        return false;
      }

      return true;
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
            grunt.log.writeln('There have been no changes, skipping commit.'); //// reword
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
                grunt.log.writeln('Committed changes to branch "' + options.branch + '".');
                grunt.log.writeln(stdout);
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
          grunt.log.writeln('Pushed ' + options.branch + ' to ' + options.remote);
          grunt.log.writeln(stderr);

          // TODO: Give good error messages:
          // - if push doesn't work because of network ?
          // - if push doesn't work because of repo - fix yo shit

          next();
        }
      });
    }

    if(!checkRequirements()) {
      done(false);
      return;
    }

    if(!initGit()) {
      done(false);
      return;
    }

    if(!initBranch()) {
      done(false);
      return;
    }

    done(true);
    return;

    // Run task
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
};
