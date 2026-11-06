"""Offline regression tests for the JobSpy worker; no job-board calls required."""
import importlib.util
import json
from pathlib import Path
import sys
import threading
import time
import types
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import urlopen
from http.server import ThreadingHTTPServer

sys.modules['jobspy'] = types.SimpleNamespace(scrape_jobs=lambda **kwargs: None)
spec = importlib.util.spec_from_file_location('jobspy_service', Path(__file__).parents[1] / 'mini-services/jobspy-svc/app.py')
service = importlib.util.module_from_spec(spec)
spec.loader.exec_module(service)


class JobSpyTests(unittest.TestCase):
    def test_result_depth_and_remote(self):
        calls = []
        with patch.object(service, 'scrape_jobs', side_effect=lambda **kwargs: calls.append(kwargs)):
            self.assertEqual(service.scrape_site('indeed', 'engineer', 'Worldwide', 100, None), ([], None))
            self.assertEqual(service.scrape_site('indeed', 'engineer', 'New York', 999, None), ([], None))
        self.assertEqual(calls[0]['results_wanted'], 100)
        self.assertTrue(calls[0]['is_remote'])
        self.assertNotIn('location', calls[0])
        self.assertEqual(calls[1]['results_wanted'], 100)
        self.assertEqual(calls[1]['location'], 'New York')

    def test_scrape_sites_times_out_wedged_board(self):
        def scrape(site, keywords, location, n, hours):
            if site == 'indeed':
                time.sleep(2)
                return [], None
            return [{'jobUrl': 'https://example.com/job', 'title': 'Engineer'}], None
        with patch.object(service, 'scrape_site', side_effect=scrape):
            jobs, errors = service.scrape_sites(
                ['indeed', 'google'], 'engineer', None, 10, None, timeout=0.2
            )
        self.assertEqual(len(jobs), 1)
        self.assertTrue(any('timed out' in error for error in errors), errors)

    def test_endpoint_clamps_results_and_deduplicates_partial_results(self):
        server = ThreadingHTTPServer(('127.0.0.1', 0), service.Handler)
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()
        calls = []
        def scrape(site, keywords, location, n, hours):
            calls.append((site, n))
            if site == 'glassdoor':
                return [], 'glassdoor: blocked'
            return [{'jobUrl': 'https://example.com/job', 'title': 'Engineer', 'company': 'Acme'}], None
        try:
            with patch.object(service, 'scrape_site', side_effect=scrape):
                base = f'http://127.0.0.1:{server.server_port}/scrape'
                with urlopen(base + '?keywords=engineer&site=indeed,glassdoor,google&n=500') as response:
                    result = json.load(response)
                self.assertEqual(len(result['jobs']), 1)
                self.assertEqual(result['errors'], ['glassdoor: blocked'])
                self.assertEqual([n for _, n in calls], [100, 100, 100])
                with self.assertRaises(HTTPError) as error:
                    urlopen(base + '?keywords=engineer&site=indeed&n=bad')
                self.assertEqual(error.exception.code, 400)
        finally:
            server.shutdown()
            server.server_close()
            worker.join()


if __name__ == '__main__':
    unittest.main()
