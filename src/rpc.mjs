import { spawn } from 'node:child_process';

export class MonitorError extends Error {
  constructor(message, code = 'unavailable') { super(message); this.code = code; }
}

// Only account metadata and quotas are requested. No thread or model turn is created.
export class CodexClient {
  constructor({ bin = 'codex', args = ['app-server', '--listen', 'stdio://'], timeoutMs = 20000 } = {}) {
    this.bin = bin;
    this.args = args;
    this.timeoutMs = timeoutMs;
    this.pending = new Map();
    this.nextId = 0;
    this.child = null;
    this.closed = false;
  }

  async connect() {
    if (this.closed) throw new MonitorError('Connessione Codex chiusa.');
    // A separate process group keeps this read-only app-server out of Herdr's
    // foreground coding-agent detection. The client still owns and kills it.
    this.child = spawn(this.bin, this.args, {
      stdio: ['pipe', 'pipe', 'ignore'], windowsHide: true, detached: process.platform !== 'win32',
    });
    let buffer = '';
    this.child.stdout.setEncoding('utf8');
    this.child.stdout.on('data', (chunk) => {
      buffer += chunk;
      if (buffer.length > 1024 * 1024) { this.fail(new MonitorError('Risposta Codex troppo grande.')); return; }
      let end;
      while ((end = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
        if (!line.trim()) continue;
        let msg;
        try { msg = JSON.parse(line); }
        catch { this.fail(new MonitorError('Risposta Codex non valida.')); return; }
        if (!msg || typeof msg !== 'object') continue;
        if (msg.method) {
          if (msg.id !== undefined) this.send({ id: msg.id, error: { code: -32601, message: 'Method not supported' } });
          continue;
        }
        const request = this.pending.get(msg.id);
        if (!request) continue;
        clearTimeout(request.timer); this.pending.delete(msg.id);
        if (msg.error) {
          // Do not expose server errors: they may include local paths or credentials.
          request.reject(new MonitorError('Codex non ha restituito i dati richiesti. Verifica accesso e versione della CLI.', 'rpc'));
        } else request.resolve(msg.result);
      }
    });
    this.child.on('error', (error) => this.fail(new MonitorError(
      error.code === 'ENOENT' ? 'Codex CLI non trovata. Installa Codex o configura codexPath.' : 'Impossibile avviare Codex CLI.', 'process',
    )));
    this.child.on('exit', () => this.fail(new MonitorError('La connessione a Codex è terminata.', 'process')));
    this.child.stdin.on('error', () => this.fail(new MonitorError('Connessione a Codex interrotta.', 'process')));
    await this.request('initialize', { clientInfo: { name: 'herdr_openai_usage', title: 'Herdr OpenAI Usage', version: '0.1.0' } });
    this.send({ method: 'initialized', params: {} });
  }

  send(message) {
    if (this.closed || !this.child || this.child.stdin.destroyed) return;
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  request(method, params) {
    if (this.closed) return Promise.reject(new MonitorError('Connessione Codex chiusa.'));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new MonitorError('Codex non risponde. Riprova fra qualche istante.', 'timeout'));
      }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.send({ id, method, ...(params === undefined ? {} : { params }) });
    });
  }

  async read() {
    const info = await this.request('account/read', { refreshToken: false });
    if (!info?.account) throw new MonitorError('Accesso richiesto: esegui codex login e accedi con ChatGPT.', 'auth');
    if (info.account.type !== 'chatgpt') {
      throw new MonitorError('Il monitor richiede accesso Codex con ChatGPT. L’accesso tramite API key usa quote separate.', 'auth');
    }
    const quotas = await this.request('account/rateLimits/read');
    // Account e-mail and identifiers never leave this boundary.
    return { planType: info.account.planType, quotas: {
      rateLimits: quotas?.rateLimits, rateLimitsByLimitId: quotas?.rateLimitsByLimitId,
      ordinaryUsageAllowed: quotas?.ordinaryUsageAllowed, rateLimitResetCredits: quotas?.rateLimitResetCredits,
    } };
  }

  fail(error) {
    if (this.closed) return;
    this.closed = true;
    for (const { reject, timer } of this.pending.values()) { clearTimeout(timer); reject(error); }
    this.pending.clear();
    this.child?.kill();
  }

  async close() {
    const child = this.child;
    this.fail(new MonitorError('Connessione Codex chiusa.'));
    if (!child || child.exitCode !== null || child.signalCode !== null || !child.pid) return;
    await new Promise((resolve) => {
      const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 1500);
      child.once('exit', () => { clearTimeout(timer); resolve(); });
    });
  }
}
