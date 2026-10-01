"""Simulates the exact ChocoData branch of /api/jobs/scrape (route.ts) to
reproduce what the user sees, page by page, with dedup."""
import json
import subprocess
import sys

KEY = subprocess.check_output(
    "grep 'CHOCODATA_API_KEY' .env | head -1 | cut -d= -f2- | tr -d '\"' | tr -d '[:space:]'",
    shell=True, text=True,
).strip()

keywords = sys.argv[1] if len(sys.argv) > 1 else 'restaurant manager'
location = sys.argv[2] if len(sys.argv) > 2 else 'Vancouver, canada'
pages = int(sys.argv[3]) if len(sys.argv) > 3 else 5
source_path = sys.argv[4] if len(sys.argv) > 4 else 'linkedin/jobsearch'
kw_param = sys.argv[5] if len(sys.argv) > 5 else 'keywords'

seen = set()
collected = 0
per_page_ids = []
for page in range(1, pages + 1):
    from urllib.parse import quote
    url = (
        f'https://api.chocodata.com/api/v1/{source_path}'
        f'?api_key={KEY}&{kw_param}={quote(keywords)}&page={page}&per_page=10'
    )
    if location:
        url += f'&location={quote(location)}'
    out = subprocess.check_output(['curl', '-s', '--max-time', '75', url, '-H', f'Authorization: Bearer {KEY}'], text=True)
    d = json.loads(out)
    rs = d.get('results') or []
    ids = []
    for r in rs:
        key = r.get('job_id') or r.get('id') or r.get('slug') or r.get('url') or ''
        ids.append(str(key)[:20])
        if key and key not in seen:
            seen.add(key)
            collected += 1
    print(f'page {page}: got {len(rs)} results, unique so far: {collected}')
    per_page_ids.append(ids)

first = per_page_ids[0] if per_page_ids else []
print(f'\nFINAL unique total (what the UI shows as totalFound): {collected}')
print('page1 == page2 ids:', per_page_ids[1] == first if len(per_page_ids) > 1 else 'n/a')
if len(per_page_ids) > 1:
    print('page1 ids:', first)
    print('page2 ids:', per_page_ids[1])
