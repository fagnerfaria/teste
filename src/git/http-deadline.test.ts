import { describe, expect, it } from 'vitest';
import type { HttpClient, GitHttpRequest, GitHttpResponse } from 'isomorphic-git';
import { withHttpDeadline } from './http-deadline';

const syntheticResponse = (
  url: string,
  body?: AsyncIterableIterator<Uint8Array>
): GitHttpResponse => ({
  url,
  method: 'GET',
  headers: {},
  statusCode: 200,
  statusMessage: 'OK',
  body,
});

describe('P5.3-B cancellable Git HTTP transport (lab only)', () => {
  it('actually aborts a request stuck before response headers', async () => {
    let sawAbort = false;
    const fake: HttpClient = {
      request: ({ signal }) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener(
            'abort',
            () => {
              sawAbort = true;
              reject(new Error('socket aborted'));
            },
            { once: true }
          );
        }),
    };
    await expect(
      withHttpDeadline(fake, 25).request({ url: 'http://127.0.0.1/test' })
    ).rejects.toThrow(/timed out/i);
    expect(sawAbort).toBe(true);
  });

  it('aborts an HTTP response stalled after the first body chunk', async () => {
    let sawAbort = false;
    const fake: HttpClient = {
      request: async ({ url, signal }) =>
        syntheticResponse(
          url,
          (async function* () {
            yield Uint8Array.of(1);
            await new Promise<void>((_resolve, reject) => {
              signal?.addEventListener(
                'abort',
                () => {
                  sawAbort = true;
                  reject(new Error('stream aborted'));
                },
                { once: true }
              );
            });
          })()
        ),
    };
    const response = await withHttpDeadline(fake, 25).request({ url: 'http://127.0.0.1/test' });
    const consume = async () => {
      for await (const chunk of response.body ?? []) {
        expect(chunk.byteLength).toBeGreaterThan(0);
      }
    };
    await expect(consume()).rejects.toThrow(/timed out/i);
    expect(sawAbort).toBe(true);
  });

  it('disables automatic redirects to avoid credential forwarding', async () => {
    let received: GitHttpRequest | undefined;
    const fake: HttpClient = {
      request: async (args) => {
        received = args;
        return syntheticResponse(
          args.url,
          (async function* () {
            yield Uint8Array.of(1);
          })()
        );
      },
    };
    const response = await withHttpDeadline(fake, 200).request({
      url: 'http://127.0.0.1/sync',
      headers: { Authorization: 'Bearer synthetic-only' },
      fetchOptions: { followRedirects: true },
    });
    for await (const chunk of response.body ?? []) {
      expect(chunk.byteLength).toBeGreaterThan(0);
    }
    expect(received?.fetchOptions?.followRedirects).toBe(false);
    expect(received?.headers?.Authorization).toBe('Bearer synthetic-only');
  });

  it('propagates external abort without waiting for timeout', async () => {
    const controller = new AbortController();
    const fake: HttpClient = {
      request: ({ signal }) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(new Error('socket aborted')), {
            once: true,
          });
        }),
    };
    const response = withHttpDeadline(fake, 10_000).request({
      url: 'http://127.0.0.1/sync',
      signal: controller.signal,
    });
    controller.abort();
    await expect(response).rejects.toThrow(/abort/i);
  });
});
