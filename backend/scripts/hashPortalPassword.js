const bcrypt = require('bcryptjs');

function readHidden(prompt) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
      reject(new Error('Run this script directly in Terminal so the password can be entered securely.'));
      return;
    }
    let value = '';
    process.stdout.write(prompt);
    process.stdin.setEncoding('utf8');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const finish = (error) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener('data', onData);
      process.stdout.write('\n');
      error ? reject(error) : resolve(value);
    };
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === '\u0003') return finish(new Error('Cancelled.'));
        if (char === '\r' || char === '\n') return finish();
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else if (char >= ' ') value += char;
      }
    };
    process.stdin.on('data', onData);
  });
}

(async () => {
  try {
    const password = await readHidden('Enter the NEXORA portal password (hidden): ');
    if (!password || password.length > 72) throw new Error('Password must contain 1 to 72 characters.');
    console.log('PORTAL_PASSWORD_HASH=' + await bcrypt.hash(password, 12));
    console.log('Copy that line into backend/.env. Do not share the hash or .env file.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
})();
