# Deploying the JobSpy worker for Vercel

Vercel runs the Next.js app as serverless functions. It cannot run the long-lived
Python JobSpy worker. Keep the app on Vercel and host this worker as a small
container on Render, Fly.io, Railway, or Cloud Run. The worker is public, so
`JOBSPY_TOKEN` is **required** when `JOBSPY_HOST=0.0.0.0`.

Before deploying, commit and push the changes in `mini-services/jobspy-svc/`
and `src/app/api/jobs/scrape/route.ts`. The worker host builds from the
repository, and the route must send the `Authorization` header.

## 1. Generate a shared secret

```bash
openssl rand -hex 32
```

Save the value. Use the same value in the worker host and in Vercel as
`JOBSPY_TOKEN`. Do not commit it.

## 2. Build and test locally (optional)

The build context must be the repository root because the Dockerfile copies the
root `requirements.txt`.

```bash
docker build -f mini-services/jobspy-svc/Dockerfile -t hydrahunt-jobspy .
docker run --rm -p 3001:3001 -e JOBSPY_TOKEN="$TOKEN" hydrahunt-jobspy

curl http://127.0.0.1:3001/health
curl -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:3001/scrape?keywords=software+engineer&site=indeed&n=1"
```

`/health` is public. `/scrape` returns `401` without the token. The worker
refuses to start on a non-loopback host when `JOBSPY_TOKEN` is unset.

## 3. Deploy on Render (recommended)

The repository includes `render.yaml`. In Render, choose **New → Blueprint**,
select this repository, and enter `JOBSPY_TOKEN` when prompted. The blueprint
sets the Dockerfile path, build context, health check and free plan.

To configure a web service manually instead:

1. Create a **New Web Service** from this repository.
2. Runtime: **Docker**.
3. Dockerfile path: `mini-services/jobspy-svc/Dockerfile`.
4. Docker context: `.` (repository root).
5. Environment: `JOBSPY_TOKEN=<your secret>`.
6. Health check path: `/health`.
7. Deploy. Copy the public URL, for example `https://hydrahunt-jobspy.onrender.com`.

Render sets `PORT`; the worker uses `JOBSPY_PORT`, then `PORT`, then `3001`.

## 4. Deploy on Fly.io

```bash
fly launch --no-deploy --dockerfile mini-services/jobspy-svc/Dockerfile
```

Set `internal_port = 3001` in the generated `fly.toml`, then:

```bash
fly secrets set JOBSPY_TOKEN="$TOKEN"
fly deploy
```

The public URL is shown after deployment. If Fly does not inject `PORT`, add
`[env] PORT = "3001"` to `fly.toml`.

## 5. Deploy on Railway or Cloud Run

- **Railway:** New Project → Deploy from repo → Dockerfile path
  `mini-services/jobspy-svc/Dockerfile`. Add `JOBSPY_TOKEN`. Railway injects
  `PORT`.
- **Cloud Run:** Build the image with the repo root as context and deploy it.
  Set `JOBSPY_TOKEN` as an environment variable or secret. Cloud Run injects
  `PORT` (usually `8080`).

## 6. Point Vercel at the worker

Set these for **Production** and **Preview** (dashboard or CLI). Pass
`--force` because `JOBSPY_URL` may already exist; `-e production,preview`
leaves the Development value (localhost) untouched.

```bash
vercel env add JOBSPY_URL -e production,preview \
  --value "https://<worker-host>/scrape" --force --yes

vercel env add JOBSPY_TOKEN -e production,preview \
  --value "<the same shared secret>" --sensitive --force --yes
```

Redeploy so the new values take effect:

```bash
vercel --prod --project hydrahunt --scope simonjcleary
```

## 7. Verify

```bash
# Worker health (public)
curl -s -o /dev/null -w "%{http_code}\n" https://<worker-host>/health

# Worker auth (expect 401 without the token)
curl -s -o /dev/null -w "%{http_code}\n" "https://<worker-host>/scrape?keywords=test"

# Worker with token (expect 200)
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  "https://<worker-host>/scrape?keywords=test&site=indeed&n=1"
```

Then run a broad search in the app. The "Some sources were incomplete" warning
should disappear when Indeed/ZipRecruiter/Google return results.

## Notes

- Rotate the token by updating the worker host and Vercel together.
- The worker is a scraper: respect each board's rate limits and terms.
- Vercel serverless functions have duration limits. Very deep broad searches may
  still time out. If that happens, reduce the depth or move the whole app to a
  container host so Next.js and JobSpy run together (the standalone `.zscripts`
  deployment).
