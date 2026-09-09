import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data' / 'live_yarn.json'
MIN_DATE = '2021-01-01'
UA = 'Textile-Intelligence-Platform market-report bot/1.0'
HEADERS = {'User-Agent': UA}

SOURCES = [
    {
        'name': 'Textile Today',
        'short': 'TEXTILE_TODAY',
        'feed': 'https://www.textiletoday.com.bd/feed/?s=cotton%20yarn',
    },
]

COUNT_RE = re.compile(r'\b(\d{1,3})\s*(?:s|count)\b', re.I)
PRICE_RANGE_RE = re.compile(r'(?:₹|Rs\.?|INR)\s*([0-9][0-9,]*(?:\.\d+)?)\s*(?:-|–|—|to)\s*(?:₹|Rs\.?|INR)?\s*([0-9][0-9,]*(?:\.\d+)?)\s*(?:per\s*)?kg', re.I)
PRICE_SINGLE_RE = re.compile(r'(?:₹|Rs\.?|INR)\s*([0-9][0-9,]*(?:\.\d+)?)\s*(?:per\s*)?kg', re.I)


def clean(v):
    return re.sub(r'\s+', ' ', str(v or '').replace('\xa0', ' ')).strip()


def num(v):
    try:
        x = float(str(v).replace(',', ''))
        return x if 20 < x < 10000 else None
    except Exception:
        return None


def get(url):
    r = requests.get(url, headers=HEADERS, timeout=45)
    r.raise_for_status()
    return r.content


def parse_date(text):
    text = clean(text)
    for fmt in ('%Y-%m-%dT%H:%M:%S%z', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d', '%B %d, %Y', '%b %d, %Y', '%d %B %Y'):
        try:
            return datetime.strptime(text[:25], fmt).strftime('%Y-%m-%d')
        except Exception:
            pass
    m = re.search(r'(20\d{2})[-/](\d{1,2})[-/](\d{1,2})', text)
    if m:
        return f'{int(m.group(1)):04d}-{int(m.group(2)):02d}-{int(m.group(3)):02d}'
    return None


def add(rows, **r):
    date = r.get('date')
    pmin = r.get('price_min_inr_kg')
    pmax = r.get('price_max_inr_kg')
    if not date or date < MIN_DATE or pmin is None or pmax is None or pmin > pmax:
        return
    r['price_mid_inr_kg'] = round((pmin + pmax) / 2, 2)
    r['unit'] = 'INR/kg'
    r['source_tier'] = 'MARKET_INDICATOR'
    rows.append(r)


def parse_article(url, source_short, source_name, published_hint=None):
    html = get(url).decode('utf-8', 'ignore')
    soup = BeautifulSoup(html, 'html.parser')
    text = clean(soup.get_text(' ', strip=True))
    title = clean(soup.title.get_text(' ', strip=True) if soup.title else '')
    if 'yarn' not in (title + ' ' + text).lower() or 'cotton yarn' not in text.lower():
        return []

    date = parse_date(published_hint or '')
    if not date:
        for selector in ('meta[property="article:published_time"]', 'meta[name="date"]', 'time'):
            node = soup.select_one(selector)
            if node:
                date = parse_date(node.get('content') or node.get('datetime') or node.get_text(' ', strip=True))
                if date:
                    break
    if not date:
        m = re.search(r'(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+20\d{2}', text)
        date = parse_date(m.group(0)) if m else None
    if not date:
        return []

    rows = []
    # Parse only count-specific price ranges. A generic "yarn prices rose" sentence
    # never becomes a price record. Windows are deliberately narrow to prevent
    # accidentally pairing a count with an unrelated price elsewhere in the article.
    for m in PRICE_RANGE_RE.finditer(text):
        window = text[max(0, m.start() - 180): min(len(text), m.end() + 180)]
        count_m = COUNT_RE.search(window)
        if not count_m:
            continue
        pmin, pmax = num(m.group(1)), num(m.group(2))
        if pmin is None or pmax is None:
            continue
        before = text[max(0, m.start() - 100):m.start()]
        after = text[m.end():m.end() + 100]
        descriptor = clean(before[-100:] + ' ' + after[:100])
        yarn_type = 'Combed Yarn' if re.search(r'combed', descriptor, re.I) else ('Carded Yarn' if re.search(r'carded', descriptor, re.I) else 'Cotton Yarn')
        market = 'Tiruppur' if re.search(r'tiruppur', window, re.I) else ('Mumbai' if re.search(r'mumbai', window, re.I) else 'India')
        add(rows,
            date=date, market=market, location=market,
            fiber='Cotton', yarn_type=yarn_type, spinning='Not specified by source',
            count=count_m.group(1) + 's', blend='100% Cotton',
            product='Cotton Yarn', price_min_inr_kg=pmin, price_max_inr_kg=pmax,
            gst_included=False, quote_type='market_report_indication',
            source=source_name, source_short=source_short, source_url=url,
            source_note=title)

    # Some reports publish a single explicit kg price. Keep it only when a count
    # is present in the same tight window; never manufacture a range.
    for m in PRICE_SINGLE_RE.finditer(text):
        window = text[max(0, m.start() - 180): min(len(text), m.end() + 180)]
        if re.search(r'(?:per\s*5\s*kg|per\s*4\.5\s*kg)', window, re.I):
            continue
        count_m = COUNT_RE.search(window)
        if not count_m:
            continue
        p = num(m.group(1))
        if p is None:
            continue
        descriptor = clean(window)
        yarn_type = 'Combed Yarn' if re.search(r'combed', descriptor, re.I) else ('Carded Yarn' if re.search(r'carded', descriptor, re.I) else 'Cotton Yarn')
        market = 'Tiruppur' if re.search(r'tiruppur', window, re.I) else ('Mumbai' if re.search(r'mumbai', window, re.I) else 'India')
        add(rows,
            date=date, market=market, location=market,
            fiber='Cotton', yarn_type=yarn_type, spinning='Not specified by source',
            count=count_m.group(1) + 's', blend='100% Cotton',
            product='Cotton Yarn', price_min_inr_kg=p, price_max_inr_kg=p,
            gst_included=None, quote_type='market_report_indication',
            source=source_name, source_short=source_short, source_url=url,
            source_note=title)
    return rows


def textile_today():
    rows = []
    for source in SOURCES:
        try:
            xml = get(source['feed']).decode('utf-8', 'ignore')
            soup = BeautifulSoup(xml, 'xml')
            for item in soup.find_all('item')[:30]:
                link = clean(item.link.get_text()) if item.link else ''
                title = clean(item.title.get_text(' ', strip=True) if item.title else '')
                pub = clean(item.pubDate.get_text(' ', strip=True) if item.pubDate else '')
                if not link or 'yarn' not in (title + ' ' + link).lower():
                    continue
                try:
                    rows.extend(parse_article(link, source['short'], source['name'], pub))
                except Exception as e:
                    print('Article failed:', link, e)
        except Exception as e:
            print('Feed failed:', source['feed'], e)
    return rows


def dedupe(rows):
    seen = set()
    out = []
    for r in rows:
        key = (r.get('source_short'), r.get('source_url'), r.get('date'), r.get('market'),
               r.get('fiber'), r.get('count'), r.get('yarn_type'),
               r.get('price_min_inr_kg'), r.get('price_max_inr_kg'))
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    return sorted(out, key=lambda r: (r.get('date', ''), r.get('source_short', ''), r.get('market', ''), r.get('count', '')))


def main():
    old = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {'records': []}
    rows = list(old.get('records', []))
    new_rows = textile_today()
    rows = dedupe(rows + new_rows)
    data = {
        'source': 'public-market-reports',
        'generated_at': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        'count': len(rows),
        'records': rows,
        'latest_source_record': max((r['date'] for r in rows), default=None),
        'note': 'Market indicators only. No dummy records, interpolation, previous-price copying, or duplicate source observations.'
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print('MARKET REPORT DATA:', len(new_rows), 'new parsed observations; total', len(rows))


if __name__ == '__main__':
    main()
