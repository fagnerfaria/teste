export function createDesktopPathGuard(basePath: string) {
  return async (vaultPath: string): Promise<void> => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const root = await fs.realpath(basePath);
    const inside = (candidate: string) => {
      const relative = path.relative(root, candidate);
      return (
        relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative)
      );
    };
    const denied = () =>
      Object.assign(new Error('Path is outside the physical vault or cannot be resolved'), {
        code: 'EACCES',
      });
    let current = path.resolve(root, vaultPath === '/' ? '.' : vaultPath);
    if (!inside(current)) throw denied();
    for (;;) {
      try {
        if (!inside(await fs.realpath(current))) throw denied();
        return;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        // A new entry is safe only when an existing ancestor is inside the vault.
        // A dangling link can exist even when realpath reports ENOENT.
        try {
          await fs.lstat(current);
          throw denied();
        } catch (missing) {
          if ((missing as NodeJS.ErrnoException).code !== 'ENOENT') throw missing;
        }
        const parent = path.dirname(current);
        if (parent === current || !inside(parent)) throw denied();
        current = parent;
      }
    }
  };
}
