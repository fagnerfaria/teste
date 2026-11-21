// DI git client. fs + http are INJECTED so it unit-tests in Node (node:fs +
// isomorphic-git/http/node) and only main.ts wires VaultFs + requestUrlHttpClient.
// Client owns history: full single-branch clone (no depth, #682), token in the
// Authorization header only (#1942), and it NEVER force-pushes - on a non-ff it
// re-pulls, merges, and re-pushes.
import git, {
  Errors,
  type FsClient,
  type HttpClient,
  type MergeDriverCallback,
  type WalkerEntry,
} from 'isomorphic-git';

export interface GitClientDeps {
  fs: FsClient;
  http: HttpClient;
  refreshAuth?: () => Promise<string | null>;
}

export interface RepoCtx {
  dir: string;
  gitdir?: string;
  url: string; // token NEVER in the URL (#1942)
  ref?: string;
  token: string;
}

export interface PullResult {
  conflicted: string[];
  // True when the histories can't be 3-way merged automatically (criss-cross / multiple merge
  // bases — MergeNotSupportedError). No filepaths; the caller surfaces an actionable note.
  unmergeable?: boolean;
}

const AUTHOR = { name: 'Agentage Memory', email: 'memory@agentage.io' };

export function createGitClient(
  { fs, http, refreshAuth }: GitClientDeps,
  mergeDriver: MergeDriverCallback
) {
  // #1942: token in the Authorization HEADER only (Basic password works for most hosts).
  const onAuth = (token: string) => () => ({
    headers: { Authorization: 'Basic ' + btoa(`x-access-token:${token}`) },
  });
  // Authentication failure is retried once when a fresh credential can be obtained.

  // Flush VaultFs's in-memory .git/index after every op (no-op for node:fs).
  const wrapFS = async <T>(p: Promise<T>): Promise<T> => {
    const flush = (fs as { saveAndClear?: () => Promise<void> }).saveAndClear;
    try {
      const r = await p;
      if (flush) await flush.call(fs);
      return r;
    } catch (e) {
      if (flush) await flush.call(fs);
      throw e;
    }
  };

  const base = (c: RepoCtx) => ({ fs, dir: c.dir, gitdir: c.gitdir });
  const auth = (c: RepoCtx) => {
    let retried = false;
    return {
      onAuth: () => onAuth(c.token)(),
      onAuthFailure: async () => {
        if (retried || !refreshAuth) return { cancel: true as const };
        retried = true;
        const token = await refreshAuth();
        if (!token || token === c.token) return { cancel: true as const };
        c.token = token;
        return onAuth(token)();
      },
    };
  };

  // The Git index can falsely report an edited file as clean when its size and
  // timestamps have not changed (racy Git). That can lose the local edit on pull.
  // Force content hashing during statusMatrix, WITHOUT updating the real index
  // with artificial metadata. Nothing is written to the working tree.
  const verifyingFs = (() => {
    const source = fs as unknown as { promises?: Record<string, unknown> };
    if (!source.promises || typeof source.promises.lstat !== 'function') return fs;
    const promises = new Proxy(source.promises, {
      get(target, key) {
        if (key !== 'lstat') {
          const original = Reflect.get(target, key);
          return typeof original === 'function' ? original.bind(target) : original;
        }
        return async (filepath: string) => {
          const stat = await (
            target.lstat as (p: string) => Promise<{
              mtimeMs?: number;
              mtime?: Date;
              isFile?: () => boolean;
            }>
          )(filepath);
          const normalized = filepath.replaceAll('\\', '/');
          if (normalized.includes('/.git/') || normalized.endsWith('/.git')) return stat;
          if (stat.isFile && !stat.isFile()) return stat;
          const mtime = stat.mtimeMs ?? stat.mtime?.getTime();
          if (mtime === undefined) return stat;
          const safe = Object.create(stat) as typeof stat;
          safe.mtimeMs = mtime + 2000;
          safe.mtime = new Date(mtime + 2000);
          return safe;
        };
      },
    });
    return { promises } as unknown as FsClient;
  })();

  const client = {
    // FULL single-branch clone. NO depth — shallow breaks push (#682).
    clone: (c: RepoCtx) =>
      wrapFS(
        git.clone({
          ...base(c),
          ...auth(c),
          http,
          url: c.url,
          ref: c.ref ?? 'main',
          singleBranch: true,
          noTags: true,
        })
      ),

    fetch: (c: RepoCtx) =>
      wrapFS(
        git.fetch({
          ...base(c),
          ...auth(c),
          http,
          url: c.url,
          ref: c.ref ?? 'main',
          singleBranch: true,
        })
      ),

    async pull(c: RepoCtx): Promise<PullResult> {
      const ref = c.ref ?? 'main';
      await wrapFS(
        git.fetch({ ...base(c), ...auth(c), http, url: c.url, ref, singleBranch: true })
      );
      try {
        const res = await wrapFS(
          git.merge({
            ...base(c),
            dir: c.dir || '.', // isomorphic-git writes conflict markers only if dir is truthy
            ours: ref,
            theirs: `origin/${ref}`,
            author: AUTHOR,
            abortOnConflict: false,
            mergeDriver,
          })
        );
        if (!res.alreadyMerged) await wrapFS(git.checkout({ ...base(c), ref }));
        return { conflicted: [] };
      } catch (e) {
        if (e instanceof Errors.MergeConflictError) {
          // iso-git already wrote the conflicted files WITH markers to the worktree
          // (abortOnConflict:false) — do NOT checkout, that would discard them.
          return { conflicted: e.data.filepaths };
        }
        if (e instanceof Errors.MergeNotSupportedError) {
          // Criss-cross / multiple merge bases: iso-git can't auto-merge and the worktree is
          // left intact. Signal the caller to surface a clear "resolve manually" note rather
          // than bubbling a raw error. (No auto LWW fallback — it would risk silent data loss.)
          return { conflicted: [], unmergeable: true };
        }
        throw e;
      }
    },

    // No force. A non-ff push throws PushRejectedError → re-pull + re-push (still no force).
    // Returns the conflict outcome: an empty result = pushed; a conflicted/unmergeable result
    // means the re-pull hit a conflict and we did NOT push — the caller surfaces it.
    async push(c: RepoCtx): Promise<PullResult> {
      const ref = c.ref ?? 'main';
      const doPush = () => wrapFS(git.push({ ...base(c), ...auth(c), http, url: c.url, ref }));
      try {
        const r = await doPush();
        if (!r.ok) throw new Error('push not ok');
        return { conflicted: [] };
      } catch (e) {
        if (e instanceof Errors.PushRejectedError || e instanceof Errors.NotFoundError) {
          // Someone pushed between our pull and push. Re-pull (merge); if THAT conflicts,
          // propagate it instead of blindly re-pushing into a "not ok after rebase" error.
          // NotFoundError: since iso-git 1.41.7 (#2412) an advanced remote head surfaces as
          // NotFoundError from the speculative merge-base walk, before PushRejectedError.
          const pulled = await client.pull(c);
          if (pulled.conflicted.length > 0 || pulled.unmergeable) return pulled;
          const r2 = await doPush();
          if (!r2.ok) throw new Error('push not ok after rebase');
          return { conflicted: [] };
        }
        throw e;
      }
    },

    commit: (c: RepoCtx, message: string) =>
      wrapFS(git.commit({ ...base(c), message, author: AUTHOR })),
    add: (c: RepoCtx, filepath: string) => wrapFS(git.add({ ...base(c), filepath })),
    remove: (c: RepoCtx, filepath: string) => wrapFS(git.remove({ ...base(c), filepath })),
    statusMatrix: (c: RepoCtx) =>
      wrapFS(git.statusMatrix({ ...base(c), fs: verifyingFs, refresh: false })),
    resolveRef: (c: RepoCtx, ref: string) => git.resolveRef({ ...base(c), ref }),

    init: (c: RepoCtx) => wrapFS(git.init({ ...base(c), defaultBranch: c.ref ?? 'main' })),
    addRemote: (c: RepoCtx, remote = 'origin') =>
      wrapFS(git.addRemote({ ...base(c), remote, url: c.url, force: true })),

    // Fetch + resolve origin/<ref>; null if the remote has no such ref (empty remote).
    async remoteOid(c: RepoCtx): Promise<string | null> {
      const ref = c.ref ?? 'main';
      await wrapFS(
        git.fetch({ ...base(c), ...auth(c), http, url: c.url, ref, singleBranch: true })
      ).catch((e) => {
        if (!(e instanceof Errors.NotFoundError)) throw e;
      });
      try {
        return await git.resolveRef({ ...base(c), ref: `origin/${ref}` });
      } catch {
        return null;
      }
    },

    // Does the REMOTE actually have <ref>? Asks the server (listServerRefs), so it is
    // correct even when the local origin/<ref> tracking ref is stale from another vault.
    async remoteHasRef(c: RepoCtx): Promise<boolean> {
      const ref = c.ref ?? 'main';
      const refs = await git.listServerRefs({
        http,
        url: c.url,
        ...auth(c),
        prefix: 'refs/heads/' + ref,
      });
      // The server API uses prefix matching; main-backup must not count as main.
      return refs.some((entry) => entry.ref === 'refs/heads/' + ref);
    },

    // Count of files (blobs) that differ between two commit oids - added, removed, or
    // modified. Non-mutating; the sync preview uses it to show how many files a pull will
    // bring in (incoming). git.walk descends both trees in lockstep; directories recurse.
    async changedFileCount(c: RepoCtx, oidA: string, oidB: string): Promise<number> {
      const out = await wrapFS(
        git.walk({
          ...base(c),
          trees: [git.TREE({ ref: oidA }), git.TREE({ ref: oidB })],
          map: async (filepath: string, entries: Array<WalkerEntry | null>) => {
            if (filepath === '.') return undefined;
            const [a, b] = entries;
            const ta = a ? await a.type() : undefined;
            const tb = b ? await b.type() : undefined;
            if (ta === 'tree' || tb === 'tree') return undefined; // dir node; walk recurses in
            const oa = a ? await a.oid() : null;
            const ob = b ? await b.oid() : null;
            return oa === ob ? undefined : filepath;
          },
        })
      );
      return (out as unknown[]).flat(Infinity).filter(Boolean).length;
    },
  };
  return client;
}

export type GitClient = ReturnType<typeof createGitClient>;
