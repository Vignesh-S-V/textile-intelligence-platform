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
MIN_DATE = '2021-01-01'
UA = 'Textile-Intelligence-Platform association-price-bot/1.0'
HEADERS = {'User-Agent': UA}

SIMA_BASE = 'https://www.simamills.in/wp-content/uploads'
TEA_NEWS = 'https://www.tea-india.org/news-board'

MONTHS = {
    'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUNE': 6,
    'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12,
}


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


def add(rows, **kw):
    d = kw.get('date')
    p = kw.get('price_inr_kg')
    if not d or d < MIN_DATE or p is None:
        return
    kw['price_inr_kg'] = float(p)
    rows.append(kw)


def month_date(text):
    m = re.search(r'For the Month of\s+([A-Za-z]+)\s+(20\d{2})', text, re.I)
    if not m:
        m = re.search(r'Month of\s+([A-Za-z]+)\s+(20\d{2})', text, re.I)
    if not m:
        return None
    month = MONTHS.get(m.group(1)[:3].upper())
    return f'{int(m.group(2)):04d}-{month:02d}-01' if month else None


def parse_sima_pdf(rows, url):
    raw = get(url)
    with pdfplumber.open(io.BytesIO(raw)) as pdf:
        full_text = '\n'.join((p.extract_text() or '') for p in pdf.pages)
        if 'Yarn Price' not in full_text and 'Yarn Prices' not in full_text:
            return 0
        date = month_date(full_text)
        if not date:
            return 0
        added = 0
        for page in pdf.pages:
            for table in page.extract_tables() or []:
                for row in table:
                    cells = [clean(x) for x in (row or [])]
                    if len(cells) < 2:
                        continue
                    line = ' | '.join(cells)
                    if not re.search(r'\bCount\b', line, re.I):
                        # Expected data rows: count + VL + GL + RL.
                        cm = re.fullmatch(r'\s*(\d{1,3})\s*', cells[0])
                        if not cm:
                            continue
                        count = cm.group(1) + 's'
                        cols = ['VL', 'GL', 'RL']
                        for i, label in enumerate(cols, start=1):
                            if i >= len(cells):
                                continue
                            price = num(cells[i])
                            if price is None:
                                continue
                            add(rows,
                                date=date, year=int(date[:4]), month=int(date[5:7]),
                                state='Not specified by source', district='Southern India',
                                centre='SIMA', region='Southern India', fiber='Cotton',
                                yarn_type='Hosiery Yarn', spinning='Not specified by source',
                                count=count, blend='—', product='Cotton Hosiery Yarn',
                                yarn_name=f'{count} Hosiery Yarn ({label})',
                                mill_name=label, price_inr_kg=price,
                                frequency='Monthly', source="Southern India Mills' Association",
                                source_short='SIMA', source_url=url,
                                source_tier='association_market', price_includes_gst=True,
                                indicative=True)
                            added += 1
        return added


def sima_candidate_urls(year, month):
    mon = [k for k, v in MONTHS.items() if v == month][0]
    # SIMA has changed e-review file naming conventions over time. Keep a small,
    # deterministic candidate set instead of crawling arbitrary URLs.
    stems = [
        f'ER{mon}1630({year})',
        f'ER{mon}1631({year})',
        f'ER{mon}1632({year})',
        f'ER{mon}16-30({year})',
        f'ER{mon}16-30({year})',
        f'ER{mon}16-{mon}16({year})',
        f'ER{mon}16-Sep16({year})',
    ]
    # June/July have historically appeared with full month names.
    full = {1:'JANUARY',2:'FEBRUARY',3:'MARCH',4:'APRIL',5:'MAY',6:'JUNE',7:'JULY',8:'AUGUST',9:'SEPTEMBER',10:'OCTOBER',11:'NOVEMBER',12:'DECEMBER'}[month]
    stems += [f'ER{full}1630({year})', f'ER{full}16-30({year})']
    seen = set()
    for stem in stems:
        # WordPress upload folders are year/month zero-padded.
        for folder in (f'{year}/{month:02d}', f'{year}/{month}', str(year)):
            url = f'{SIMA_BASE}/{folder}/{stem}.pdf'
            if url not in seen:
                seen.add(url)
                yield url


def sima(rows):
    found = set()
    # Search the complete available project horizon. Missing months remain missing;
    # no interpolation is performed.
    for year in range(2021, datetime.now().year + 1):
        for month in range(1, 13):
            for url in sima_candidate_urls(year, month):
                if url in found:
                    continue
                try:
                    n = parse_sima_pdf(rows, url)
                    if n:
                        found.add(url)
                        print('SIMA:', n, 'records from', url)
                        break
                except requests.HTTPError:
                    continue
                except Exception as e:
                    print('SIMA parse failed', url, e)
                    break


def parse_tea_article(rows, url):
    html = get(url).decode('utf-8', 'ignore')
    soup = BeautifulSoup(html, 'html.parser')
    text = clean(soup.get_text(' ', strip=True))
    if 'yarn' not in text.lower() or not re.search(r'(?:Rs\.?|₹)\s*\d', text, re.I):
        return 0
    title = clean(soup.title.get_text() if soup.title else '')
    dm = re.search(r'(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(20\d{2})', text)
    if not dm:
        dm = re.search(r'(20\d{2})-(\d{2})-(\d{2})', text)
    if not dm:
        return 0
    try:
        if len(dm.groups()) == 3 and dm.group(1).isdigit() and len(dm.group(1)) == 4:
            date = f'{dm.group(1)}-{dm.group(2)}-{dm.group(3)}'
        else:
            date = datetime.strptime(f'{dm.group(1)} {dm.group(2)} {dm.group(3)}', '%d %B %Y').strftime('%Y-%m-%d')
    except Exception:
        return 0
    if date < MIN_DATE:
        return 0

    # Only capture explicit count-specific yarn prices. This avoids converting
    # generic statements such as “yarn prices doubled” into fake price records.
    patterns = [
        r'(?:30s|30\s*s|40s|40\s*s)[^.;]{0,120}?(?:Rs\.?|₹)\s*([0-9]{2,4})\s*(?:per\s*)?kg',
        r'(?:Rs\.?|₹)\s*([0-9]{2,4})\s*(?:per\s*)?kg[^.;]{0,120}?(?:30s|30\s*s|40s|40\s*s)',
    ]
    added = 0
    for pat in patterns:
        for m in re.finditer(pat, text, re.I):
            window = text[max(0, m.start()-80):m.end()+80]
            count_m = re.search(r'\b(30|40)\s*s\b', window, re.I)
            if not count_m:
                continue
            price = num(m.group(1))
            if price is None:
                continue
            count = count_m.group(1) + 's'
            add(rows,
                date=date, year=int(date[:4]), month=int(date[5:7]),
                state='Tamil Nadu', district='Tiruppur', centre='Tiruppur',
                region='Tiruppur', fiber='Cotton', yarn_type='Combed Yarn',
                spinning='Not specified by source', count=count, blend='—',
                product='Cotton Yarn', yarn_name=f'{count} Cotton Yarn',
                price_inr_kg=price, frequency='Association market report',
                source="Tiruppur Exporters' Association", source_short='TEA',
                source_url=url, source_tier='association_market',
                indicative=True, source_note=title)
            added += 1
    return added


def tea(rows):
    seen = set()
    # TEA news-board pages expose older articles through start= pagination.
    # Limit the crawl so the scheduled job remains predictable.
    for start in range(0, 301, 20):
        url = TEA_NEWS if start == 0 else f'{TEA_NEWS}?start={start}'
        try:
            soup = BeautifulSoup(get(url).decode('utf-8', 'ignore'), 'html.parser')
            links = []
            for a in soup.find_all('a', href=True):
                href = a['href']
                if '/news-board/' in href and href not in links:
                    links.append(urljoin(url, href))
            if not links:
                break
            new_links = [u for u in links if u not in seen]
            if not new_links:
                continue
            for article in new_links:
                seen.add(article)
                try:
                    n = parse_tea_article(rows, article)
                    if n:
                        print('TEA:', n, 'records from', article)
                except Exception as e:
                    print('TEA article failed', article, e)
        except Exception as e:
            print('TEA page failed', url, e)


def main():
    data = json.loads(OUT.read_text(encoding='utf-8'))
    rows = list(data.get('records', []))
    before = len(rows)
    sima(rows)
    tea(rows)

    seen = set()
    clean_rows = []
    for r in rows:
        key = (r.get('source_short'), r.get('source_url'), r.get('date'),
               r.get('centre'), r.get('yarn_name'), r.get('count'),
               r.get('mill_name'), r.get('price_inr_kg'))
        if key not in seen:
            seen.add(key)
            clean_rows.append(r)

    clean_rows.sort(key=lambda r: (r.get('date',''), r.get('source_short',''),
                                   r.get('fiber',''), str(r.get('count',''))))
    now = datetime.now(timezone.utc)
    data['generated_at'] = now.isoformat().replace('+00:00', 'Z')
    data['records'] = clean_rows
    data['count'] = len(clean_rows)
    data['sources'] = sorted(set(data.get('sources', [])) | {'SIMA', 'TEA'})
    data['note'] = 'Official TXC/NTC/NHDC records are retained. SIMA and TEA records are association market indicators and are never treated as government-official prices. No interpolation is performed.'
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print('ASSOCIATION AUGMENTATION:', len(clean_rows) - before, 'new records; total', len(clean_rows))


if __name__ == '__main__':
    main()
