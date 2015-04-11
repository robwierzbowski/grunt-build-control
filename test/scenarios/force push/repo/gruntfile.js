module.exports = function (grunt) {
  // add custom tasks
  // NOTE: cwd is `test/mock`
  grunt.loadTasks('../../../tasks');


  // test config
  grunt.initConfig({
    buildcontrol: {
      options: {
        dir: 'dist',
        remote: '../../remote',
        connectCommits: false,
        force: true
      },
      deploy: {
        options: {
          branch: 'master',
          commit: true,
          message: 'commit to be overwritten',
          push: true
        }
      }
    }
  });

  // default task
  grunt.registerTask('default', ['buildcontrol']);
};
