const test = require('node:test');
const assert = require('node:assert/strict');
const { escapeHtml, markdownToHtml } = require('./format.js');

test('escapeHtml escapes the five characters that matter', () => {
  assert.equal(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`), '&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;');
});

test('escapeHtml escapes the ampersand first, so entities are not double-escaped wrongly', () => {
  assert.equal(escapeHtml('&lt;'), '&amp;lt;');
});

test('escapeHtml turns non-strings into text', () => {
  assert.equal(escapeHtml(42), '42');
  assert.equal(escapeHtml(null), 'null');
});

test('a script tag in the model output cannot become markup', () => {
  const html = markdownToHtml('Hi <script>alert(1)</script> there');
  assert.ok(!html.includes('<script'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('an event-handler attribute cannot become markup', () => {
  const html = markdownToHtml('<img src=x onerror=alert(1)>');
  assert.ok(!html.includes('<img'));
});

test('formatting characters inside escaped text still work', () => {
  assert.equal(markdownToHtml('**<b>x</b>**'), '<b>&lt;b&gt;x&lt;/b&gt;</b>');
});

test('bold and italic', () => {
  assert.equal(markdownToHtml('a **b** and *c*'), 'a <b>b</b> and <i>c</i>');
});

test('the spaces around styled words survive', () => {
  assert.equal(markdownToHtml('one **two** three'), 'one <b>two</b> three');
});

test('arithmetic with asterisks is not italic', () => {
  assert.equal(markdownToHtml('2 * 3 * 4'), '2 * 3 * 4');
});

test('a delimiter must touch the text it wraps', () => {
  for (const text of ['** open**', '**close **', '** both **', '* open*', '*close *', 'a * b*']) {
    assert.equal(markdownToHtml(text), text);
  }
});

test('inline code does not span a line break', () => {
  assert.equal(markdownToHtml('`a\nb`'), '`a<br>b`');
});

test('a lone asterisk and an unclosed bold stay as written', () => {
  assert.equal(markdownToHtml('5 * 3'), '5 * 3');
  assert.equal(markdownToHtml('an **unclosed'), 'an **unclosed');
});

test('a bullet line keeps its marker and styles its content', () => {
  assert.equal(markdownToHtml('* **Goal:** learn'), '* <b>Goal:</b> learn');
});

test('italic does not span lines', () => {
  assert.equal(markdownToHtml('*a\nb*'), '*a<br>b*');
});

test('code blocks and inline code', () => {
  assert.equal(markdownToHtml('```\nx < y\n```'), '<pre><code><br>x &lt; y<br></code></pre>');
  assert.equal(markdownToHtml('use `npm test` now'), 'use <code>npm test</code> now');
});

test('a horizontal rule must be a line of its own', () => {
  assert.equal(markdownToHtml('above\n---\nbelow'), 'above<br><hr><br>below');
  assert.equal(markdownToHtml('a---b'), 'a---b');
});

test('newlines become line breaks', () => {
  assert.equal(markdownToHtml('a\nb\n\nc'), 'a<br>b<br><br>c');
});

test('empty and non-string input is safe', () => {
  assert.equal(markdownToHtml(''), '');
  assert.equal(markdownToHtml(undefined), 'undefined');
});

test('the browser global form is exported too', () => {
  const globals = {};
  const source = require('node:fs').readFileSync(require.resolve('./format.js'), 'utf8');
  new Function('module', 'self', source).call(globals, undefined, globals);
  assert.equal(typeof globals.markdownToHtml, 'function');
  assert.equal(typeof globals.escapeHtml, 'function');
});
