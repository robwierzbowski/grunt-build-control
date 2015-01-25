# Tests
Tests can be executed by running
```bash
grunt test
```
or 
```bash
grunt watch:tests
```



## Layout
```
test/
    tests.js        - contains tests to be executed
    mock/      		- [auto gen] testing area for any given scenario
    	repo/		- repository to do tests on
        remote/     - [auto gen] "remote", imagine it as a github repo
        validate/   - [auto gen] `git clone remote validate` produces this folder
    scenarios/      - different scenarios to be executed
        exampleA/
        ...
```

#### Notes
All tests are executed with the relative path being: `test/mock/`

The filesystem remote path is `../../remote`

Set `connectCommits: false` if there's no need to track the source repo, i.e. an extra call to `git init` the folder `repo/`



# Usage Example/Workflow
Still confused?  
Imagine a `basic deployment` scenario
[test/scenarios/basic deployment](/test/scenarios/basic%20deployment)


```
Working directory: "scenarios/basic deployment/"
Source code is in "/*"
Deploy code is in "dist/*"
grunt-build-control tasks is located in "gruntfile.js"

The test case can be found in "/test/tests.js", high level is:
	- it purges `mock/`
	- it copies `scenarios/basic deployment/**` to `mock/`
	- it changes working directory to `mock/`
	- it executes the test case named `basic deployment`

The "basic deployment" test case does the following:
	- it does setup
	- it runs execScenario()
		- which executes `grunt default`
		- which executes `git clone remote validate`
	- it does validations
```

How does mocha know which scenario folder to copy? By the `describe` suite title of course!
