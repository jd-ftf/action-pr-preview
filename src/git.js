const { exec } = require('./exec');

exports.remoteBranchExists = async function remoteBranchExists(remoteUrl, branch) {
  return await exec('git', ['ls-remote', '--heads', remoteUrl, branch], true).then((res) => {
    if (!res.success) {
      throw new Error(res.stderr);
    }

    return res.stdout.trim().length > 0;
  });
}

exports.clone = async function clone(remoteUrl, branch, dest) {
  return await exec('git', ['clone', '--quiet', '--branch', branch, '--depth', '1', remoteUrl, dest], true);
}

exports.init = async function init(dest) {
  return await exec('git', ['init', dest], true);
}

exports.checkout = async function checkout(branch) {
  return await exec('git', ['checkout', '--orphan', branch], true);
}

exports.isDirty = async function isDirty() {
  return await exec('git', ['status', '--short'], true).then((res) => {
    if (!res.success) {
      throw new Error(res.stderr);
    }
    return res.stdout.trim().length > 0;
  });
}

exports.hasChange = async function hasChange() {
  return await exec('git', ['status', '--porcelain'], true).then((res) => {
    if (!res.success) {
      throw new Error(res.stderr);
    }
    return res.stdout.trim().length > 0;
  });
}

exports.setConfig = async function setConfig(key, value) {
  return await exec('git', ['config', key, value], true)
}

exports.add = async function add(pattern, verbase) {
  const args = ['add'];
  if (verbase) {
    args.push('--verbose');
  }
  args.push('--all', pattern);
  return await exec('git', args, true);
}

exports.commit = async function commit(author, message) {
  const args = [];
  args.push('commit');
  if (author !== '') {
    args.push('--author', author);
  }
  args.push('--message', message);
  return await exec('git', args, true);
}

exports.showStat = async function showStat(remoteURL, branch, force) {
  const args = [];
  args.push('push');
  if (force) {
    args.push('--force');
  }
  args.push(remoteURL, branch);
  return await exec('git', args, true);
}

exports.push = async function push(remoteURL, branch) {
  const args = [];
  args.push('push', remoteURL, branch);
  return await exec('git', args).then((res) => {
    if (!res.success) {
      throw new Error(res.stderr);
    }
    return res.stdout.trim().length > 0;
  });;
}
