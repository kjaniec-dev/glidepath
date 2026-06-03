# ── stage 1: build / install deps ─────────────────────────────────────────────
FROM python:3.13-slim AS builder

# uv installs much faster than pip for workspace packages.
COPY --from=ghcr.io/astral-sh/uv:0.11.18 /uv /uvx /usr/local/bin/

WORKDIR /app

# Copy only the files needed to resolve/install deps first (better layer caching).
COPY pyproject.toml uv.lock ./
COPY packages/core/pyproject.toml packages/core/README.md packages/core/
COPY packages/core/src/ packages/core/src/
COPY apps/api/pyproject.toml apps/api/

# Install everything into a local venv; no extras for viz/Streamlit.
RUN uv sync --frozen --no-dev --package glidepath-api

# ── stage 2: runtime ──────────────────────────────────────────────────────────
FROM python:3.13-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the virtualenv and source from builder.
COPY --from=builder /app/.venv .venv
COPY --from=builder /app/packages/core/src packages/core/src
COPY apps/api/src apps/api/src

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH="/app/packages/core/src:/app/apps/api/src" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

EXPOSE 8000

# Single worker is correct here: the engine holds no state and GIL-holding numpy
# work makes multi-threading pointless; scale horizontally with multiple replicas.
CMD ["uvicorn", "glidepath_api:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
