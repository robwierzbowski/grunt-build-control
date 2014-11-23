module.exports = function (grunt) {
  // add custom tasks
  // NOTE: cwd is `test/mock-repo`
  grunt.loadTasks('../../tasks');


  // test config
  grunt.initConfig({
    buildcontrol: {
      options: {
        dir: 'dist',
        remote: '../remote'
      },
      testing: {
        options: {
          branch: 'master',
          commit: 'This is a commit',
          push: true
        }
      }
    }
  });

  // default task
  grunt.registerTask('default', ['buildcontrol']);
};
