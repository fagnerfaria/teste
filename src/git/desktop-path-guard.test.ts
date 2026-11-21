import { afterEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import { createDesktopPathGuard } from './desktop-path-guard';

const filesystem = vi.hoisted(() => ({ realpath: vi.fn(), lstat: vi.fn() }));
vi.mock('node:fs/promises', () => filesystem);

const vault = path.resolve('synthetic-vault');
const note = path.join(vault, 'note.md');

afterEach(() => vi.resetAllMocks());

describe('desktop physical path guard', () => {
  it('allows a regular file resolved within the vault', async () => {
    filesystem.realpath.mockResolvedValueOnce(vault).mockResolvedValueOnce(note);
    await expect(createDesktopPathGuard(vault)('note.md')).resolves.toBeUndefined();
  });

  it('denies a file when the filesystem resolves it outside the vault', async () => {
    filesystem.realpath
      .mockResolvedValueOnce(vault)
      .mockResolvedValueOnce(path.resolve('separate-synthetic-folder', 'note.md'));
    await expect(createDesktopPathGuard(vault)('note.md')).rejects.toMatchObject({
      code: 'EACCES',
    });
  });

  it('allows a new file when its existing parent resolves within the vault', async () => {
    const missing = Object.assign(new Error('Missing synthetic file'), { code: 'ENOENT' });
    filesystem.realpath
      .mockResolvedValueOnce(vault)
      .mockRejectedValueOnce(missing)
      .mockResolvedValueOnce(vault);
    filesystem.lstat.mockRejectedValueOnce(missing);
    await expect(createDesktopPathGuard(vault)('note.md')).resolves.toBeUndefined();
  });
});
