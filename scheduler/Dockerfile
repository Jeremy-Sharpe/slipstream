FROM python:3.12-slim-bookworm

WORKDIR /app
COPY run.py /app/run.py

USER 65532:65532
ENTRYPOINT ["python", "/app/run.py"]
