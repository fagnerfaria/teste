import { scheduleTimeout } from '../timer';
import type { GitHttpRequest, HttpClient } from 'isomorphic-git';

/**
 * Bound a Git HTTP request across BOTH its headers and its response-body stream.
 *
 * This wrapper is only safe when the injected transport truly cancels its underlying
 * socket when its AbortSignal fires (e.g. isomorphic-git/http/node on desktop).
 * Never wrap Obsidian requestUrl with it: requestUrl cannot cancel in-flight I/O.
 */
export function withHttpDeadline(transport: HttpClient, deadlineMs: number): HttpClient {
  if (!Number.isFinite(deadlineMs) || deadlineMs <= 0) {
    throw new RangeError('Git HTTP deadline must be a positive finite duration');
  }

  return {
    async request(request: GitHttpRequest) {
      const abort = new AbortController();
      const originalSignal = request.signal;
      const onExternalAbort = () => abort.abort(originalSignal?.reason);
      if (originalSignal?.aborted) onExternalAbort();
      else originalSignal?.addEventListener('abort', onExternalAbort, { once: true });

      let timedOut = false;
      const cancelTimeout = scheduleTimeout(() => {
        originalSignal?.removeEventListener('abort', onExternalAbort);
        timedOut = true;
        abort.abort(new Error('Git HTTP request deadline exceeded'));
      }, deadlineMs);

      const cleanup = () => {
        cancelTimeout();
        originalSignal?.removeEventListener('abort', onExternalAbort);
      };
      const normalizedError = (err: unknown) =>
        timedOut
          ? new Error('Git HTTP request timed out; underlying socket was cancelled', {
              cause: err,
            })
          : err;

      try {
        const response = await transport.request({
          ...request,
          signal: abort.signal,
          // Authorization must NEVER cross an automatic redirect to another
          // authority, scheme or port. A redirect is a visible error to review.
          fetchOptions: { ...request.fetchOptions, followRedirects: false },
        });
        if (!response.body) {
          cleanup();
          return response;
        }
        const source = response.body;
        const body = (async function* () {
          try {
            yield* source;
          } catch (err) {
            throw normalizedError(err);
          } finally {
            cleanup();
          }
        })();
        return { ...response, body };
      } catch (err) {
        cleanup();
        throw normalizedError(err);
      }
    },
  };
}
