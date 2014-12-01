module.exports = function (grunt) {
  // add custom tasks
  // NOTE: cwd is `test/mock`
  grunt.loadTasks('../../../tasks');


  // test config
  grunt.initConfig({
    buildcontrol: {
      options: {
        remote: 'origin',
        connectCommits: false
      },
      deploy: {
        options: {
          branch: 'master',
          commit: true,
          message: 'new grunt-build commit',
          push: true
        }
      }
    }
  });

  // default task
  grunt.registerTask('default', ['buildcontrol']);
};
