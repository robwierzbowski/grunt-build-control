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

The filesystem remote path is usually `../../remote`

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

The test case can be found in "/test/tests.js", high level test flow:
	- purge `mock/`
	- copy `scenarios/basic deployment/**` to `mock/`
	- change working directory to `mock/`
	- execute the test case named `basic deployment`

The "basic deployment" test case does the following:
	- setup
	- runs execScenario()
		- which executes `grunt default`
		- which executes `git clone remote validate`
	- does validations
```

How does mocha know which scenario folder to copy? By the `describe` suite name of course!


# Hints and debugging tips
`tasks.push(_.noop)` is a great way to stop a task flow, and to have a peek around. (Think `debugger;` statement)

I find it helpful to have 3 active terminals windows:

1. **Watcher** - `grunt watch:tests` usually, and executing a single test to make life simplier. Use `describe.only(...)` or `test.only(...)`.

2. **Mock** - terminal pointed to `test/mock/*` to explore what happens during an execution of a test (used in conjuntion wiht `tasks.push(_.noop)`). Note: any folder in mock is removed and recreated on each start of a test. So you'll need to cd back into a folder if your terminal "cannot get current working directory".

3. **Scenario** - terminal pointed to `test/scenario/{scenarioName}/*` for anything that you may need to work on. These are the files that are copied to `test/mock` every single time `grunt watch` runs.
