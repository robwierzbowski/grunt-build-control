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
        connectCommits: false
      },
      deploy: {
        options: {
          branch: 'master',
          commit: true,
          message: 'simple deploy commit message',
          push: true,
          fetchProgress: false
        }
      }
    }
  });

  // default task
  grunt.registerTask('default', ['buildcontrol']);
};
