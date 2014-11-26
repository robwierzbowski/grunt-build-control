module.exports = function(grunt) {
  // add custom tasks
  // NOTE: cwd is `test/mock`
  grunt.loadTasks('../../../tasks');


  // test config
  grunt.initConfig({
    buildcontrol: {
      options: {
        dir: 'dist',
        commit: true,
        connectCommits: false,
        push: true
      },
      stage: {
        options: {
          remote: '../../stage_remote',
          remoteBranch: 'master',
          branch: 'stage',
          message: 'new stage commit'
        }
      },
      production: {
        options: {
          remote: '../../prod_remote',
          remoteBranch: 'master',
          branch: 'prod',
          message: 'new prod commit',
          tag: '0.0.1'
        }
      }
    }
  });

  // default task
  grunt.registerTask('default', ['buildcontrol']);
};
