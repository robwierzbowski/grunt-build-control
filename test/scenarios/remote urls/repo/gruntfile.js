module.exports = function (grunt) {
  // add custom tasks
  // NOTE: cwd is `test/mock`
  grunt.loadTasks('../../../tasks');


  // test config
  grunt.initConfig({
    buildcontrol: {
      options: {
        dir: 'dist',
        remote: '<%= remoteURL %>',
        connectCommits: false
      },
      deploy: {
        options: {
          branch: 'master',
          commit: false,
          message: 'simple deploy commit message',
          push: false
        }
      }
    }
  });

  // default task
  grunt.registerTask('default', ['buildcontrol']);
};
