FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=1 HF_HUB_DISABLE_TELEMETRY=1 HF_HUB_DISABLE_XET=1
RUN pip install --no-cache-dir faster-whisper==1.2.1 && useradd --uid 10001 --create-home speech
WORKDIR /app
COPY worker.py /app/worker.py
USER speech
CMD ["python", "/app/worker.py"]
