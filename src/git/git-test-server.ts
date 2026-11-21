// Test-only: spawn git's own `git-http-backend` CGI behind a Node http server on a
// random port. Zero npm deps (uses the installed git binary), exercises the REAL
// smart-HTTP wire (the same path the plugin hits). Not bundled (main never imports it).
import http from 'node:http';
import { spawn, execFileSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import type { AddressInfo } from 'node:net';

const GIT_HTTP_BACKEND = path.join(
  execFileSync('git', ['--exec-path']).toString().trim(),
  'git-http-backend'
);

export interface GitServer {
  url(repo: string): string;
  close(): Promise<void>;
}

export async function startGitServer(projectRoot: string): Promise<GitServer> {
  const children = new Set<ChildProcessWithoutNullStreams>();
  const childExits = new Set<Promise<void>>();
  const server = http.createServer((req, res) => {
    const u = new URL(req.url ?? '/', 'http://localhost');
    const cgi = spawn(GIT_HTTP_BACKEND, [], {
      env: {
        ...process.env,
        GIT_PROJECT_ROOT: projectRoot,
        GIT_HTTP_EXPORT_ALL: '1', // serve push without per-repo http-backend flag
        PATH_INFO: u.pathname,
        QUERY_STRING: u.search.replace(/^\?/, ''),
        REQUEST_METHOD: req.method ?? 'GET',
        CONTENT_TYPE: req.headers['content-type'] ?? '',
        REMOTE_USER: 'tester',
      },
    });
    children.add(cgi);
    let resolveChild!: () => void;
    const finished = new Promise<void>((resolve) => {
      resolveChild = resolve;
    });
    childExits.add(finished);
    cgi.once('close', () => {
      children.delete(cgi);
      childExits.delete(finished);
      resolveChild();
    });
    req.once('aborted', () => {
      if (cgi.exitCode === null) cgi.kill();
    });
    res.once('close', () => {
      // A successful response also emits close; kill only an aborted response.
      if (!res.writableFinished && cgi.exitCode === null) cgi.kill();
    });
    cgi.stdin.on('error', () => {
      // Expected when aborted test requests close a Git CGI child's stdin.
    });
    req.pipe(cgi.stdin);
    let buf = Buffer.alloc(0);
    let sent = false;
    cgi.stdout.on('data', (chunk: Buffer) => {
      if (sent) {
        res.write(chunk);
        return;
      }
      buf = Buffer.concat([buf, chunk]);
      const sep = buf.indexOf('\r\n\r\n');
      if (sep === -1) return;
      for (const line of buf.subarray(0, sep).toString('utf8').split('\r\n')) {
        const i = line.indexOf(':');
        if (i === -1) continue;
        const k = line.slice(0, i).trim();
        const v = line.slice(i + 1).trim();
        if (k.toLowerCase() === 'status') res.statusCode = parseInt(v, 10);
        else res.setHeader(k, v);
      }
      sent = true;
      const rest = buf.subarray(sep + 4);
      if (rest.length) res.write(rest);
    });
    cgi.stdout.on('end', () => {
      if (!res.destroyed && !res.writableEnded) res.end();
    });
    cgi.stderr.on('data', () => {});
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  const { port } = server.address() as AddressInfo;
  return {
    url: (repo: string) => `http://127.0.0.1:${port}/${repo}`,
    close: async () => {
      const listenerClosed = new Promise<void>((resolve) => server.close(() => resolve()));
      server.closeAllConnections();
      for (const child of children) {
        if (child.exitCode === null) child.kill();
        // A rejected auth response may retain CGI stdio handles.
        // Destroy only this spawned process pipes during teardown.
        child.stdin.destroy();
        child.stdout.destroy();
        child.stderr.destroy();
      }
      await Promise.all([...childExits]);
      await listenerClosed;
    },
  };
}
