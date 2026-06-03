# glidepath-web

React + Recharts client for the glidepath Monte Carlo API. It owns **zero**
simulation logic — it posts parameters to the stateless `POST /simulate`
endpoint and renders the percentile arrays it gets back.

## Develop

```bash
# 1) start the API (from the repo root)
uv run --package glidepath-api uvicorn glidepath_api:app --reload --port 8000

# 2) start the web client
cp .env.example .env        # points VITE_API_URL at http://localhost:8000
npm install
npm run dev                 # http://localhost:5173
```

## Build (Netlify)

```bash
npm run build               # outputs dist/
```

Set `VITE_API_URL` in the Netlify environment to your deployed API URL. Build
command `npm run build`, publish directory `dist`.
