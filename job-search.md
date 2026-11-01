# Job search setup and coverage

The default **Broad search** checks LinkedIn through ChocoData and Indeed, ZipRecruiter and Google Jobs through JobSpy. You can also select a single board, including the remote-focused ChocoData sources. Search depth is 1–10: ChocoData requests up to that many pages (10 requested results per page); JobSpy requests 25 results per depth level, capped at 100 per board. Boards may return fewer, block requests, repeat pages or have their own coverage and geographic restrictions. A broad search continues when one source fails and displays warnings; results are shown as they are saved.

ChocoData requires `CHOCODATA_API_KEY` in the server environment. Each page consumes a provider request. `CHOCODATA_RATE_LIMIT_RPM` defaults to 10 requests per minute; the in-process limiter shares that budget across users on the same server, but is not a distributed rate limiter or a daily quota tracker. Higher depth takes longer and can consume more quota.

JobSpy requires Python and `pip install -r requirements.txt`. `npm run dev:services` starts the local worker and Next.js. For other environments, start `python3 mini-services/jobspy-svc/app.py` separately or configure `JOBSPY_URL` to a worker's `/scrape` URL. The worker binds to loopback by default and should not be exposed publicly. The repository's deployment scripts package and start a local worker unless `JOBSPY_URL` is set to an external service.

Saved results can be viewed using **Show All Jobs**. Jobs are deduplicated by source ID and exact job URL where available; the same posting with different URLs may still appear more than once. Refreshing the page loads all saved jobs in batches.

Offline regression tests: `npx tsx --test tests/job-scrape.test.ts` and `python3 tests/jobspy-service.test.py`.
