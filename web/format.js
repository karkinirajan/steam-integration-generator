/*
 * Pure helpers for the page. The browser loads this as a plain script (it defines escapeHtml and markdownToHtml as globals);
 * Node's test runner loads it with require().
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    Object.assign(root, api);
  }
})(typeof self !== 'undefined' ? self : this, function () {
  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /*
   * The model's light Markdown to HTML. The text is escaped FIRST and formatted after, so nothing the model (or the topic it
   * echoes) writes can become markup. It used to be assigned to innerHTML as written, which let any <script>-like text run.
   */
  function markdownToHtml(markdown) {
    let html = escapeHtml(markdown);
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    html = html.replace(/\*\*(?=\S)(.+?)(?<=\S)\*\*/g, '<b>$1</b>');
    html = html.replace(/\*(?=[^\s*])(.+?)(?<=[^\s*])\*/g, '<i>$1</i>');
    html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    html = html.replace(/^---$/gm, '<hr>');
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  return { escapeHtml, markdownToHtml };
});
