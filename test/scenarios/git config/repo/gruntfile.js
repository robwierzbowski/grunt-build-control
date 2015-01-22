module.exports = function (grunt) {
  // add custom tasks
  // NOTE: cwd is `test/mock`
  grunt.loadTasks('../../../tasks');


  // test config
  grunt.initConfig({
    buildcontrol: {
      options: {
        config: {
          "user.name": "John Doe",
          "user.email": "johndoe@example.com"
        }
      },
      deploy: {
        options: {
          branch: 'master',
          commit: true,
          message: 'git config deploy message',
          push: true
        }
      }
    }
  });

  // default task
  grunt.registerTask('default', ['buildcontrol']);
};
