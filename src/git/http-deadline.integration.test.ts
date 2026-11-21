import { afterEach, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import nodeHttp from 'isomorphic-git/http/node';
import { withHttpDeadline } from './http-deadline';

describe('P5.3-B node Git HTTP socket cancellation (localhost only)', () => {
  const active: Server[] = [];

  async function listen(server: Server): Promise<string> {
    active.push(server);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    return 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
  }

  afterEach(async () => {
    for (const server of active.splice(0)) {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('cancels a request stuck before any HTTP response and closes the socket', async () => {
    let closed = false;
    const url = await listen(
      createServer((req) => {
        req.socket.once('close', () => {
          closed = true;
        });
      })
    );
    await expect(withHttpDeadline(nodeHttp, 85).request({ url: url + '/stalled' })).rejects.toThrow(
      /timed out/i
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(closed).toBe(true);
  });

  it('cancels a request stuck halfway through a streamed response', async () => {
    let closed = false;
    const url = await listen(
      createServer((req, res) => {
        req.socket.once('close', () => {
          closed = true;
        });
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
        res.write('partial');
      })
    );
    const response = await withHttpDeadline(nodeHttp, 85).request({ url: url + '/partial' });
    const consume = async () => {
      for await (const chunk of response.body ?? []) {
        expect(chunk.byteLength).toBeGreaterThan(0);
      }
    };
    await expect(consume()).rejects.toThrow(/timed out/i);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(closed).toBe(true);
  });

  it('does not forward Authorization on an HTTP redirect to another server', async () => {
    let redirectedRequests = 0;
    const destination = await listen(
      createServer((_req, res) => {
        redirectedRequests++;
        res.end('wrong destination');
      })
    );
    const source = await listen(
      createServer((_req, res) => {
        res.writeHead(302, { Location: destination + '/capture' });
        res.end('redirect blocked');
      })
    );
    const response = await withHttpDeadline(nodeHttp, 500).request({
      url: source + '/repo.git/info/refs',
      headers: { Authorization: 'Bearer synthetic-only' },
    });
    expect(response.statusCode).toBe(302);
    for await (const chunk of response.body ?? []) {
      expect(chunk.byteLength).toBeGreaterThan(0);
    }
    expect(redirectedRequests).toBe(0);
  });
});
