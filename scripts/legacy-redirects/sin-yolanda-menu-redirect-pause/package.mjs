import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const sourceRoot = dirname(fileURLToPath(import.meta.url));
export const projectRoot = resolve(sourceRoot, '../../..');
export const pluginName = 'sin-yolanda-menu-redirect-pause';
export const pluginFiles = ['pause-engine.php', 'sin-yolanda-menu-redirect-pause.php'];
export const version = '1.0.0';

export function inspectPlugin() {
  if (lstatSync(sourceRoot).isSymbolicLink()) throw new Error('Plugin source cannot contain symlinks');
  const hashes = {};
  for (const file of pluginFiles) {
    const path = join(sourceRoot, file), stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Only regular PHP source files are permitted');
    hashes[pluginName + '/' + file] = createHash('sha256').update(readFileSync(path)).digest('hex');
  }
  if (!readFileSync(join(sourceRoot, pluginFiles[1]), 'utf8').includes('Version: ' + version)) throw new Error('Version mismatch');
  return { root: sourceRoot, hashes, version, routes: 8 };
}

export function packagePlugin(output) {
  const inspected = inspectPlugin();
  const destination = resolve(output ?? join(projectRoot, '.artifacts/legacy-redirects', `${pluginName}-${version}.zip`));
  const location = relative(join(projectRoot, '.artifacts'), destination);
  if (location === '' || location.startsWith('..') || isAbsolute(location) || !destination.endsWith('.zip')
      || location.split(/[\\/]/).includes('public')) throw new Error('Plugin ZIP must remain under .artifacts outside public output');
  if (existsSync(destination) || existsSync(destination + '.json')) throw new Error('Refuse to overwrite existing artifacts');
  for (let parent = dirname(destination); parent !== projectRoot; parent = dirname(parent)) {
    if (existsSync(parent) && lstatSync(parent).isSymbolicLink()) throw new Error('Artifact path cannot contain symlinks');
  }
  mkdirSync(dirname(destination), { recursive: true });
  execFileSync('zip', ['-X', '-q', destination, ...pluginFiles.map(file => pluginName + '/' + file)], { cwd: dirname(sourceRoot), stdio: 'pipe' });
  const entries = execFileSync('unzip', ['-Z1', destination], { encoding: 'utf8' }).trim().split('\n');
  if (entries.join('\n') !== Object.keys(inspected.hashes).join('\n')) throw new Error('Unexpected ZIP entries');
  for (const [entry, hash] of Object.entries(inspected.hashes)) {
    if (createHash('sha256').update(execFileSync('unzip', ['-p', destination, entry])).digest('hex') !== hash) throw new Error('ZIP hash mismatch');
  }
  const report = { version, routes: 8, destination, zipSha256: createHash('sha256').update(readFileSync(destination)).digest('hex'),
    files: inspected.hashes, activation: 'not installed; additive pause only; requires explicit deployment authorization and backup' };
  writeFileSync(destination + '.json', JSON.stringify(report, null, 2) + '\n');
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(packagePlugin(process.argv[2]), null, 2));
