import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const sourceRoot = dirname(fileURLToPath(import.meta.url));
export const projectRoot = resolve(sourceRoot, '../..');
export const pluginName = 'sin-yolanda-legacy-redirects';
export const pluginFiles = ['redirects.json', 'redirect-engine.php', 'sin-yolanda-legacy-redirects.php'];

export function inspectPlugin() {
  const root = join(sourceRoot, pluginName);
  if (lstatSync(root).isSymbolicLink()) throw new Error('Plugin source directory cannot be a symlink');
  const config = JSON.parse(readFileSync(join(root, 'redirects.json'), 'utf8'));
  if (config.version !== 1 || config.status !== 301 || config.targetOrigin !== 'https://sin-yolanda.com'
    || !/^\d+\.\d+\.\d+$/.test(config.pluginVersion)) throw new Error('Invalid release policy');
  if (Object.keys(config.sites).join(',') !== 'sinyolandagdl.com,sinyolandatx.com,sinyolandausa.com') {
    throw new Error('Unexpected legacy host');
  }
  let routes = 0;
  for (const entries of Object.values(config.sites)) for (const [source, target] of Object.entries(entries)) {
    if (!/^\/(?:[a-z0-9-]+\/)*$/.test(source)
      || !/^\/[a-z0-9/-]*(?:#cocktails)?$/.test(target) || target.includes('//')) throw new Error('Unsafe route');
    routes++;
  }
  if (routes !== 16) throw new Error('The approved map must contain exactly 16 routes');
  const permittedKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_term', 'utm_content'];
  if (Object.keys(config.utmValues).join(',') !== permittedKeys.join(',')) throw new Error('Invalid UTM keys');
  for (const values of Object.values(config.utmValues)) {
    if (!Array.isArray(values) || new Set(values).size !== values.length
      || values.some(v => !/^[a-z][a-z0-9_-]{0,79}$/.test(v) || /[0-9]{7,}/.test(v))) throw new Error('Invalid UTM registry');
  }
  const hashes = {};
  for (const file of pluginFiles) {
    const path = join(root, file), stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Only regular plugin files are allowed');
    hashes[pluginName + '/' + file] = createHash('sha256').update(readFileSync(path)).digest('hex');
  }
  const main = readFileSync(join(root, 'sin-yolanda-legacy-redirects.php'), 'utf8');
  if (!main.includes('Version: ' + config.pluginVersion)) throw new Error('Plugin versions differ');
  return { config, root, hashes, routes };
}

export function packagePlugin(output) {
  const inspected = inspectPlugin();
  const destination = resolve(output ?? join(projectRoot, '.artifacts/legacy-redirects', `${pluginName}-${inspected.config.pluginVersion}.zip`));
  const artifactRoot = join(projectRoot, '.artifacts');
  const location = relative(artifactRoot, destination);
  if (location === '' || location.startsWith('..') || isAbsolute(location) || !destination.endsWith('.zip')) {
    throw new Error('Plugin ZIP must remain under the ignored .artifacts directory, outside public output');
  }
  if (location.split(/[\\/]/).includes('public')) throw new Error('Never package the plugin inside public output');
  const receiptPath = destination + '.json';
  if (existsSync(destination) || existsSync(receiptPath)) throw new Error('Refuse to overwrite an existing plugin artifact');
  for (let parent = dirname(destination); parent !== projectRoot; parent = dirname(parent)) {
    if (existsSync(parent) && lstatSync(parent).isSymbolicLink()) throw new Error('Artifact path cannot contain symlinks');
  }
  mkdirSync(dirname(destination), { recursive: true });
  execFileSync('zip', ['-X', '-q', destination, ...pluginFiles.map(f => pluginName + '/' + f)], { cwd: sourceRoot, stdio: 'pipe' });
  const entries = execFileSync('unzip', ['-Z1', destination], { encoding: 'utf8' }).trim().split('\n');
  if (entries.join('\n') !== Object.keys(inspected.hashes).join('\n')) throw new Error('Unexpected ZIP entries');
  for (const [entry, hash] of Object.entries(inspected.hashes)) {
    const bytes = execFileSync('unzip', ['-p', destination, entry]);
    if (createHash('sha256').update(bytes).digest('hex') !== hash) throw new Error('ZIP file hash mismatch');
  }
  const report = { version: inspected.config.pluginVersion, routes: inspected.routes, destination,
    zipSha256: createHash('sha256').update(readFileSync(destination)).digest('hex'), files: inspected.hashes,
    activation: 'not installed; requires approved indexable destinations, backup and explicit deployment authorization' };
  writeFileSync(receiptPath, JSON.stringify(report, null, 2) + '\n');
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(packagePlugin(process.argv[2]), null, 2));
}
