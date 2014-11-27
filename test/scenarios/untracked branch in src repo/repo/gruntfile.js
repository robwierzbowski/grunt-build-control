module.exports = function (grunt) {
  // add custom tasks
  // NOTE: cwd is `test/mock-repo`
  grunt.loadTasks('../../../tasks');


  // test config
  grunt.initConfig({
    buildcontrol: {
      build: {
        options: {
          branch: 'build',
          remote: '../'
        }
      },
      options: {
        commit: true,
        dir: 'build',
        message: 'a build commit',
        push: true,
        connectCommits: false     // for easier testing
      }
    }
  });

  // default task
  grunt.registerTask('default', ['buildcontrol']);
};
