import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('activation removes old calculator caches but preserves unrelated caches', async () => {
  const handlers = {};
  const deleted = [];
  const caches = {
    keys: async () => ['cgpa-calculator-v25', 'cgpa-calculator-v27', 'another-app-v1'],
    delete: async (key) => { deleted.push(key); },
  };
  const self = {
    addEventListener: (name, handler) => { handlers[name] = handler; },
    clients: { claim: async () => {} },
  };
  const script = await readFile(new URL('../serviceWorker.js', import.meta.url), 'utf8');
  vm.runInNewContext(script, { self, caches, Promise });
  let activation;
  handlers.activate({ waitUntil: (promise) => { activation = promise; } });
  await activation;
  assert.deepEqual(deleted, ['cgpa-calculator-v25']);
});
