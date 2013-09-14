/*
 * grunt-branch-portal
 * https://github.com/robwierzbowski/grunt-branch-portal
 *
 * Copyright (c) 2013 Rob Wierzbowski
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {
  //// Require tasks here

  grunt.registerMultiTask('branch_portal', 'Your task description goes here.', function() {
    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      // punctuation: '.',
      // separator: ', '
    });

    // Write the destination file.
    // grunt.file.write(f.dest, src);

    // Print a success message.
    // grunt.log.writeln('File "' + f.dest + '" created.');
  });
};
