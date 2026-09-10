import json
import re
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data' / 'live_yarn.json'
MIN_DATE = '2021-01-01'
UA = 'Textile-Intelligence-Platform market-report bot/1.1'
HEADERS = {'User-Agent': UA}

SOURCES = [{'name': 'Textile Today', 'short': 'TEXTILE_TODAY', 'feed': 'https://www.textiletoday.com.bd/feed/?s=cotton%20yarn'}]
COUNT_RE = re.compile(r'\b(\d{1,3})\s*(?:s|count)\b', re.I)
PRICE_RANGE_RE = re.compile(r'(?:₹|Rs\.?|INR)\s*([0-9][0-9,]*(?:\.\d+)?)\s*(?:-|–|—|to)\s*(?:₹|Rs\.?|INR)?\s*([0-9][0-9,]*(?:\.\d+)?)\s*(?:per\s*)?kg', re.I)
PRICE_SINGLE_RE = re.compile(r'(?:₹|Rs\.?|INR)\s*([0-9][0-9,]*(?:\.\d+)?)\s*(?:per\s*)?kg', re.I)

def clean(v): return re.sub(r'\s+', ' ', str(v or '').replace('\xa0', ' ')).strip()

def num(v):
    try:
        x=float(str(v).replace(',','')); return x if 20 < x < 10000 else None
    except Exception: return None

def get(url):
    r=requests.get(url,headers=HEADERS,timeout=45); r.raise_for_status(); return r.content

def parse_date(text):
    text=clean(text)
    if not text:return None
    try:
        dt=parsedate_to_datetime(text)
        if dt:return dt.date().isoformat()
    except Exception:pass
    for fmt in ('%Y-%m-%dT%H:%M:%S%z','%Y-%m-%dT%H:%M:%S','%Y-%m-%d','%B %d, %Y','%b %d, %Y','%d %B %Y','%d %b %Y'):
        try:return datetime.strptime(text[:35],fmt).strftime('%Y-%m-%d')
        except Exception:pass
    m=re.search(r'(20\d{2})[-/](\d{1,2})[-/](\d{1,2})',text)
    return f'{int(m.group(1)):04d}-{int(m.group(2)):02d}-{int(m.group(3)):02d}' if m else None

def add(rows,**r):
    date,pmin,pmax=r.get('date'),r.get('price_min_inr_kg'),r.get('price_max_inr_kg')
    if not date or date<MIN_DATE or pmin is None or pmax is None or pmin>pmax:return
    r['price_mid_inr_kg']=round((pmin+pmax)/2,2);r['unit']='INR/kg';r['source_tier']='MARKET_INDICATOR';rows.append(r)

def parse_article(url,source_short,source_name,published_hint=None):
    html=get(url).decode('utf-8','ignore'); soup=BeautifulSoup(html,'html.parser'); text=clean(soup.get_text(' ',strip=True)); title=clean(soup.title.get_text(' ',strip=True) if soup.title else '')
    if 'yarn' not in (title+' '+text).lower() or 'cotton yarn' not in text.lower(): return []
    date=parse_date(published_hint or '')
    if not date:
        for selector in ('meta[property="article:published_time"]','meta[name="date"]','meta[itemprop="datePublished"]','time'):
            node=soup.select_one(selector)
            if node:
                date=parse_date(node.get('content') or node.get('datetime') or node.get_text(' ',strip=True))
                if date: break
    if not date:return []
    rows=[]; range_spans=[]
    for m in PRICE_RANGE_RE.finditer(text):
        range_spans.append((m.start(),m.end())); window=text[max(0,m.start()-220):min(len(text),m.end()+220)]; count_m=COUNT_RE.search(window)
        if not count_m or re.search(r'per\s*(?:4\.5|5)\s*kg',window,re.I):continue
        pmin,pmax=num(m.group(1)),num(m.group(2))
        if pmin is None or pmax is None:continue
        descriptor=clean(window); yarn_type='Combed Yarn' if re.search(r'combed',descriptor,re.I) else ('Carded Yarn' if re.search(r'carded',descriptor,re.I) else 'Cotton Yarn'); market='Tiruppur' if re.search(r'tiruppur',window,re.I) else ('Mumbai' if re.search(r'mumbai',window,re.I) else 'India')
        add(rows,date=date,market=market,location=market,fiber='Cotton',yarn_type=yarn_type,spinning='Not specified by source',count=count_m.group(1)+'s',blend='100% Cotton',product='Cotton Yarn',price_min_inr_kg=pmin,price_max_inr_kg=pmax,gst_included=False if 'gst extra' in descriptor.lower() else None,quote_type='market_report_indication',source=source_name,source_short=source_short,source_url=url,source_note=title)
    for m in PRICE_SINGLE_RE.finditer(text):
        if any(start<=m.start()<end for start,end in range_spans):continue
        window=text[max(0,m.start()-220):min(len(text),m.end()+220)]
        if re.search(r'per\s*(?:4\.5|5)\s*kg',window,re.I):continue
        count_m=COUNT_RE.search(window); p=num(m.group(1))
        if not count_m or p is None:continue
        descriptor=clean(window); yarn_type='Combed Yarn' if re.search(r'combed',descriptor,re.I) else ('Carded Yarn' if re.search(r'carded',descriptor,re.I) else 'Cotton Yarn'); market='Tiruppur' if re.search(r'tiruppur',window,re.I) else ('Mumbai' if re.search(r'mumbai',window,re.I) else 'India')
        add(rows,date=date,market=market,location=market,fiber='Cotton',yarn_type=yarn_type,spinning='Not specified by source',count=count_m.group(1)+'s',blend='100% Cotton',product='Cotton Yarn',price_min_inr_kg=p,price_max_inr_kg=p,gst_included=False if 'gst extra' in descriptor.lower() else None,quote_type='market_report_indication',source=source_name,source_short=source_short,source_url=url,source_note=title)
    return rows

def textile_today():
    rows=[]
    for source in SOURCES:
        try:
            xml=get(source['feed']).decode('utf-8','ignore'); soup=BeautifulSoup(xml,'xml'); items=soup.find_all('item'); print('Textile Today feed items:',len(items))
            for item in items[:50]:
                link=clean(item.link.get_text()) if item.link else ''; title=clean(item.title.get_text(' ',strip=True) if item.title else ''); pub=clean(item.pubDate.get_text(' ',strip=True) if item.pubDate else '')
                if not link or 'yarn' not in (title+' '+link).lower():continue
                try:
                    parsed=parse_article(link,source['short'],source['name'],pub); rows.extend(parsed)
                    if parsed:print('Parsed:',len(parsed),title,pub)
                except Exception as e:print('Article failed:',link,e)
        except Exception as e:print('Feed failed:',source['feed'],e)
    return rows

def dedupe(rows):
    seen=set();out=[]
    for r in rows:
        key=(r.get('source_short'),r.get('source_url'),r.get('date'),r.get('market'),r.get('fiber'),r.get('count'),r.get('yarn_type'),r.get('price_min_inr_kg'),r.get('price_max_inr_kg'))
        if key in seen:continue
        seen.add(key);out.append(r)
    return sorted(out,key=lambda r:(r.get('date',''),r.get('source_short',''),r.get('market',''),r.get('count','')))

def main():
    old=json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {'records':[]}; rows=dedupe(list(old.get('records',[]))+textile_today())
    data={'source':'public-market-reports','generated_at':datetime.now(timezone.utc).isoformat().replace('+00:00','Z'),'count':len(rows),'records':rows,'latest_source_record':max((r['date'] for r in rows),default=None),'note':'Market indicators only. No dummy records, interpolation, previous-price copying, or duplicate source observations.'}
    OUT.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8');print('MARKET REPORT DATA: total',len(rows),'records')

if __name__=='__main__':main()
