import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { access, readFile, stat } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const output = new URL('../.output/chrome-mv3/', import.meta.url);
const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const platforms = JSON.parse(await readFile(new URL('utils/platforms.json', root), 'utf8'));
const manifest = JSON.parse(await readFile(new URL('manifest.json', output), 'utf8'));
const popupHtml = await readFile(new URL('popup.html', output), 'utf8');
const expectedHosts = [...new Set(platforms.flatMap(({ matches }) => matches))].sort();
const allowedPermissions = ['scripting', 'storage', 'tabGroups'];

assert.equal(manifest.manifest_version, 3, 'Manifest V3 is required');
assert.equal(manifest.version, packageJson.version, 'Package and manifest versions must match');
assert.deepEqual([...manifest.permissions].sort(), allowedPermissions, 'Unexpected Chrome permission');
assert.deepEqual([...manifest.host_permissions].sort(), expectedHosts, 'Manifest host permissions drifted');
assert.deepEqual(
  [...manifest.content_scripts[0].matches].sort(),
  expectedHosts,
  'Content-script matches drifted from platform configuration'
);
assert.ok(manifest.homepage_url, 'A public product homepage is required');

const cssPath = popupHtml.match(/href="\/?(assets\/[^\"]+\.css)"/)?.[1];
const scriptPath = popupHtml.match(/src="\/?(chunks\/[^\"]+\.js)"/)?.[1];
assert.ok(cssPath, 'Built popup must link a generated stylesheet');
assert.ok(scriptPath, 'Built popup must link a generated script');
await Promise.all([
  access(new URL(cssPath, output)),
  access(new URL(scriptPath, output)),
  access(new URL('background.js', output)),
  access(new URL('content-scripts/content.js', output)),
]);

for (const size of [16, 48, 128]) {
  const bytes = await readFile(new URL(`icons/icon${size}.png`, output));
  assert.equal(bytes.toString('ascii', 1, 4), 'PNG', `icon${size}.png must be PNG`);
  assert.equal(bytes.readUInt32BE(16), size, `icon${size}.png width is incorrect`);
  assert.equal(bytes.readUInt32BE(20), size, `icon${size}.png height is incorrect`);
}

const zipUrl = new URL(`.output/chorus-${packageJson.version}-chrome.zip`, root);
await access(zipUrl);
assert.ok((await stat(zipUrl)).size < 1_000_000, 'Release ZIP unexpectedly exceeds 1 MB');
const zipEntries = execFileSync('unzip', ['-Z1', zipUrl.pathname], { encoding: 'utf8' })
  .trim()
  .split('\n');
for (const required of ['manifest.json', 'popup.html', 'background.js', 'content-scripts/content.js']) {
  assert.ok(zipEntries.includes(required), `Release ZIP is missing ${required}`);
}
assert.ok(zipEntries.some((entry) => entry.startsWith('assets/') && entry.endsWith('.css')), 'Release ZIP is missing popup CSS');
assert.ok(!zipEntries.some((entry) => entry.endsWith('.ts') || entry.includes('node_modules/')), 'Release ZIP contains source or dependency files');

console.log(`Validated Manifest V3 package and ${Math.round((await stat(zipUrl)).size / 1024)} KB release ZIP.`);
