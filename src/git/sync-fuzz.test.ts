import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import type { MergeDriverCallback } from 'isomorphic-git';
import nodeHttp from 'isomorphic-git/http/node';
import { createGitClient } from './git-client';
import { createSyncController } from '../sync-controller';
import { mergeNote } from './merge-note';
import { startGitServer } from './git-test-server';

const driver: MergeDriverCallback = ({ contents }) => {
  const m = mergeNote(contents[0], contents[1], contents[2]);
  return { cleanMerge: m.clean, mergedText: m.text };
};
const sha = (p: string) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function snapshot(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  function walk(relative: string) {
    for (const name of fs.readdirSync(path.join(dir, relative))) {
      if (name === '.git') continue;
      const sub = path.join(relative, name);
      const f = path.join(dir, sub);
      if (fs.statSync(f).isDirectory()) walk(sub);
      else out[sub.replaceAll('\\', '/')] = sha(f);
    }
  }
  walk('');
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}
describe('deterministic randomized Git operation sequences', () => {
  it('preserves exact files after 24 creation/edit/delete/rename rounds', async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-fuzz-'));
    const bare = path.join(temp, 'bare');
    fs.mkdirSync(bare);
    execFileSync('git', ['init', '--bare', '-q', '-b', 'main', path.join(bare, 'fuzz.git')]);
    const server = await startGitServer(bare);
    try {
      const A = path.join(temp, 'A');
      const B = path.join(temp, 'B');
      const C = path.join(temp, 'C');
      for (const dir of [A, B, C]) fs.mkdirSync(dir);
      for (let i = 0; i < 30; i++)
        fs.writeFileSync(
          path.join(A, 'note-' + i + '.md'),
          '# Nota ' + i + '\nAção com conteúdo Unicode.\n'
        );
      const client = createGitClient({ fs, http: nodeHttp }, driver);
      const controller = (dir: string) =>
        createSyncController({ client, fs, dir, now: () => new Date().toISOString() });
      const opts = { url: server.url('fuzz.git'), token: 'synthetic' };
      await controller(A).syncNow(opts);
      await controller(B).syncNow(opts);
      let seed = 0xac092026;
      const rnd = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed;
      };
      let edits = 0;
      for (let round = 0; round < 24; round++) {
        const source = round % 2 === 0 ? A : B;
        const receiver = round % 2 === 0 ? B : A;
        const files = Object.keys(snapshot(source));
        const target = files[rnd() % files.length];
        if (round % 4 === 0) {
          fs.writeFileSync(
            path.join(source, 'created-' + round + '.md'),
            '---\ntitle: Novo ' + round + '\n---\nConteúdo único ' + rnd() + '\n'
          );
        } else if (round % 4 === 1) {
          fs.appendFileSync(path.join(source, target), 'Edição ' + round + ' ref ' + rnd() + '\n');
        } else if (round % 4 === 2) {
          fs.unlinkSync(path.join(source, target));
        } else {
          fs.renameSync(path.join(source, target), path.join(source, 'renamed-' + round + '.md'));
        }
        edits++;
        await controller(source).syncNow(opts);
        await controller(receiver).syncNow(opts);
        expect(snapshot(A)).toEqual(snapshot(B));
      }
      await controller(C).syncNow(opts);
      expect(snapshot(C)).toEqual(snapshot(A));
      console.log(
        'FUZZ_GIT_RESULT',
        JSON.stringify({ edits, files: Object.keys(snapshot(A)).length, seed, parity: true })
      );
    } finally {
      await server.close();
      fs.rmSync(temp, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
    }
  }, 150000);
});
