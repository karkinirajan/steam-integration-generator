# Deliberate bugs in web/format.js, one at a time: each (name, file, old text, new text) must make `node --test web` fail.
# Run from the repository root:
#   uv run python tests/mutation/mutate.py tests/mutation/js_mutants.py -- node --test web
# (the driver checks the suite is green first; do not edit the tree while it runs; each `old` must occur exactly once)

F = "web/format.js"

M = [
    ("escape: & is not escaped", F, "      .replace(/&/g, '&amp;')\n", ""),
    ("escape: < is not escaped", F, "      .replace(/</g, '&lt;')\n", ""),
    ("escape: > is not escaped", F, "      .replace(/>/g, '&gt;')\n", ""),
    ("escape: a double quote is not escaped", F, "      .replace(/\"/g, '&quot;')\n", ""),
    ("escape: a single quote is not escaped", F, "      .replace(/'/g, '&#39;');\n", "      ;\n"),
    ("escape: input is not turned into text", F, "    return String(text)\n", "    return text\n"),
    ("markdown: the text is not escaped first", F, "    let html = escapeHtml(markdown);", "    let html = String(markdown);"),
    ("markdown: code blocks are not converted", F, "    html = html.replace(/```([\\s\\S]*?)```/g, '<pre><code>$1</code></pre>');\n", ""),
    ("markdown: bold may start with a space", F, "/\\*\\*(?=\\S)(.+?)(?<=\\S)\\*\\*/g", "/\\*\\*(.+?)\\*\\*/g"),
    ("markdown: bold is not converted", F, "'<b>$1</b>'", "'$1'"),
    ("markdown: italic may start with a space", F, "/\\*(?=[^\\s*])(.+?)(?<=[^\\s*])\\*/g", "/\\*(.+?)\\*/g"),
    ("markdown: italic is not converted", F, "'<i>$1</i>'", "'$1'"),
    ("markdown: inline code is not converted", F, "    html = html.replace(/`([^`\\n]+)`/g, '<code>$1</code>');\n", ""),
    ("markdown: inline code may span lines", F, "/`([^`\\n]+)`/g", "/`([^`]+)`/g"),
    ("markdown: --- anywhere is a rule", F, "/^---$/gm", "/---/g"),
    ("markdown: a rule is not converted", F, "    html = html.replace(/^---$/gm, '<hr>');\n", ""),
    ("markdown: newlines are not line breaks", F, "    html = html.replace(/\\n/g, '<br>');\n", ""),
    ("markdown: the browser global is not set", F, "    Object.assign(root, api);", "    void api;"),
]
