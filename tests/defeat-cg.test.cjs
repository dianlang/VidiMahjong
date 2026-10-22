/* Builder-level smoke tests: run from the builder root using
 *   node --test tests/defeat-cg.test.cjs
 * No npm install or upstream source checkout required.
 */
'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'patch/js/traditional/defeat-cg.js'), 'utf8');
const builder = fs.readFileSync(path.join(root, 'build-from-upstream.ps1'), 'utf8');
const context = {window: {}, document: {}, QueYeCharacters: require('../js/traditional/characters.js')};
vm.runInNewContext(js, context, {filename: 'defeat-cg.js'});
const getLastPlace = context.window.QueYeDefeatCG.getLastPlace;

test('fourth-place selection uses final scores', () => {
  assert.equal(getLastPlace([43000, 22000, 10000, 25000]).seat, 2);
  assert.equal(getLastPlace([1000, 2000, 3000, 4000]).seat, 0);
});
test('ties select one reproducible last-place seat', () => {
  assert.equal(getLastPlace([100, 80, 80, 90]).seat, 2);
  assert.equal(getLastPlace([50, 50, 50, 50]).seat, 3);
  assert.equal(getLastPlace([60, 70, 60, 60]).seat, 3);
});
test('invalid score shapes are rejected', () => {
  assert.equal(getLastPlace([]), null);
  assert.equal(getLastPlace([100, 200, 300]), null);
  assert.equal(getLastPlace([100, NaN, 300, 400]), null);
});
test('the builder copies and loads CG resources', () => {
  assert.match(builder, /patch\\css\\defeat-cg\.css/);
  assert.match(builder, /patch\\js\\traditional\\defeat-cg\.js/);
  assert.match(builder, /<\/head>/);
  assert.match(builder, /<\/body>/);
  assert.ok(fs.existsSync(path.join(root, 'patch/css/defeat-cg.css')));
  for (let i = 1; i <= 6; i++) {
    assert.ok(fs.existsSync(path.join(root, `patch/assets/characters/character-${String(i).padStart(2, '0')}/README.md`)));
  }
});
