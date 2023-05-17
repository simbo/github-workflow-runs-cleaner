# 🧹 GitHub Workflow Runs Cleaner

[![npm Package Version](https://img.shields.io/npm/v/github-workflow-runs-cleaner?)](https://www.npmjs.com/package/github-workflow-runs-cleaner)
[![License MIT](https://img.shields.io/badge/license-MIT-cccccc)](http://simbo.mit-license.org/)
[![GitHub Repo](https://img.shields.io/badge/repo-public-87ceeb)](https://github.com/simbo/github-workflow-runs-cleaner)
![Native Typescript Support](https://img.shields.io/badge/types-Typescript-0c7dbe)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/simbo/github-workflow-runs-cleaner/ci.yml?branch=main)](https://github.com/simbo/github-workflow-runs-cleaner/actions/workflows/ci.yml)

A command-line interface to bulk delete workflow runs of GitHub actions.

---

## Install

_GitHub Workflow Runs Cleaner_ is published as `github-workflow-runs-cleaner` to
the npm registry.

You can install it:

```sh
npm i --global github-workflow-runs-cleaner
```

## Usage

```sh
github-workflow-runs-cleaner

# or

gwrc
```

The CLI will ask you how to connect to your repository, which workflows to
select and which runs to delete.

You need a [personal access token](https://github.com/settings/tokens) and write
access to the repository. And if the repository is not public, the token needs
the `repo` scope.

The CLI also supports GitHub Enterprise.

## License and Author

[MIT &copy; Simon Lepel](https://simbo.mit-license.org/)
