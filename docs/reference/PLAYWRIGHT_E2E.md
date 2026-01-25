# Playwright E2E tests (scaffold)

This repository includes a small Playwright scaffold under `frontend/tests/e2e`.
It contains a smoke test that posts to the backend `POST /auth/register` endpoint and asserts the server sets a `refresh_token` cookie.

How to run locally

1. Start the backend and frontend in dev mode. By default the Playwright config assumes:
   - Frontend served at `http://localhost:5173`
   - Backend API at `http://localhost:8000`

2. Install dev dependencies in the `frontend/` folder (Playwright will be installed as a dev dependency):

```pwsh
cd frontend
npm install
npx playwright install --with-deps

```text
3. Run the E2E tests:

```pwsh
cd frontend
npm run e2e

```text
Notes

- The test uses the environment variable `E2E_API_BASE` to target a non-default backend address.
- This is a lightweight scaffold — expand tests to drive the UI through the browser if you want full end-to-end coverage (start the frontend dev server and use Playwright's `page` fixture to interact with the UI).
