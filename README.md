# grunt-branch-portal

> Create and manage 'portal' branches that contain only subdirectories of your main branch. Useful for publishing built code to Github Pages.


branch_portal: {
  github: {
    options: {
      branchName: 'the branch to make',
      dir: 'the directory to work in'
      ///
      commit: 'false, automatic: ?what would this be...
      / built from <app branch name>:<app commit>
      , OR an interpolated string.',
      tag: 'false, or interpolated string'
      push: 'false, or {
        remote: 
        branch: '',
      }
      
      [name, url[, force]] to push to
      //
      remote: '[url[, name][, force]] to push to
      ///
    }
  },
}

// one time setup
Must manually add dist dir to app gitignore.
If desired, must manually create new gitignore in app, to be copied to dist.

- This is not a general node git tool. Use grunt-git-xxxwhatever for that
- Preserves commit history in non-local branch
- Works with clean and build task, or as part of build task. 
- can be the same dir for multiple portal branches
- works with existing branches, won't overwrite previous cm history 

What is canonical repo? local or remote? Two ways to set it up, or set it up for both

if main repo gitignore exists
  if !main repo gitignore contains dir /// Should be automatic or manual? 
    node add gitignore to main repo gitignore

if !git in dir exists
  git init

if !remote <remoteName>
  git remote add remoteName remoteRepo

if !branch exists
  create orphan branch

set branch head to the cwd without checking out files
  git symbolic-ref HEAD refs/heads/<branchName>

if commit
  git add .
  git commit "<commitMessage>"

if push
  git push <remoteName> <branchName>

## packages needed

git or just use spawn?

## Similar projects with limitations

https://npmjs.org/package/grunt-github-pages
https://npmjs.org/package/grunt-git-dist
https://npmjs.org/package/grunt-git-selective-deploy

