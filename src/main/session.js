// Session partition helpers.
//
// Normal windows share one persistent partition so cookies, logins and cache
// survive restarts. Private windows get a fresh in-memory partition each time
// so nothing touches disk and the data is gone when the window closes.

const crypto = require('crypto');

function createPartitionName({ ephemeral }) {
  if (ephemeral) {
    const id = crypto.randomBytes(6).toString('hex');
    return `private-${id}`; // Not prefixed with "persist:" → in-memory only.
  }
  return 'persist:zip-default';
}

module.exports = { createPartitionName };
