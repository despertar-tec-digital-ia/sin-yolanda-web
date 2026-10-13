// Mechanical preparation from reviewed operators; never executes a remote write.
import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base='scripts/legacy-redirects/';
writeFileSync(base+'sin-yolanda-root-routing/attribution.php',
 readFileSync(base+'sin-yolanda-legacy-redirects/redirect-engine.php','utf8').replace('namespace SinYolanda\\LegacyRedirects;','namespace SinYolanda\\RootAttribution;'));
let pack=readFileSync(base+'sin-yolanda-root-directory/package.mjs','utf8')
 .replaceAll('sin-yolanda-root-directory','sin-yolanda-root-routing')
 .replace("['root-engine.php', 'sin-yolanda-root-routing.php']","['root-engine.php', 'sin-yolanda-root-routing.php', 'attribution.php']")
 .replaceAll('routes: 2','routes: 4').replace('additive pause only','home routes only');
writeFileSync(base+'sin-yolanda-root-routing/package.mjs',pack);
let deploy=readFileSync(base+'deploy-root-directory.mjs','utf8')
 .replaceAll('sin-yolanda-root-directory','sin-yolanda-root-routing')
 .replaceAll('root-directory','root-routing').replaceAll('Root-directory','Root-routing')
 .replaceAll('routes !== 2','routes !== 4')
 .replace("[`${pluginName}/root-engine.php`, pluginFile]","[`${pluginName}/root-engine.php`, pluginFile, `${pluginName}/attribution.php`]")
 .replaceAll("['tx', 'usa']","['tx', 'usa', 'gdl', 'maricarmen']")
 .replaceAll('tx|usa','tx|usa|gdl|maricarmen')
 .replace('Choose TX or USA','Choose one fixed legacy domain')
 .replace("const credentials = credentialsFromEnvironment(options.site, values)","const credentials = rootCredentials(options.site, values)")
 .replace("    if (!plugins.some(item => item.file === originalPluginFile && item.active && item.version === '1.0.0')) fail('Original legacy redirect plugin is not the expected active version; stop without changing plugin state');\n",'')
 .replace("const destination=await fetcher('https://sin-yolanda.com/locations',","const target=options.site==='gdl'?'guadalajara':'locations';\n    const destination=await fetcher('https://sin-yolanda.com/'+target,")
 .replace("!html.includes('rel=\"canonical\" href=\"https://sin-yolanda.com/locations\"')","!html.includes('rel=\"canonical\" href=\"https://sin-yolanda.com/'+target+'\"')")
 .replace("!html.includes('data-page=\"locations\"')","(target==='locations'?!html.includes('data-page=\"locations\"'):!html.includes('Sin Yolanda Guadalajara'))");
const seam='export async function run(options';
assert.ok(deploy.includes(seam));
deploy=deploy.replace(seam,`export function rootCredentials(site, values) {
  if (site !== 'maricarmen') return credentialsFromEnvironment(site, values);
  const username=values.MARICARMEN_WP_USER,password=values.MARICARMEN_WP_PASS;
  if (!username || !password || /[\\r\\n\\0]/.test(username+password)) fail('Required legacy login credentials are unavailable');
  return {origin:'https://maricarmengdl.com',loginUrl:'https://maricarmengdl.com/accesooculto/',username,password};
}
\n`+seam);
assert.ok(deploy.includes("rootCredentials(options.site, values)"));
writeFileSync(base+'deploy-root-routing.mjs',deploy);
