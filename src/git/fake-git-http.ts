import http, { type Server } from 'node:http';
import { spawn, execFileSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { AddressInfo } from 'node:net';

export interface FakeGitRequest {
  method: string;
  pathname: string;
  query: string;
  remoteAddress: string;
  authorizationPresent: boolean;
  authorizationValid: boolean;
  contentType: string;
}

export interface FakeGitHttpServer {
  requests: FakeGitRequest[];
  url(repo: string): string;
  close(): Promise<void>;
}

function resolveGitHttpBackend(): string {
  const execPath = execFileSync('git', ['--exec-path'], { encoding: 'utf8' }).trim();
  const candidates = [
    path.join(execPath, 'git-http-backend'),
    path.join(execPath, 'git-http-backend.exe'),
  ];
  const backend = candidates.find(existsSync);
  if (!backend) throw new Error('git-http-backend executable was not found under git --exec-path.');
  return backend;
}

function parseCgiHeaders(buffer: Buffer): {
  statusCode: number;
  headers: Array<[string, string]>;
  bodyOffset: number;
} | null {
  let separator = buffer.indexOf('\r\n\r\n');
  let width = 4;
  if (separator < 0) {
    separator = buffer.indexOf('\n\n');
    width = 2;
  }
  if (separator < 0) return null;
  const text = buffer.subarray(0, separator).toString('latin1');
  const headers: Array<[string, string]> = [];
  let statusCode = 200;
  for (const line of text.split(/\r?\n/)) {
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const name = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (name.toLowerCase() === 'status') {
      const parsed = Number.parseInt(value, 10);
      if (Number.isInteger(parsed)) statusCode = parsed;
    } else {
      headers.push([name, value]);
    }
  }
  return { statusCode, headers, bodyOffset: separator + width };
}

export async function startFakeGitHttpServer(
  projectRoot: string,
  options: { expectedAuthorization?: string } = {}
): Promise<FakeGitHttpServer> {
  const backend = resolveGitHttpBackend();
  const requests: FakeGitRequest[] = [];
  const children = new Set<ChildProcessWithoutNullStreams>();
  const root = path.resolve(projectRoot);

  const server: Server = http.createServer((req, res) => {
    const parsed = new URL(req.url ?? '/', 'http://127.0.0.1');
    let decodedPath: string;
    try {
      decodedPath = decodeURIComponent(parsed.pathname);
    } catch {
      res.writeHead(400, { connection: 'close' });
      res.end('invalid path encoding');
      return;
    }
    const relative = decodedPath.replace(/^\/+/, '');
    const candidate = path.resolve(root, relative);
    const relation = path.relative(root, candidate);
    if (
      !relative ||
      relative.split(/[\\/]/).some((part) => !part || part === '.' || part === '..') ||
      relation.startsWith('..') ||
      path.isAbsolute(relation)
    ) {
      res.writeHead(400, { connection: 'close' });
      res.end('invalid repository path');
      return;
    }

    const authorization =
      typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
    const authorizationValid =
      options.expectedAuthorization === undefined ||
      authorization === options.expectedAuthorization;

    requests.push({
      method: req.method ?? 'GET',
      pathname: parsed.pathname,
      query: parsed.search,
      remoteAddress: req.socket.remoteAddress ?? '',
      authorizationPresent: authorization.length > 0,
      authorizationValid,
      contentType:
        typeof req.headers['content-type'] === 'string' ? req.headers['content-type'] : '',
    });

    if (!authorizationValid) {
      res.writeHead(401, { 'content-type': 'text/plain', connection: 'close' });
      res.end('synthetic test authorization rejected');
      return;
    }

    const address = server.address() as AddressInfo;
    const cgi = spawn(backend, [], {
      env: {
        ...process.env,
        GIT_PROJECT_ROOT: root,
        GIT_HTTP_EXPORT_ALL: '1',
        PATH_INFO: '/' + relative,
        QUERY_STRING: parsed.search.replace(/^\?/, ''),
        REQUEST_METHOD: req.method ?? 'GET',
        CONTENT_TYPE:
          typeof req.headers['content-type'] === 'string' ? req.headers['content-type'] : '',
        CONTENT_LENGTH:
          typeof req.headers['content-length'] === 'string' ? req.headers['content-length'] : '',
        REMOTE_USER: 'synthetic-agentage-test',
        REMOTE_ADDR: req.socket.remoteAddress ?? '127.0.0.1',
        GATEWAY_INTERFACE: 'CGI/1.1',
        SERVER_PROTOCOL: 'HTTP/1.1',
        SERVER_NAME: '127.0.0.1',
        SERVER_PORT: String(address.port),
        HTTP_HOST: req.headers.host ?? '127.0.0.1',
        SCRIPT_NAME: '',
      },
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    children.add(cgi);
    cgi.once('close', () => children.delete(cgi));
    let stderr = '';
    cgi.stderr.on('data', (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-4096);
    });
    cgi.once('error', (error) => {
      if (!res.headersSent) {
        res.writeHead(502, { 'content-type': 'text/plain', connection: 'close' });
        res.end(error.message);
      }
    });

    let output = Buffer.alloc(0);
    let headersSent = false;
    cgi.stdout.on('data', (chunk: Buffer) => {
      if (headersSent) {
        res.write(chunk);
        return;
      }
      output = Buffer.concat([output, chunk]);
      const headers = parseCgiHeaders(output);
      if (!headers) {
        if (output.length > 128 * 1024 && !res.headersSent) {
          res.writeHead(502, { 'content-type': 'text/plain', connection: 'close' });
          res.end('git-http-backend returned oversized CGI headers');
          cgi.kill();
        }
        return;
      }
      headersSent = true;
      res.statusCode = headers.statusCode;
      for (const [name, value] of headers.headers) {
        if (name.toLowerCase() === 'connection') continue;
        try {
          res.setHeader(name, value);
        } catch {
          // Ignore malformed CGI headers; the body and status remain useful for the test.
        }
      }
      res.setHeader('connection', 'close');
      const body = output.subarray(headers.bodyOffset);
      if (body.length) res.write(body);
      output = Buffer.alloc(0);
    });
    cgi.stdout.on('end', () => {
      if (!headersSent && !res.headersSent) {
        const headers = parseCgiHeaders(output);
        if (headers) {
          res.statusCode = headers.statusCode;
          for (const [name, value] of headers.headers) {
            try {
              res.setHeader(name, value);
            } catch {
              // Ignore malformed CGI headers.
            }
          }
          res.end(output.subarray(headers.bodyOffset));
        } else {
          res.writeHead(502, { 'content-type': 'text/plain', connection: 'close' });
          res.end(stderr || 'git-http-backend returned no CGI response');
        }
      } else if (!res.writableEnded) {
        res.end();
      }
    });
    req.on('aborted', () => {
      if (cgi.exitCode === null) cgi.kill();
    });
    res.on('close', () => {
      if (cgi.exitCode === null) cgi.kill();
    });
    if (cgi.stdin) req.pipe(cgi.stdin);
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Fake Git HTTP server did not bind a TCP port.');
  }

  let closed = false;
  return {
    requests,
    url(repo: string): string {
      const relative = String(repo).replace(/^\/+/, '');
      if (
        !relative ||
        relative.split(/[\\/]/).some((part) => !part || part === '.' || part === '..')
      ) {
        throw new Error('Invalid synthetic repository path.');
      }
      return 'http://127.0.0.1:' + String(address.port) + '/' + relative;
    },
    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      const closedServer = new Promise<void>((resolve) => server.close(() => resolve()));
      server.closeAllConnections();
      await closedServer;
      for (const child of children) {
        if (child.exitCode === null) child.kill();
      }
    },
  };
}
