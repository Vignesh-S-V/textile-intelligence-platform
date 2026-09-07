import scrapy
from datetime import datetime, timezone

class GovtYarnSpider(scrapy.Spider):
    name = "gov_yarn_prices"
    allowed_domains = ["verified-gov-textile-source.gov.in"] # Real domain goes here
    start_urls = ["https://verified-gov-textile-source.gov.in/prices"]
    
    def parse(self, response):
        rows = response.css('table.market-data tr')
        
        if not rows:
            self.logger.error("Data structure changed or data missing.")
            return
            
        for row in rows[1:]: # Skip header
            cols = row.css('td::text').getall()
            
            if len(cols) < 4:
                continue # Do not attempt to guess missing columns
                
            yarn_name = cols[0].strip()
            price_str = cols[1].strip()
            date_str = cols[3].strip()
            
            try:
                price_val = float(price_str)
                effective_date = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                
                yield {
                    "source_name": "Ministry of Textiles Gov Portal",
                    "source_url": response.url,
                    "yarn_name": yarn_name,
                    "original_value": price_val,
                    "original_unit": "kg",
                    "currency": "INR",
                    "effective_date": effective_date.isoformat(),
                    "price_type": "Market Price",
                    "confidence": 0.95
                }
            except ValueError:
                # If a price says "N/A" or parsing fails, skip it. Do not input 0.
                self.logger.warning(f"Could not parse price for {yarn_name}")
                continue
