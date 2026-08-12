import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const expectedIds = ['chatgpt', 'claude', 'gemini', 'perplexity', 'grok', 'manus'];
const platforms = JSON.parse(
  await readFile(new URL('../utils/platforms.json', import.meta.url), 'utf8')
);

assert.equal(platforms.length, expectedIds.length, 'Exactly six launch platforms are required');
assert.deepEqual(
  platforms.map(({ id }) => id).sort(),
  [...expectedIds].sort(),
  'Platform IDs changed unexpectedly'
);
assert.equal(new Set(platforms.map(({ id }) => id)).size, platforms.length, 'Platform IDs must be unique');

const matches = platforms.flatMap((platform) => platform.matches);
assert.equal(new Set(matches).size, matches.length, 'Host match patterns must be unique');

for (const platform of platforms) {
  assert.match(platform.url, /^https:\/\//, `${platform.id}: URL must use HTTPS`);
  assert.ok(platform.name, `${platform.id}: name is required`);
  assert.ok(platform.matches.length > 0, `${platform.id}: match patterns are required`);
  assert.ok(platform.reusablePaths.length > 0, `${platform.id}: reusable paths are required`);
  assert.ok(platform.loginHints.length > 0, `${platform.id}: login hints are required`);

  for (const match of platform.matches) {
    assert.match(match, /^https:\/\/[^*]+/, `${platform.id}: host permission is too broad`);
    assert.notEqual(match, '<all_urls>', `${platform.id}: all_urls is not allowed`);
  }

  for (const key of [
    'inputSelectors',
    'submitSelectors',
    'authSelectors',
    'sentIndicators',
    'generatingIndicators',
  ]) {
    assert.ok(platform.adapter[key].length > 0, `${platform.id}: ${key} must not be empty`);
  }
  assert.ok(
    platform.adapter.confirmTimeoutMs >= 3000 && platform.adapter.confirmTimeoutMs <= 10000,
    `${platform.id}: confirmation timeout must stay between 3 and 10 seconds`
  );
}

console.log(`Validated ${platforms.length} platform adapters and ${matches.length} host patterns.`);
