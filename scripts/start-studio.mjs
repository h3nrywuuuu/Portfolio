import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdir, open, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '');
const serverRevision = createHash('sha256').update(await readFile(new URL('./server-v3.mjs', import.meta.url))).digest('hex');
const diagnostics = path.join(root, '.performance');
await mkdir(diagnostics, {recursive: true});
const portFile = path.join(diagnostics, 'studio-port');
let remembered;
try { remembered = Number(await readFile(portFile, 'utf8')); } catch {}
const ports = [...new Set([remembered, ...Array.from({length: 11}, (_, i) => 4173 + i)])]
  .filter(port => port >= 4173 && port <= 4183);

async function status(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/status`, {
      signal: AbortSignal.timeout(500),
    });
    const data = await response.json();
    return data.app === 'H3nRy_Studio' && data.root === root && data.serverRevision === serverRevision;
  } catch { return false; }
}

async function show(port) {
  await writeFile(portFile, String(port));
  const url = `http://127.0.0.1:${port}/#/studio`;
  console.log(`工作台已就绪：${url}`);
  await new Promise((resolve, reject) => {
    const browser = spawn('/usr/bin/open', [url], {stdio: 'ignore'});
    browser.once('error', reject);
    browser.once('exit', code => code === 0 ? resolve() : reject(new Error(`浏览器打开失败，请手动访问 ${url}`)));
  });
}

try {
  let ready;
  // 优先复用此项目的已有服务，包括非默认端口。
  for (const port of ports) {
    if (await status(port)) { ready = port; break; }
  }
  if (!ready) {
    for (const port of ports) {
      const log = await open(path.join(diagnostics, `studio-server-${port}.log`), 'a');
      let child;
      try {
        child = spawn(process.execPath, ['scripts/serve.mjs'], {
          cwd: root,
          env: {...process.env, PORT: String(port)},
          detached: true,
          stdio: ['ignore', log.fd, log.fd],
        });
      } finally { await log.close(); }
      let stopped = false;
      child.once('error', () => { stopped = true; });
      child.once('exit', () => { stopped = true; });
      child.unref();
      for (let attempt = 0; attempt < 40; attempt++) {
        if (await status(port)) { ready = port; break; }
        if (stopped) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (ready) break;
      if (!stopped) child.kill();
    }
  }
  if (!ready) throw new Error('无法启动工作台，请查看 .performance/studio-server-*.log。');
  await show(ready);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
