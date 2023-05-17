#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { exit } from 'node:process';

import { Octokit } from '@octokit/rest';
import chalk from 'chalk';
import { formatDistance } from 'date-fns';
import enGB from 'date-fns/locale/en-GB/index.js';
import githubUsernameRegex from 'github-username-regex';
import inquirer from 'inquirer';
import ora from 'ora';
import PQueue from 'p-queue';
import urlRegex from 'url-regex';

import { fileIsReadable, fileIsWritable, readFile } from '../lib/files.js';
import { name, title, version } from '../lib/package-json.js';
import { githubRepoRegex, githubTokenRegex } from '../lib/regex.js';
import { ConnectionData } from '../models/connection-data.interface.js';
import { WorkflowRun } from '../models/workflow-run.interface.js';
import { Workflow } from '../models/workflow.interface.js';

try {
  console.log(`${chalk.bold.magenta(title)}\n${chalk.dim(`Version ${version}`)}\n`);

  const spinner = ora();

  const connectionDataPath = join(homedir(), `.${name}`);

  const connectionData: ConnectionData = (await fileIsReadable(connectionDataPath))
    ? await readFile(connectionDataPath)
    : { apiURL: 'https://api.github.com', token: undefined, owner: undefined, repo: undefined };

  const { apiURL, token, owner, repo, save } = await inquirer.prompt(
    [
      {
        when: connectionData.apiURL && connectionData.token && connectionData.owner && connectionData.repo,
        type: 'confirm',
        name: 'ask',
        message: `Saved connection data found for "${connectionData.owner}/${connectionData.repo}". Continue with this data?`,
        default: true
      },
      {
        when: ({ ask }) => !ask,
        askAnswered: true,
        type: 'input',
        name: 'apiURL',
        message: 'GitHub API URL:',
        default: connectionData.apiURL,
        validate: (input: string) => input.startsWith('https:') && urlRegex({ exact: true }).test(input)
      },
      {
        when: ({ ask }) => !ask,
        askAnswered: true,
        type: 'password',
        name: 'token',
        message: 'Personal Access Token:',
        default: connectionData.token,
        validate: (input: string) => githubTokenRegex.test(input)
      },
      {
        when: ({ ask }) => !ask,
        askAnswered: true,
        type: 'input',
        name: 'owner',
        message: 'Organization or Owner:',
        default: connectionData.owner,
        validate: (input: string) => githubUsernameRegex.test(input)
      },
      {
        when: ({ ask }) => !ask,
        askAnswered: true,
        type: 'input',
        name: 'repo',
        message: 'Repository:',
        default: connectionData.repo,
        validate: (input: string) => githubRepoRegex.test(input)
      },
      {
        when: ({ ask }) => !ask,
        type: 'confirm',
        name: 'save',
        message: 'Save this connection data?',
        default: true
      }
    ],
    connectionData
  );

  if (save) {
    if (await fileIsWritable(connectionDataPath)) {
      try {
        await writeFile(connectionDataPath, JSON.stringify({ apiURL, token, owner, repo }, undefined, 2));
        console.log(chalk.dim(`Connection data saved.`));
      } catch {
        console.log(chalk.dim(`Saving connection data failed.`));
      }
    } else {
      console.log(chalk.dim(`Saving connection data failed because file is not writable: '${connectionDataPath}'`));
    }
  }

  spinner.start(chalk.dim('Loading workflows...'));

  const octokit = new Octokit({ auth: token, baseUrl: apiURL });
  const workflows: Workflow[] = await octokit.paginate('GET /repos/:owner/:repo/actions/workflows', {
    owner,
    repo
  });

  spinner.stop();

  const { workflowID } = await inquirer.prompt([
    {
      type: 'list',
      name: 'workflowID',
      message: 'Select workflow:',
      loop: false,
      pageSize: 20,
      choices: async () =>
        workflows.map(({ id, name, path }) => ({
          name: `${name} (${path.replace(/^\.github\/workflows\//, '')})`,
          value: `${id}`
        }))
    }
  ]);

  spinner.start(chalk.dim('Loading workflow runs...'));

  let runs: WorkflowRun[] = await octokit.paginate('GET /repos/:owner/:repo/actions/workflows/:workflow_id/runs', {
    owner,
    repo,
    workflow_id: workflowID
  });

  spinner.stop();

  const { allOrSelect } = await inquirer.prompt([
    {
      type: 'expand',
      name: 'allOrSelect',
      message: `Found ${runs.length} workflow runs for "${runs[0].name}". Delete all or select?`,
      choices: [
        {
          key: 'a',
          name: 'Delete all workflow runs',
          value: 'all'
        },
        {
          key: 's',
          name: 'Select workflow runs for deletion',
          value: 'select'
        }
      ]
    }
  ]);

  if (allOrSelect === 'select') {
    const now = new Date();
    const { selectedRuns } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedRuns',
        message: `Select the workflow runs of "${runs[0].name}" for deletion:`,
        loop: false,
        pageSize: 20,
        choices: () =>
          runs.map(({ id, run_number, event, created_at, actor: { login } }) => ({
            name:
              `${chalk.bold(`#${run_number}`)} triggered by ${chalk.bold(event)} from ${chalk.bold(login)} ` +
              `${formatDistance(new Date(created_at), now, { locale: enGB })} ago`,
            value: id
          }))
      }
    ]);
    runs = runs.filter(({ id }) => selectedRuns.includes(id));
  }

  if (runs.length > 1000) {
    console.log(
      chalk.dim(
        'You have selected more than 1000 runs for deletion.\nBe aware, that there is an API rate limit of 5000 requests per hour and user.'
      )
    );
  }

  const { deleteConfirmation } = await inquirer.prompt([
    {
      type: 'input',
      name: 'deleteConfirmation',
      message:
        `Selected ${runs.length} run${runs.length > 1 ? 's' : ''} of the workflow "${runs[0].name}" for deletion. ` +
        'Enter "delete" to continue:'
    }
  ]);

  if (!/^delete$/i.test(deleteConfirmation)) {
    console.log(chalk.dim('Cancelled.'));
    exit(0);
  }

  spinner.start('Deleting...');

  const queue = new PQueue({ concurrency: 5 });
  const failedDeletions: (WorkflowRun & { error: Error })[] = [];
  const succeededDeletions: WorkflowRun[] = [];
  let countAll = 0;

  const handleResult =
    <T>(collection: T[]) =>
    (result: T) => {
      spinner.text = chalk.dim(`Deleted ${++countAll} of ${runs.length} workflow run${runs.length > 1 ? 's' : ''}...`);
      collection.push(result);
    };

  queue.on('completed', handleResult(succeededDeletions));
  queue.on('error', handleResult(failedDeletions));

  for (const run of runs) {
    await queue.add(async () => {
      try {
        await octokit.actions.deleteWorkflowRun({
          owner,
          repo,
          run_id: run.id
        });
      } catch (error) {
        return { ...run, error };
      }
    });
  }

  queue.start();
  await queue.onIdle();
  spinner.stop();

  if (succeededDeletions.length > 0) {
    console.log(
      chalk.green.bold(
        `Successfully deleted ${succeededDeletions.length} workflow run${succeededDeletions.length > 1 ? 's' : ''}.`
      )
    );
  }

  if (failedDeletions.length > 0) {
    const { displayErrors } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'displayErrors',
        default: true,
        message:
          `Deletion failed for ${failedDeletions} workflow run${failedDeletions.length > 1 ? 's' : ''}. ` +
          'Display the errors?'
      }
    ]);

    if (displayErrors) {
      failedDeletions.forEach(result => console.log(`${chalk.bold(`#${result.run_number}`)}: ${result.error}`));
    }
  }
} catch (error) {
  console.error(error);
  exit(1);
}
