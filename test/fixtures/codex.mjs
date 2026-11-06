#!/usr/bin/env node
import { createInterface } from 'node:readline';
const mode = process.argv[2] || 'ok';
let initialized = false;
const send = (msg) => process.stdout.write(JSON.stringify(msg) + '\n');
createInterface({ input: process.stdin }).on('line', (line) => {
  const msg = JSON.parse(line);
  if (mode === 'hang') return;
  if (mode === 'exit') process.exit(2);
  if (mode === 'malformed') { process.stdout.write('invalid response\n'); return; }
  if (mode === 'oversize') { process.stdout.write('X'.repeat(1024 * 1024 + 1)); return; }
  if (msg.method === 'initialize') return send({ id: msg.id, result: { userAgent: 'test' } });
  if (msg.method === 'initialized') { initialized = true; return; }
  if (!initialized) return send({ id: msg.id, error: { code: -32000, message: 'handshake required' } });
  send({ method: 'account/updated', params: { ignored: true } });
  if (msg.method === 'account/read') {
    return send({ id: msg.id, result: { account: mode === 'logged-out' ? null : { type: mode === 'api' ? 'apiKey' : 'chatgpt', planType: 'pro', email: 'private@example.invalid' } } });
  }
  if (msg.method === 'account/rateLimits/read') {
    if (mode === 'error') return send({ id: msg.id, error: { code: 401, message: 'PRIVATE_DETAIL_DO_NOT_PRINT' } });
    return send({ id: msg.id, result: { accountId: 'PRIVATE_ACCOUNT', rateLimits: { primary: { usedPercent: 27, windowDurationMins: 10080, resetsAt: 2000000000 } } } });
  }
  // A generation request is a test failure, never an allowed fallback.
  send({ id: msg.id, error: { code: -32601, message: 'Unexpected method' } });
});
