'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');

function equalSecret(provided, expected) {
  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(expected));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function createViewerAccess(file) {
  const generate = () => ({ token: crypto.randomBytes(32).toString('base64url') });
  const save = value => {
    if (!file) return;
    const temp = file + '.tmp';
    fs.writeFileSync(temp, JSON.stringify(value) + '\n', { mode: 0o600 });
    fs.renameSync(temp, file);
  };
  let current;
  try {
    current = file ? JSON.parse(fs.readFileSync(file, 'utf8')) : generate();
    if (!/^[A-Za-z0-9_-]{43}$/.test(current.token)) throw new Error('Invalid OBS access file.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    current = generate();
    save(current);
  }
  return {
    get token() { return current.token; },
    accepts(token) { return equalSecret(token, current.token); },
    replace() {
      const next = generate();
      save(next); // Keep the old link working if persistence fails.
      current = next;
    },
  };
}
module.exports = { createViewerAccess, equalSecret };
