# grunt-branch-portal

> Create and manage 'portal' branches that contain only subdirectories of your main branch. Useful for publishing built code to Github Pages.


branch_portal: {
  github: {
    options: {
      branchName: 'the branch to make',
      dir: 'the directory to work in'
      remote: ''
      ///
      commit: 'false,
        true: built from <packageName> <appbranchname>:<appcommit>
          // <packageName> commit message: <appcommitmsg>
          // work from gruntfile dir, then cwd to 'dir'
        OR an interpolated string.',
      tag: 'false,
        true: +0.1.0
        `git describe --abbrev=0 --tags`: to get last tag
        +1.1.1 any number, split, add, array.join
        or interpolated string'
        // warning last tag was not a semver
      push: 'false,
        true: git push <remote> HEAD:<branch>
        or force: "" --force
    }
  },
}


// switch style to "ran command: git blah blah"?

// one time setup
Must manually add dist dir to app gitignore.
If desired, must manually create new gitignore in app, to be copied to dist.

- This is not a general node git tool. Use grunt-git-xxxwhatever for that
- Preserves commit history in non-local branch
- Works with clean and build task, or as part of build task. 
- can be the same dir for multiple portal branches
- works with existing branches, won't overwrite previous cm history 

What is canonical repo? local or remote? Two ways to set it up, or set it up for both


<!-- if main repo gitignore exists
  if !main repo gitignore contains dir /// Should be automatic or manual? 
    node add gitignore to main repo gitignore 
    ^^ this should be done manually -->

if !git in dir exists
  git init

<!-- if !remote <remoteName>
  git remote add remoteName remoteRepo -->

if !branch exists
  create orphan branch // get git command

if commit
  set branch head to the cwd without checking out files
    git symbolic-ref HEAD refs/heads/<branch>
  if git working tree clean, grunt log "tree clean no new commit"
    git add .
    git commit "<commitMessage>"

if push
  git push <remote> HEAD:<branch>
  grunt log output, in case push fail or no update

## packages needed

git or just use spawn?
sync with shell.js?

check grunt spawn http://gruntjs.com/api/grunt.util instead of exec.
https://github.com/gruntjs/grunt-contrib-clean/blob/master/tasks/clean.js#L54

better async error pattern
http://stackoverflow.com/questions/13957303/nodejs-grunt-child-process-callback-function-example

note cm uses double quotes, they must escape their own cm messages
switch to regexing/ replacing projectInfo

??? Switch to sync?
??? Better control flow?

??? Is it bad to use callbacks but manip vars in root scope?
remote branch must be created by this package, or you have to pull first, then clear the working directory

??? Maybe try streams for network actions, pushing and pulling

Built with Generator Jekyllrb, branch: master, commit: sakj12
Built from RobSite, commit ^·&%F on branch GitPage


## Similar projects with limitations

https://npmjs.org/package/grunt-github-pages
https://npmjs.org/package/grunt-git-dist
https://npmjs.org/package/grunt-git-selective-deploy

