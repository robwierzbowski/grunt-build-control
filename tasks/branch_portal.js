/*
 * grunt-branch-portal
 * https://github.com/robwierzbowski/grunt-branch-portal
 *
 * Copyright (c) 2013 Rob Wierzbowski
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {
  var exec = require('child_process').exec;
  var fs = require('fs');

  grunt.registerMultiTask('branch_portal', 'Work with branches that version a single directory.', function() {

    var done = this.async();
    var options = this.options({
      commit: false,
      tag: false,
      push: false
    });
    var project = {};

    // Fail if required options are missing
    ['branch', 'dir', 'remote'].forEach( function (element) {
      if (!options.hasOwnProperty(element)) {
        grunt.fail.warn('The "' + element + '" option is required.');
        done(false);
      }
    });

    // Get project information
    function projectInfo (next) {
      // Super minimal flow control. Probably a better way to do this.
      var count = 4;

      fs.readFile('package.json', 'utf8', function (err, data) {
        if (err) {
          project.name = undefined;
        }

        project.name = JSON.parse(data).name; //// or false?
        count -= 1;
        if (count === 0) {
          next();
        }
      });

      exec('git symbolic-ref --quiet HEAD', function (err, stdout) {
        if (err) {
          project.branch = undefined;
        }

        project.branch = stdout.split('/').pop().replace(/\n/g, '');
        count -= 1;
        if (count === 0) {
          next();
        }
      });

      exec('git rev-parse --short HEAD', function (err, stdout) {
        if (err) {
          project.commit = undefined;
        }

        project.commit = stdout.replace(/\n/g, '');
        count -= 1;
        if (count === 0) {
          next();
        }
      });

      exec('git show -s --format=%B HEAD', function (err, stdout) {
        if (err) {
          project.commitMsg = undefined;
        }

        project.commitMsg = stdout;
        count -= 1;
        if (count === 0) {
          next();
        }
      });
    }

    //// Set option = true defaults
    //// need to cwd options.dir before these.

    // Create a git repo if one doesn't exist
    function gitInit (next) {
      fs.stat('.git', function (err, stats) {
        if (err) {
          done(err);
        }
        else if (!stats.isDirectory()) {
          exec('git init', function (err, stdout) {
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
        else {
          next();
        }
      });
    }

    // Create the branch if it doesn't exist
    function branchInit (next) {
      exec('git show-ref --verify --quiet refs/heads/' + options.branch, function (err, stdout) {
        if (err) {
          exec('git checkout --orphan ' + options.branch, function (err, stdout) {
            if (err) {
              grunt.fail.warn(err);
              done(false);
            }
            else {
              grunt.log.write('Creating "' + options.branch + '" branch');
              next();
            }
          });
        }
        else {
          next();
        }
      });
    }

    function commit (next) {
      // Make the current directory the branch HEAD without checking out any
      // files
      exec('git symbolic-ref HEAD refs/heads/' + options.branch, function (err, stdout) {
        if (err) {
          grunt.fail.warn(err);
          done(false);
        }
        else {
          // Skip commit if there are no changes to the working tree
          // http://stackoverflow.com/a/2659808/530653
          // exec('git status --porcelain', function (err, stdout) {
          // exec('git diff-index --quiet HEAD', function (err, stdout) {
          exec('git ls-files --exclude-standard --others', function (err, stdout) { //// might need and && in there
            if (err) {
              grunt.fail.warn(err);
              done(false);
            }
            else if (stdout === '0') {
              // No changes, skip commit
              grunt.log.write('No changes, skipping commit.');
              next();
            }
            else if (stdout === '1') {
              //// continue and commit
              //// create commit msg (true or string)
            }
          });
        }
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
