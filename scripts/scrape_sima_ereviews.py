import io
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import pdfplumber
import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data' / 'yarn.json'
INDEX = 'https://www.simamills.in/news-summary/'
MIN_DATE = '2021-01-01'
HEADERS = {'User-Agent': 'Textile-Intelligence-Platform SIMA e-review bot/1.0'}
MONTHS = {m.upper(): i for i, m in enumerate(['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'], 1)}
MONTHS.update({'JUNE':6,'JULY':7,'AUGUST':8,'SEPTEMBER':9,'OCTOBER':10,'NOVEMBER':11,'DECEMBER':12,'JANUARY':1,'FEBRUARY':2,'MARCH':3,'APRIL':4})


def clean(v):
    return re.sub(r'\s+', ' ', str(v or '').replace('\xa0', ' ')).strip()


def num(v):
    s = clean(v).replace(',', '').replace('₹', '').replace('Rs.', '').replace('Rs', '').strip()
    if not s or s in {'-', '—'}:
        return None
    try:
        x = float(s)
        return x if 20 < x < 10000 else None
    except Exception:
        return None


def get(url, timeout=60):
    r = requests.get(url, headers=HEADERS, timeout=timeout)
    r.raise_for_status()
    return r.content


def period_date(text):
    patterns = [
        r'For the Month of\s+([A-Za-z]+)\s+(20\d{2})',
        r'Month of\s+([A-Za-z]+)\s+(20\d{2})',
        r'(?:Fortnightly\s+E-REVIEW|E-REVIEW).*?([A-Za-z]+)\s+\d{1,2}(?:-\d{1,2})?,?\s+(20\d{2})',
    ]
    for pat in patterns:
        m = re.search(pat, text, re.I | re.S)
        if m:
            month = MONTHS.get(m.group(1).upper())
            if month:
                return f'{int(m.group(2)):04d}-{month:02d}-01'
    return None


def add(rows, date, count, price, label):
    if not date or date < MIN_DATE or price is None:
        return
    rows.append({
        'date': date, 'year': int(date[:4]), 'month': int(date[5:7]),
        'state': 'Not specified by source', 'district': 'Southern India',
        'centre': 'SIMA', 'region': 'Southern India', 'fiber': 'Cotton',
        'yarn_type': 'Hosiery Yarn', 'spinning': 'Not specified by source',
        'count': count, 'blend': '—', 'product': 'Cotton Hosiery Yarn',
        'yarn_name': f'{count} Hosiery Yarn ({label})', 'mill_name': label,
        'price_inr_kg': float(price), 'frequency': 'Monthly',
        'source': "Southern India Mills' Association", 'source_short': 'SIMA',
        'source_url': CURRENT_URL, 'source_tier': 'association_market',
        'price_includes_gst': True, 'indicative': True,
    })


def parse_pdf(rows, url):
    global CURRENT_URL
    CURRENT_URL = url
    raw = get(url)
    with pdfplumber.open(io.BytesIO(raw)) as pdf:
        full_text = '\n'.join(p.extract_text() or '' for p in pdf.pages)
        if 'Yarn' not in full_text or not re.search(r'(?:Price|Prices)', full_text, re.I):
            return 0
        date = period_date(full_text)
        if not date:
            return 0
        added = 0
        for page in pdf.pages:
            for table in page.extract_tables() or []:
                for row in table:
                    cells = [clean(x) for x in (row or [])]
                    if len(cells) < 2:
                        continue
                    cm = re.fullmatch(r'(\d{1,3})\s*s?', cells[0], re.I)
                    if not cm:
                        continue
                    count = cm.group(1) + 's'
                    for i, label in enumerate(('VL', 'GL', 'RL'), 1):
                        if i >= len(cells):
                            continue
                        price = num(cells[i])
                        if price is not None:
                            add(rows, date, count, price, label)
                            added += 1
        return added


def discover_pdf_urls():
    html = get(INDEX).decode('utf-8', 'ignore')
    soup = BeautifulSoup(html, 'html.parser')
    urls = []
    for a in soup.find_all('a', href=True):
        href = urljoin(INDEX, a['href'])
        if href.lower().endswith('.pdf') and 'simamills.in' in href:
            urls.append(href)
    # The page currently lists the latest public e-reviews. Deduplicate while
    # keeping source order; no guessed filenames are required.
    return list(dict.fromkeys(urls))


def main():
    data = json.loads(OUT.read_text(encoding='utf-8'))
    rows = list(data.get('records', []))
    before = len(rows)
    urls = discover_pdf_urls()
    print('SIMA e-review PDFs discovered:', len(urls))
    for url in urls:
        try:
            n = parse_pdf(rows, url)
            if n:
                print('SIMA e-review:', n, 'records from', url)
        except Exception as e:
            print('SIMA e-review failed:', url, e)

    seen = set()
    clean_rows = []
    for r in rows:
        key = (r.get('source_short'), r.get('source_url'), r.get('date'), r.get('centre'),
               r.get('yarn_name'), r.get('count'), r.get('mill_name'), r.get('price_inr_kg'))
        if key not in seen:
            seen.add(key)
            clean_rows.append(r)
    clean_rows.sort(key=lambda r: (r.get('date',''), r.get('source_short',''), str(r.get('count',''))))
    data['generated_at'] = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    data['records'] = clean_rows
    data['count'] = len(clean_rows)
    data['sources'] = sorted(set(data.get('sources', [])) | {'SIMA'})
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print('SIMA E-REVIEW:', len(clean_rows) - before, 'new records; total', len(clean_rows))


if __name__ == '__main__':
    main()
