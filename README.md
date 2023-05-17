# 🧹 GitHub Workflow Runs Cleaner

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

You will need a [personal access token](https://github.com/settings/tokens) to
establish a connection.

It also supports GitHub Enterprise.

## License and Author

[MIT &copy; Simon Lepel](https://simbo.mit-license.org/)
