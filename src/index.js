const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const os = require('ps');
const path = require('path');
const { copy, remove } = require('fs-extra');
const addressparser = require('addressparser');
const git = require('./git');

async function run () {
  try {
    const domain = core.getInput('domain') || 'github.com';
    const repo = core.getInput('repo') || process.env['GITHUB_REPOSITORY'] || '';
    const targetBranch = core.getInput('target_branch') || 'gh-pages';
    const author = core.getInput('author') || git.defaults.author;
    const commiter = core.getInput('commiter') || git.defaults.commiter;
    const docsDir = core.getInput('docs_dir');
    const previewDir = core.getInput('preview_dir') || (process.env['GH_PAT'] ? `preview/${repo}/` : 'preview/');
    const storeNum = parseInt(core.getInput('store_num'));
    const verbose = core.getBooleanInput('verbose');
    const prId = github.context;
    console.log(prId);

    if (!fs.existsSync(docsDir)) {
      core.setFailed('Docs dir does not exist');
      return;
    }

    let remoteUrl = String('https://');
    if (process.env['GH_PAT']) {
      core.debug('Use Personal Access Token to manage repository');
      remoteUrl = remoteUrl.concat(process.env['gh_PAT'].trim(), '@');
    } else if (process.env['GITHUB_TOKEN']) {
      core.debug('Use Github Token to manage repository(not pass when a workflow is triggered from a forked repository)');
      remoteUrl = remoteUrl.concat('x-access-token', process.env['GITHUB_TOKEN'].trim(), '@');
    } else {
      core.setFailed('You have to provide a GH_PAT or GITHUB_TOKEN');
    }

    remoteUrl = remoteUrl.concat(domain, '/', repo, '.git');
    const remoteBranchExists = git.remoteBranchExists(remoteUrl, targetBranch);
    core.debug(`remoteBranchExists: ${remoteBranchExists}`);
    
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gh-preview-'));
    core.debug(`tmpDir: ${tmpDir}`);

    const currentDir = path.resolve('.');
    core.debug(`currentDir: ${currentDir}`);

    process.chdir(tmpDir);

    if (remoteBranchExists) {
      core.startGroup(`Clone ${repo}`);
      await git.clone(remoteUrl, targetBranch, '.');
      core.endGroup();
    } else {
      core.startGroup('Init local git repository');
      await git.init('.');
      await git.checkout(targetBranch);
      core.endGroup();
    }

    let copyCount = 0;
    core.startGroup(`Copy ${path.join(currentDir, docsDir)} to ${path.join(tmpDir, previewDir)}`);
    await copy(path.join(currentDir, docsDir), path.join(tmpDir, previewDir), {
      filter: (src, dest) => {
        if (verbose) {
          core.info(`copy ${src} to ${dest}`);
        } else {
          if (copyCount > 1 && copyCount % 80 === 0) {
            process.stdout.write('\n');
          }
          process.stdout.write('.');
          copyCount++;
        }
        return true;
      },
    });
    core.info(`${copyCount} file(s) copied.`);
    core.endGroup();

    const isDirty = await git.isDirty();
    core.debug(`isDirty: ${isDirty}`);

    const commiterData = addressparser(commiter)[0];
    core.startGroup('Config git committer');
    await git.setConfig('user.name', commiterData.name);
    await git.setConfig('user.email', commiterData.address);
    core.endGroup();

    if (!(await git.hasChange())) {
      core.info('Nothing to deploy');
      return;
    }

    core.startGroup('Update index of working tree');
    await git.add('.', verbose);
    core.endGroup();

    const authorData = addressparser(author)[0];
    core.startGroup('Commit changes');
    await git.commit(`${authorData.name} <${authorData.address}>`, commit);
    const statOutput = await git.showStat();
    core.info(statOutput);
    core.endGroup();

    core.startGroup(`Push ${docsDir} directory to ${targetBranch} branch on ${repo} repo`);
    await git.push(remoteUrl, targetBranch);
    core.endGroup();
    core.info(`Content of ${docsDir} has been deployed to Github Pages!`);

    process.chdir(currentDir);
  } catch(e) {
    core.setFailed(e.message);
  }
}

run();
