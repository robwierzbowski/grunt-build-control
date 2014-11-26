module.exports = function (grunt) {
  // add custom tasks
  // NOTE: cwd is `test/mock`
  grunt.loadTasks('../../../tasks');


  // test config
  grunt.initConfig({
    buildcontrol: {
      options: {
        remote: '../../remote',
        connectCommits: false
      },
      setup: {
        options: {
          dir: 'setup',
          remote: '../../remote',
          branch: 'master',
          message: 'setup commit',
          commit: true,
          push: true
        }
      },
      test: {
        options: {
          dir: 'dist',
          branch: 'master',
          message: 'test commit',
          remote: '../../remote',
          commit: true,
          push: true
        }
      }
    }
  });

  // default task
  grunt.registerTask('default', ['buildcontrol:setup', 'buildcontrol:test']);
};
