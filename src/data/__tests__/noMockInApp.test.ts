import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The app talks to the database, not to a fake.
 *
 * `src/data/testing/` still holds an in-memory data source, because the
 * repository rules are worth testing without a network. The risk is that it
 * creeps back into the app — an import added while debugging, a composition
 * root switched back "just for now" and forgotten, and the app silently runs
 * on invented data while appearing to work perfectly. So this walks the source
 * and fails if anything outside a test reaches for it.
 */

const ROOT = join(__dirname, '..', '..', '..');

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      // Tests are exactly where the fake belongs.
      if (entry === '__tests__' || entry === 'testing') continue;
      sourceFiles(path, found);
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      found.push(path);
    }
  }
  return found;
}

const files = [
  ...sourceFiles(join(ROOT, 'src')),
  ...sourceFiles(join(ROOT, 'app')),
];

describe('no part of the app depends on the in-memory fake', () => {
  it('has files to check', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('imports neither the fake nor the seed anywhere outside tests', () => {
    const offenders = files.filter((path) => {
      const text = readFileSync(path, 'utf8');
      return /from\s+['"][^'"]*\/testing\/(InMemoryDataSource|seed)['"]/.test(text)
        || /InMemoryDataSource/.test(text);
    });
    expect(offenders.map((p) => p.replace(`${ROOT}/`, ''))).toEqual([]);
  });

  it('builds the data source from Turso', () => {
    const root = readFileSync(join(ROOT, 'src', 'data', 'index.ts'), 'utf8');
    expect(root).toMatch(/new TursoDataSource\(/);
    expect(root).not.toMatch(/InMemory|Mock/);
  });

  it('builds the auth source from Firebase', () => {
    const root = readFileSync(join(ROOT, 'src', 'auth', 'source.ts'), 'utf8');
    expect(root).toMatch(/new FirebaseAuthSource\(/);
    expect(root).not.toMatch(/Mock/);
  });
});
