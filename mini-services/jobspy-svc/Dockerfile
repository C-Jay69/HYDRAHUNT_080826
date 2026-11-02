FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    JOBSPY_HOST=0.0.0.0

WORKDIR /app

COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY mini-services/jobspy-svc/app.py ./app.py
COPY mini-services/jobspy-svc/healthcheck.py ./healthcheck.py

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["python3", "healthcheck.py"]

CMD ["python3", "app.py"]
