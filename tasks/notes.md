grunt dist portal
grunt branch portal
grunt portal branch
grunt git deploy branch
grunt dir branch

grunt directory branch
grunt branch portal


## todo

check current

take out all the else from fails

commit 
tag 
push

If the branch you want exists on remote but not in the portal repo, manually fetch and check it out inside the portal repo

## Options

branch name
directory to create in
repo location
commit message pattern
push?

switch to only-if-push-option remote is required

 Tell grunt this task is asynchronous.
var done = this.async();

http.get(pathToRead, function(res) {
  // Pipe the data from the response stream to
  // a static file.
  res.pipe(fs.createWriteStream(pathToWrite));
  // Tell grunt the async task is complete
  res.on('end', function() {
    console.log(pathToWrite + ' saved!');
    done();
  });
}).on('error', function(e) {
  console.log("Got error: " + e.message);
  // Tell grunt the async task failed
  done(false);
});