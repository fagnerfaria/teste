import type { HttpClient } from 'isomorphic-git';
import { withHttpDeadline } from './http-deadline';

// Obsidian requestUrl has no real cancellation. Desktop uses the already-installed
// isomorphic-git/http/node adapter, with AbortSignal-driven socket cleanup.
const DESKTOP_GIT_REQUEST_DEADLINE_MS = 5 * 60_000;

export function chooseGitHttpClient(
  desktop: boolean,
  cancellableNative: HttpClient,
  obsidianRequestUrl: HttpClient
): HttpClient {
  return desktop
    ? withHttpDeadline(cancellableNative, DESKTOP_GIT_REQUEST_DEADLINE_MS)
    : obsidianRequestUrl;
}
