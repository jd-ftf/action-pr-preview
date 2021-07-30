const exec = require('@actions/exec');

exports.exec = async (command, args, slient) => {
  let stdout = '';
  let stderr = '';

  const options = {
    slient,
    ignoreReturnCode: true,
  };
  options.listeners = {
    stdout: (data) => {
      stdout += data.toString();
    },
    stderr: (data) => {
      stderr += data.toString();
    },
  };

  const returnCode = await exec.exec(command, args, options);

  return {
    success: returnCode === 0,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
  };
}
