/*
 * grunt-branch-portal
 * https://github.com/robwierzbowski/grunt-branch-portal
 *
 * Copyright (c) 2013 Rob Wierzbowski
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {
  var fs = require('fs');
  var path = require('path');
  var exec = require('child_process').exec;

  grunt.registerMultiTask('branch_portal', 'Work with branches that version a single directory.', function() {

    var done = this.async();
    var options = this.options({
      commit: false,
      tag: false,
      push: false
    });
    var sourceInfo = {};
    var commitMsg = 'Built from %sourceName%, commit %sourceCommit% on branch %sourceBranch%' +
      '\n\n%sourceName% commit message:\n' +
      '%sourceCommitMsg%';

    // Fail if required options are missing
    ['branch', 'dir', 'remote'].forEach( function (element) {
      if (!options.hasOwnProperty(element)) {
        grunt.fail.warn('The "' + element + '" option is required.');
        done(false);
      }
    });

    // Get project information
    function buildSourceInfo (next) {
      // Super minimal flow control. Probably a better way to do this.
      var count = 4;

      fs.readFile('package.json', 'utf8', function (err, data) {
        if (err) {
          sourceInfo.name = '(unavailable)';
        }

        sourceInfo.name = JSON.parse(data).name;
        count -= 1;
        if (count === 0) {
          next();
        }
      });

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

      exec('git show -s --format=%B HEAD', function (err, stdout) {
        if (err) {
          sourceInfo.commitMsg = '(unavailable)';
        }

        sourceInfo.commitMsg = stdout;
        count -= 1;
        if (count === 0) {
          next();
        }
      });
    }

    function buildCommitMsg (next) {
      if (typeof options.commit === 'string') {
        commitMsg = options.commit;
      }
      // Replace tokens with sourceInfo and sanitize so we can use it as a
      // shell command
      commitMsg = commitMsg.replace(/%sourceName%/g, sourceInfo.name)
                  .replace(/%sourceCommit%/g, sourceInfo.commit)
                  .replace(/%sourceBranch%/g, sourceInfo.branch)
                  .replace(/%sourceCommitMsg%/g, sourceInfo.commitMsg);
      next();
    }

    // Create a git repo if one doesn't exist
    function gitInit (next) {
      fs.stat(options.dir, function (err, stats) {
        if (err) {
          grunt.fail.warn('The target directory "' + options.dir + '" must exist.');
          done(false);
        }
      });

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

    // Create the branch if it doesn't exist
    function branchInit (next) {
      exec('git show-ref --verify --quiet refs/heads/' + options.branch, {cwd: options.dir}, function (err, stdout) {
        if (err) {
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
          next();
        }
      });
    }

    // Make the current directory the branch HEAD without checking out files
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

    // Stage and commit to a branch
    function commit (next) {
      // Unstage any changes, just in case
      exec('git reset', {cwd: options.dir}, function (err, stdout) {
        if (err) {
          grunt.fail.warn(err);
          done(false);
        }
        // Check for changes. Using a porcelain command, but it works.
        // See http://stackoverflow.com/a/2659808/530653
        exec('git status --porcelain', {cwd: options.dir}, function (err, stdout) {
          if (err) {
            grunt.fail.warn(err);
            done(false);
          }
          else if (stdout === '') {
            // No changes, skip commit
            grunt.log.write('No changes, skipping commit.'); //// reword
            next();
          }
          else if (stdout) {
            // Stage that shizz and commit
            exec('git add . && git commit -m "' + commitMsg + '"', {cwd: options.dir}, function (err, stdout) {
              if (err) {
                grunt.fail.warn(err);
                done(false);
              }
              else {
                grunt.log.write('Committed: ' + commitMsg);
                next();
              }
            });
          }
        });
      });
    }

    //// Not started Yet
    //// have to check if working dir si clean too to prevent tag stacks? that's not going to work, tag after commit... check if there's an equal tag already. Don't double up tags
    //// Limitation : will not double up tags on the latest commit
    function tag (next) {
      exec('git xxx', function (err, stdout) {
        if (err) {
          grunt.fail.warn(err);
          done(false);
        }
        else {
          grunt.log.write(stdout);
          next();
        }
      });
    }

    //// Not started Yet
    function push (next) {
      exec('git xxx', function (err, stdout) {
        if (err) {
          grunt.fail.warn(err);
          done(false);
        }
        else {
          grunt.log.write(stdout);
          next();
        }
      });
    }

    // Write the destination file.
    // grunt.file.write(f.dest, src);

    // Print a success message.
    // grunt.log.writeln('File "' + f.dest + '" created.');
  });
};
