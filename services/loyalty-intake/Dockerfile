FROM python:3.12-slim@sha256:a6e34c598f2467ed0e9a8d349809fcd8b5c603269512df273a0bb1784edc11b1

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy \
    PATH=/app/.venv/bin:$PATH
WORKDIR /app
RUN python -m pip install --no-cache-dir --disable-pip-version-check uv==0.11.7
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY sy_intake/ ./sy_intake/
COPY run_production.py ./
RUN groupadd --gid 10001 intake \
    && useradd --uid 10001 --gid 10001 --no-create-home --shell /usr/sbin/nologin intake \
    && install -d -m 0700 -o 10001 -g 10001 /data /backups
USER 10001:10001
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2).close()"
CMD ["python", "run_production.py"]
