import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);

const expectedMainExports = [
  'MdRenderer',
  'alertPlugin',
  'codeBlockPlugin',
  'cursorPlugin',
  'emojiPlugin',
  'imageViewerPlugin',
  'katexPlugin',
  'mermaidPlugin',
];

function assertMainExports(module) {
  for (const name of expectedMainExports) {
    assert.ok(name in module, `missing main export: ${name}`);
  }
  assert.equal(module.default, module.MdRenderer);
}

test('package root supports ESM imports', async () => {
  const module = await import('mio-previewer');
  assertMainExports(module);
});

test('package root supports CommonJS require', () => {
  const module = require('mio-previewer');
  assertMainExports(module);
});

test('plugin subpaths expose the documented factories', async () => {
  const customEsm = await import('mio-previewer/plugins/custom');
  const markdownItEsm = await import('mio-previewer/plugins/markdown-it');
  const customCjs = require('mio-previewer/plugins/custom');
  const markdownItCjs = require('mio-previewer/plugins/markdown-it');

  for (const module of [customEsm, customCjs]) {
    assert.equal(typeof module.codeBlockPlugin, 'function');
    assert.equal(typeof module.emojiPlugin, 'function');
    assert.equal(typeof module.mermaidPlugin, 'function');
  }

  for (const module of [markdownItEsm, markdownItCjs]) {
    assert.equal(typeof module.alertPlugin, 'function');
    assert.equal(typeof module.katexPlugin, 'function');
    assert.equal(typeof module.createKatexPlugin, 'function');
  }
});

test('package exports the bundled stylesheet', () => {
  assert.match(require.resolve('mio-previewer/style.css'), /mio-previewer\.css$/);
});
