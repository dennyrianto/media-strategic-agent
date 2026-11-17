# Media Strategic Suite — Python backend

The original AI Studio app (React + Express + Gemini) with the **Express server replaced by
FastAPI**. The React UI is unchanged and keeps working because the API URLs and JSON shapes are
identical.

```
backend/    FastAPI + Pydantic + google-genai   (Python 3.10+)
frontend/   React 19 + Vite UI (your original UI)
docs/       openapi.json — the API contract
```

## Run it (development)

Two terminals:

```bash
# 1) API  -> http://localhost:8000  (interactive docs at /docs)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env            # then put your GEMINI_API_KEY in it
uvicorn app.main:app --reload --port 8000

# 2) UI   -> http://localhost:3000  (proxies /api to :8000)
cd frontend
npm install
npm run dev
```

## Run it (single process, production-style)

```bash
cd frontend && npm install && npm run build      # creates frontend/dist
cd ../backend && uvicorn app.main:app --host 0.0.0.0 --port 8000
```

FastAPI serves the built UI and the API from the same port when `frontend/dist` exists.

## Tests

```bash
cd backend && pytest        # 33 tests, no API key or network needed (Gemini is faked)
ruff check app tests scripts
cd frontend && npm run typecheck
```

## Backend layout

| File | Responsibility |
|---|---|
| `app/models.py` | Pydantic models (replaces `types.ts` + the hand-written Gemini schemas). Same class validates requests, tells Gemini the output shape, and validates its answer. |
| `app/prompts.py` | **All prompt text**, ported from `server.ts`. Truncation limits are named constants at the top. |
| `app/gemini.py` | SDK wrapper: JSON mode, validation, one retry, truncated-array recovery, image generation, error mapping. |
| `app/routes.py` | The 7 `/api/gemini/*` endpoints + `/api/health`, rate limiting. |
| `app/markdown_render.py` | Builds the `text` markdown returned with each step (identical format to before). |
| `app/main.py` | App factory, error handlers (always `{"error": "..."}`), body-size cap, static UI serving. |
| `app/config.py` | Settings from env / `backend/.env`. |

## Changing the UI later

The UI and backend only meet at one place: **`frontend/services/geminiService.ts`** calling
`/api/gemini/*`. Restyle, restructure or rewrite the UI freely as long as it uses those calls.

- **Contract:** `docs/openapi.json` (also live at `http://localhost:8000/docs`).
- **Typed client for a new UI:** after changing any model, run
  `python backend/scripts/export_openapi.py` then `cd frontend && npm run gen:api-types`
  → regenerates `frontend/api-types.ts`. (Generated, not imported by the current UI yet.)
- **Styling:** the UI still loads Tailwind from its CDN in `frontend/index.html`. That is fine for
  now, but when you start restyling, install Tailwind through Vite so you get a proper build.
- **Don't need the React UI at all?** The API is plain JSON, so any front end (Streamlit, HTMX,
  mobile) can call it.

## What differs from the original server

Behavior is the same unless listed here.

- Gemini output is validated with Pydantic; a bad reply is retried once and otherwise returns a
  clear error. Previously it silently produced `[]`/`{}`. Truncated arrays are still recovered.
- Persona portraits are generated with a concurrency cap (`IMAGE_CONCURRENCY`, default 3) instead
  of all at once. A failed portrait still never fails the step.
- Per-IP rate limit (default 30/min) and a 60 MB body cap. There is still **no authentication**.
- Missing fields in prompts render as empty text instead of the literal word `undefined`.
- `index.html`: removed the AI Studio import map and a stylesheet link to a file that doesn't exist.
- `App.tsx`: one-line type cast so `npm run typecheck` passes.
- `frontend/package.json`: dropped `express`, `tsx`, `@google/genai` (server-only).

## Things to know / next steps

- **Model IDs** (`gemini-3.8-flash`, `gemini-3.1-flash-lite-image`) are copied from your original
  code and I could not verify them. If every call fails with a model error, change them in `.env`.
- **Not exercised against the live Gemini API** (no key available when this was built): the tests
  use a fake, and the Gemini request schemas were checked by converting them with the SDK.
  Run each step once with your key to confirm output quality.
- **Exports** (PPTX/DOCX) still run in the browser as before. Moving them to `python-pptx` /
  `python-docx` on the server would remove ~3× duplicated code from `StepViews.tsx` and is a good
  next step.
- **Sessions** still live in the browser's `localStorage`. Add a database if you need
  multi-device or multi-user.
- **Context between steps** is still truncated to the same small excerpts (see the constants in
  `prompts.py`) — raising them is a one-line change and likely improves later steps.
- **Before a public deploy:** add authentication (or put it behind your company SSO/proxy).
