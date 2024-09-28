const { spawn } = require('child_process');
const fs = require('fs');
const schedule = require('node-schedule');

function runCommand(command) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ');

    const process = spawn(cmd, args, { stdio: 'pipe' });

    process.stdout.on('data', (data) => {
      console.log(`\n${data}`);
    });

    process.stderr.on('data', (data) => {
      console.error(`\n${data}`);
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(`Completed: ${command}`);
      } else {
        reject(new Error(`Command ${command} failed with exit code ${code}`));
      }
    });
  });
}

async function runCommands() {
  try {
    console.log('Starting the sequence of commands...');

    console.log('Running node index.js...');
    await runCommand('node index.js');
    console.log('Completed: node index.js');

    console.log('Running node daily.js...');
    await runCommand('node daily.js');
    console.log('Completed: node daily.js');

    console.log('Running node opentx.js...');
    await runCommand('node opentx.js');
    console.log('Completed: node opentx.js');

    console.log('Running node openbox.js...');
    await runCommand('node openbox.js');
    console.log('Completed: node openbox.js');
  } catch (error) {
    console.error('Error running commands:', error);
  }
}

function scheduleNextRun() {
  const now = new Date();
  const nextRun = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, now.getHours(), now.getMinutes(), 0, 0);

  schedule.scheduleJob(nextRun, () => {
    console.log(`Scheduled task started at ${nextRun}`);
    runCommands();
    scheduleNextRun();
  });

  fs.writeFileSync('lastRunTime.txt', now.toISOString(), 'utf-8');
  console.log(`First run time recorded: ${now.toISOString()}`);
}

(async () => {
  const lastRunTime = fs.existsSync('lastRunTime.txt') ? fs.readFileSync('lastRunTime.txt', 'utf-8') : null;

  if (lastRunTime) {
    const lastRunDate = new Date(lastRunTime);
    const now = new Date();

    if (now > lastRunDate) {
      console.log('Running commands immediately due to missed schedule.');
      await runCommands();
      scheduleNextRun();
    } else {
      console.log('Rescheduling for the next day.');
      scheduleNextRun();
    }
  } else {
    console.log('First time execution.');
    await runCommands();
    scheduleNextRun();
  }
})();
