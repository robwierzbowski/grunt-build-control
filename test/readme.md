# Tests
Tests can be executed by running
```bash
grunt test
```



## Layout
```
test/
    tests.js        - contains tests to be executed
    mock-repo/      - [auto gen] testing area for any given scenario
        remote/     - [auto gen] "remote", imagine it as a github repo
        verify/     - [auto gen] `git clone remote verify` produces this folder
    scenarios/      - different scenarios to be executed
        exampleA/
        ...
```

#### Notes
All tests are executed with the relative path being: `test/mock-repo/`

A quick little helper to watch and rerun tests (requires `npm install nodemon -g`)
```bash
nodemon -w test -w tasks/ -i test/mock-repo --exec 'grunt test'
```



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
	- it purges `mock-repo/`
	- it copies `scenarios/basic deployment/**` to `mock-repo/`
	- it changes working directory to `mock-repo/`
	- it executes the test case named `basic deployment`

The "basic deployment" test case does the following:
	- it does setup
	- it runs execScenario()
		- which executes `grunt default`
		- which executes `git clone remote verify`
	- it does validations
```

How does mocha know which scenario folder to copy? By the `describe` suite title of course!
