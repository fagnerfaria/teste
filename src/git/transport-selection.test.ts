import { describe, expect, it, vi } from 'vitest';
import type { GitHttpRequest, HttpClient } from 'isomorphic-git';
import { chooseGitHttpClient } from './transport-selection';

const client = (response = 200) => {
  const request = vi.fn(async (_args: GitHttpRequest) => ({
    url: 'http://127.0.0.1/test',
    statusCode: response,
    statusMessage: 'OK',
    headers: {},
  }));
  return { request } as HttpClient & { request: typeof request };
};

describe('P5.3-B Git transport policy (lab only)', () => {
  it('uses the abortable Node transport on desktop without invoking requestUrl', async () => {
    const native = client();
    const obsidian = client();
    const selected = chooseGitHttpClient(true, native, obsidian);
    const result = await selected.request({ url: 'http://127.0.0.1/test' });
    expect(result.statusCode).toBe(200);
    expect(native.request).toHaveBeenCalledTimes(1);
    expect(obsidian.request).not.toHaveBeenCalled();
    const options = native.request.mock.calls[0][0] as {
      signal?: AbortSignal;
      fetchOptions?: { followRedirects?: boolean };
    };
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(options.fetchOptions?.followRedirects).toBe(false);
  });

  it('preserves the original requestUrl transport outside the desktop runtime', async () => {
    const native = client();
    const obsidian = client();
    await chooseGitHttpClient(false, native, obsidian).request({ url: 'http://127.0.0.1/test' });
    expect(obsidian.request).toHaveBeenCalledTimes(1);
    expect(native.request).not.toHaveBeenCalled();
  });
});
