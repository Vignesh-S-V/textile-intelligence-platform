# Scheduled official-data scraper. Vercel serves the generated data/yarn.json; it does not scrape PDFs during a user request.
import io, json, re
from datetime import datetime, timezone
from pathlib import Path
import requests
from bs4 import BeautifulSoup
import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data' / 'yarn.json'
MIN_DATE = '2021-01-01'
UA = 'Textile-Intelligence-Platform official-data-bot/1.0'
HEADERS = {'User-Agent': UA}
TXC_HIST = 'https://www.txcindia.gov.in/html/ecomicsection/Cotton%20Yarn%20Prices.pdf'
NTC_ARCHIVES = [
    ('Western Region', 'https://www.ntcltd.org/WRO_oldRecords.aspx'),
    ('Southern Region', 'https://www.ntcltd.org/SRO_oldRecords.aspx'),
]
CENTRES = {
    'coimbatore': ('Coimbatore', 'Tamil Nadu', 'Coimbatore'),
    'amritsar': ('Amritsar', 'Punjab', 'Amritsar'),
    'ahmedabad': ('Ahmedabad', 'Gujarat', 'Ahmedabad'),
}

def clean(v): return re.sub(r'\s+', ' ', str(v or '').replace('\xa0', ' ')).strip()
def num(v):
    s = clean(v).replace(',', '')
    if not s or s in {'-', '—'}: return None
    try: return float(s)
    except: return None

def iso_date(s):
    m = re.search(r'(\d{1,2})[./-](\d{1,2})[./-](\d{4})', str(s))
    if not m: return None
    try: return datetime(int(m[3]), int(m[2]), int(m[1])).strftime('%Y-%m-%d')
    except: return None

def month_date(s):
    m = re.search(r'\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[ -](\d{2})\b', str(s), re.I)
    if not m: return None
    months = {'jan':1,'feb':2,'mar':3,'apr':4,'may':5,'jun':6,'jul':7,'aug':8,'sep':9,'oct':10,'nov':11,'dec':12}
    return f"{2000+int(m[2]):04d}-{months[m[1][:3].lower()]:02d}-01"

def get(url, timeout=60):
    r = requests.get(url, headers=HEADERS, timeout=timeout); r.raise_for_status(); return r.content

def add(rows, **kw):
    if not kw.get('date') or kw['date'] < MIN_DATE or not kw.get('price_inr_kg'): return
    kw['price_inr_kg'] = float(kw['price_inr_kg']); rows.append(kw)

def txc_historical(rows):
    with pdfplumber.open(io.BytesIO(get(TXC_HIST))) as pdf:
        section = ''; centre = ''
        for page in pdf.pages:
            low = (page.extract_text() or '').lower()
            if 'annexure-i' in low: section = 'Cone Combed'
            if 'annexure-ii' in low: section = 'Hosiery Combed'
            for key, meta in CENTRES.items():
                if key in low and 'centre' in low and 'wise' in low: centre = meta[0]
            for table in page.extract_tables() or []:
                for row in table:
                    cells = [clean(x) for x in (row or [])]
                    d = month_date(cells[0] if cells else '')
                    if not d or not centre: continue
                    meta = CENTRES[centre.lower()]
                    counts = ['20s','30s','40s'] if section == 'Hosiery Combed' or centre == 'Amritsar' else ['20s','30s','40s','60s','80s']
                    for i, count in enumerate(counts):
                        pos = 1 + i*3
                        if pos < len(cells):
                            p = num(cells[pos])
                            if p is not None:
                                add(rows, date=d, year=int(d[:4]), month=int(d[5:7]), state=meta[1], district=meta[2], centre=meta[0], fiber='Cotton', count=count, blend=section, product='Cotton Yarn', price_inr_kg=p, frequency='Monthly', source='Office of the Textile Commissioner', source_short='TXC', source_url=TXC_HIST)

def classify(text, section=''):
    t = clean(text).upper()
    s = clean(section).upper()
    # NTC publishes section headings separately from Variety Name. Keep the
    # section context so short names such as "24s PSF" are not lost.
    if 'POLYESTER STAPLE FIBRE' in s or re.search(r'\bPSF\b', t):
        return 'Polyester', 'Polyester Yarn'
    if 'POLYESTER-VISCOSE' in s or re.search(r'\bPV\b', t) or ('POLYESTER' in t and 'VISCOSE' in t):
        return 'Polyester/Viscose', 'Polyester/Viscose Blended Yarn'
    if 'POLYESTER-COTTON' in s or ('POLYESTER' in t and 'COTTON' in t) or re.search(r'\b(?:PC|CPC)\b', t):
        return 'Polyester/Cotton', 'Polyester/Cotton Blended Yarn'
    if 'POLY-MODAL' in s or ('POLY' in t and 'MODAL' in t):
        return 'Modal', 'Modal Blended Yarn'
    if 'HANK YARN' in s:
        return 'Cotton', 'Cotton Yarn'
    for word, name in [
        ('RAYON','Rayon'),('VISCOSE','Viscose'),('POLYESTER','Polyester'),
        ('NYLON','Nylon'),('ACRYLIC','Acrylic'),('WOOL','Wool'),
        ('LINEN','Linen'),('HEMP','Hemp'),('SILK','Silk'),
        ('MODAL','Modal'),('LYOCELL','Lyocell'),('TENCEL','Lyocell'),
        ('ACETATE','Acetate'),('SPANDEX','Spandex'),('ELASTANE','Spandex'),
        ('COTTON','Cotton')
    ]:
        if word in t: return name, name + ' Yarn'
    return None, None

def parse_ntc_pdf(rows, region, date, url):
    with pdfplumber.open(io.BytesIO(get(url))) as pdf:
        section = ''
        section_names = ('HANK YARN', 'POLYESTER STAPLE FIBRE', 'POLYESTER-COTTON', 'POLYESTER-VISCOSE', 'POLY-MODAL')
        for page in pdf.pages:
            for table in page.extract_tables() or []:
                for r in table:
                    cells = [clean(x) for x in (r or [])]
                    if not cells: continue
                    line = ' | '.join(cells)
                    upper_line = line.upper()
                    for name in section_names:
                        if name in upper_line and not any(re.search(r'\d', c) for c in cells[:2]):
                            section = name
                            break
                    if section and upper_line.strip() in section_names:
                        continue
                    if 'Variety Name' in line or 'RateType' in line: continue
                    price = None
                    for c in cells:
                        for m in re.finditer(r'(?<!\d)(\d{2,5}(?:\.\d{1,2})?)(?!\d)', c):
                            v = num(m.group(1))
                            if v and 20 < v < 10000: price = v
                    if price is None: continue
                    variety = cells[1] if len(cells) > 1 else cells[0]
                    fiber, product = classify(variety, section)
                    if not fiber: fiber, product = classify(line, section)
                    if not fiber: continue
                    cm = re.search(r'(\d{1,3})\s*S\b', variety, re.I)
                    count = cm.group(1)+'s' if cm else '—'
                    ratio = re.search(r'\b(\d{2}:\d{2})\b', variety)
                    if ratio:
                        blend = ratio.group(1)
                    elif fiber in {'Polyester/Cotton','Polyester/Viscose','Modal'} or re.search(r'\b(?:PC|PV|CPC|BLEND)\b', variety, re.I):
                        blend = 'Blended'
                    else:
                        blend = '—'
                    mill = cells[2] if len(cells) > 2 else 'NTC'
                    add(rows, date=date, year=int(date[:4]), month=int(date[5:7]), state='Not specified by source', district=region, centre=region, fiber=fiber, count=count, blend=blend, product=product, yarn_name=variety, mill_name=mill, price_inr_kg=price, frequency='Official NTC price list', source='National Textile Corporation', source_short='NTC', source_url=url, region=region)

def ntc(rows):
    from urllib.parse import urljoin
    for region, archive in NTC_ARCHIVES:
        try:
            soup = BeautifulSoup(get(archive).decode('utf-8', 'ignore'), 'html.parser'); candidates=[]
            for tr in soup.find_all('tr'):
                txt=clean(tr.get_text(' ', strip=True))
                if not re.search(r'YARN.*PRICE.*LIST', txt, re.I): continue
                d=iso_date(txt)
                if not d or d<'2025-04-01': continue
                for a in tr.find_all('a'):
                    vals=[a.get('href'),a.get('data-href'),a.get('onclick')]
                    for v in vals:
                        if v and '.pdf' in v.lower(): candidates.append((d,urljoin(archive,v))); break
            picked={}
            for d,u in sorted(candidates, reverse=True): picked.setdefault(d[:7],(d,u))
            for d,u in picked.values():
                try: parse_ntc_pdf(rows,region,d,u)
                except Exception as e: print('NTC PDF failed',region,d,e)
        except Exception as e: print('NTC archive failed',region,e)

def main():
    rows=[]
    try: txc_historical(rows)
    except Exception as e: print('TXC historical failed',e)
    try: ntc(rows)
    except Exception as e: print('NTC failed',e)
    seen=set(); clean_rows=[]
    for r in rows:
        k=json.dumps(r,sort_keys=True)
        if k not in seen: seen.add(k); clean_rows.append(r)
    clean_rows.sort(key=lambda r:(r['date'],r.get('source_short',''),r.get('fiber',''),str(r.get('count',''))))
    OUT.parent.mkdir(parents=True,exist_ok=True)
    latest = clean_rows[-1]['date'] if clean_rows else None
    now = datetime.now(timezone.utc)
    current_month = now.strftime('%Y-%m')
    current_available = bool(latest and latest.startswith(current_month))
    payload={
        'source':'official-textile-sources',
        'generated_at':now.isoformat().replace('+00:00','Z'),
        'records':clean_rows,
        'count':len(clean_rows),
        'coverage':{
            'minimum_date':MIN_DATE,
            'txc_historical':'January 2021 to March 2025',
            'ntc_from':'April 2025',
            'latest_source_record':latest,
            'current_month':current_month,
            'current_month_available':current_available,
            'current_month_note':('Official source publication found for the current month.' if current_available else 'No official TXC/NTC yarn price publication dated in the current month was available at scrape time.'),
            'note':'Generated outside the Vercel request path from official TXC and NTC publications.'
        }
    }
    OUT.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    print('GENERATED',len(clean_rows),'records; latest',latest,'current_month',current_month,'available',current_available)
    if len(clean_rows)==0: raise SystemExit('SCRAPER PRODUCED ZERO RECORDS')

if __name__=='__main__': main()
