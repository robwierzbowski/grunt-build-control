module.exports = function (grunt) {
  // add custom tasks
  // NOTE: cwd is `test/mock`
  grunt.loadTasks('../../../tasks');


  // test config
  grunt.initConfig({
    buildcontrol: {
      options: {
        dir: 'dist',
        remote: 'https://github.com/pubUsername/temp.git',
        login: 'privateUsername',
        token: '1234567890abcdef',
        stream: true,
        connectCommits: false
      },
      deploy: {
        options: {
          branch: 'master',
          commit: true,
          message: 'simple deploy commit message',
          push: true
        }
      }
    }
  });

  // default task
  grunt.registerTask('default', ['buildcontrol']);
};
