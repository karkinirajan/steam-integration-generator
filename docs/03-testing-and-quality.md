# 3. Testing and quality

## Suites

| Suite | Run (from) | Covers |
| --- | --- | --- |
| Backend | `uv run pytest -q` (`backend/`) | Settings, form validation, prompts, the Markdown parser (including a check against the reference regex and a timing test on hostile input), the DOCX and PDF writers, the Gemini service (`generate` and `stream`) against a fake client, and every endpoint through FastAPI's `TestClient`: SSE framing, mid-stream errors, the key header, limits, exports, CORS. No test touches the network. |
| Backend lint and types | `uv run ruff check .` and `uv run mypy app` | All backend code. |
| Frontend | `pnpm test` (`frontend/`) | The SSE parser (`node:test`): events split across network chunks, CRLF, comments, multi-line data. |
| Frontend lint, types and build | `pnpm lint`, `pnpm typecheck`, `pnpm build` | All frontend code. |

## Mutation checks

A passing suite only shows the tests agree with the code. `backend/tests/mutation/` checks they would **disagree** if the code were wrong. It applies one deliberate bug at a time, and the suite must fail for each.

```sh
cd backend
uv run python tests/mutation/mutate.py tests/mutation/py_mutants.py -- uv run pytest -x -q -p no:cacheprovider
```

How the driver behaves:

- The suite must pass before any mutation is applied.
- Each pattern must match exactly once.
- It restores the files in a `finally` block, so never kill it and do not edit the tree while it runs.

A surviving mutant means a missing test or redundant code; fix the cause. Mutants that cannot change behaviour are listed, with the reason, at the top of `py_mutants.py`. The `app/api` layer is not mutated yet.

## CI

`.github/workflows/ci.yml` has three jobs:

- **backend:** ruff, mypy and pytest on Python 3.14.
- **frontend:** lint, typecheck, tests and build on Node 26.
- **docker:** builds both images with compose, starts the stack, and checks `/api/health` through the web container.

## Not tested automatically

- The browser UI has no end-to-end test. It was checked by hand in a browser at desktop and phone widths: the empty state and the error path, using a fake key that the real Gemini API rejected.
- No successful generation has been run, because no real key was used. The styled result view has only been exercised by the type checker and the build.
