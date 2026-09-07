import pandas as pd
from statsmodels.tsa.statespace.sarimax import SARIMAX
from sqlalchemy.orm import Session
from app.models.schema import YarnPrice

class ForecastEngine:
    def __init__(self, db: Session, min_required_observations: int = 180):
        self.db = db
        self.min_required_observations = min_required_observations

    def generate_6_month_forecast(self, yarn_id: int):
        # 1. Fetch real historical data
        history = self.db.query(YarnPrice).filter(YarnPrice.yarn_id == yarn_id).order_by(YarnPrice.effective_date).all()
        
        # 2. Strict Data Validation Rule
        if len(history) < self.min_required_observations:
            return {
                "status": "unavailable",
                "message": "Forecast unavailable: Insufficient verified historical observations.",
                "data": None
            }
            
        # 3. Model Pipeline (Only executes if real data exists)
        df = pd.DataFrame([{
            'date': h.effective_date, 
            'price': h.normalized_value
        } for h in history])
        df.set_index('date', inplace=True)
        
        try:
            # ARIMA Example - strictly using retrieved DB data
            model = SARIMAX(df['price'], order=(1, 1, 1), seasonal_order=(0, 0, 0, 0))
            results = model.fit(disp=False)
            forecast = results.get_forecast(steps=6)
            mean_forecast = forecast.predicted_mean
            conf_int = forecast.conf_int()
            
            # Determine Direction
            start_price = df['price'].iloc[-1]
            end_price = mean_forecast.iloc[-1]
            direction = "UP" if end_price > start_price else "DOWN" if end_price < start_price else "SIDEWAYS"
            
            return {
                "status": "success",
                "direction": direction,
                "confidence_interval": conf_int.values.tolist(),
                "predictions": mean_forecast.values.tolist(),
                "disclaimer": "Forecasts are model-based estimates derived from historical data and are not guaranteed market prices."
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Model failed to converge based on provided market data.",
                "data": None
            }
