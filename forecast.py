#!/usr/bin/env python3
"""Evidence-based textile yarn-price forecasting engine."""
import json, sys, warnings
warnings.filterwarnings("ignore")
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error
try:
    from statsmodels.tsa.statespace.sarimax import SARIMAX
    HAS_SARIMAX=True
except Exception: HAS_SARIMAX=False

def clean(records):
    df=pd.DataFrame(records or [])
    if df.empty or not {'date','price_inr_kg'}.issubset(df.columns): return pd.DataFrame(columns=['date','price_inr_kg'])
    df['date']=pd.to_datetime(df['date'],errors='coerce'); df['price_inr_kg']=pd.to_numeric(df['price_inr_kg'],errors='coerce')
    df=df.dropna(subset=['date','price_inr_kg']); df=df[df.price_inr_kg>0].sort_values('date')
    return df

def monthly(df):
    if df.empty:return pd.DataFrame(columns=['date','y'])
    s=df.set_index('date').price_inr_kg.resample('MS').mean()
    # Only fill gaps between two real observations. Never invent endpoints.
    return s.interpolate(method='time',limit_area='inside').dropna().rename('y').reset_index()

def values(y):
    """Return the numeric history regardless of whether callers pass a DataFrame or Series."""
    return y['y'].astype(float) if isinstance(y, pd.DataFrame) else pd.Series(y, dtype=float)

def mape(a,p):
    a,p=np.asarray(a,float),np.asarray(p,float); ok=np.isfinite(a)&np.isfinite(p)&(a!=0)
    return float(np.mean(np.abs((a[ok]-p[ok])/a[ok]))*100) if ok.any() else 999.

def rmse(a,p): return float(np.sqrt(mean_squared_error(a,p)))

def holt(y,h):
    y=values(y).to_numpy()
    if len(y)<4:return np.repeat(y[-1],h)
    l=float(y[0]);b=float(y[1]-y[0]);a=.35;g=.18
    for v in y[1:]: old=l;l=a*v+(1-a)*(l+b);b=g*(l-old)+(1-g)*b
    return np.maximum(0,[l+(i+1)*b for i in range(h)])

def damped(y,h):
    y=values(y).to_numpy()
    if len(y)<4:return np.repeat(y[-1],h)
    l=float(y[0]);b=float(y[1]-y[0]);a=.3;g=.15;phi=.82
    for v in y[1:]: old=l;l=a*v+(1-a)*(l+phi*b);b=g*(l-old)+(1-g)*phi*b
    return np.maximum(0,[l+b*phi*(1-phi**(i+1))/(1-phi) for i in range(h)])

def drift(y,h):
    y=values(y).to_numpy()
    if len(y)<2:return np.repeat(y[-1],h)
    b=(y[-1]-y[0])/(len(y)-1);return np.maximum(0,[y[-1]+b*(i+1) for i in range(h)])

def recent(y,h):
    y=values(y).to_numpy()
    return np.repeat(np.mean(y[-min(6,len(y)):]),h)

def seasonal(y,h):
    y=values(y).to_numpy()
    return None if len(y)<24 else np.maximum(0,[y[-12+i%12] for i in range(h)])

def sarimax(y,h):
    y=values(y).to_numpy()
    if not HAS_SARIMAX or len(y)<18:return None
    so=(1,1,1,12) if len(y)>=30 else (0,0,0,0)
    try:
        fit=SARIMAX(y,order=(1,1,1),seasonal_order=so,enforce_stationarity=False,enforce_invertibility=False).fit(disp=False)
        return np.maximum(0,np.asarray(fit.forecast(h),float))
    except Exception:return None

def features(d):
    x=d.copy()
    for lag in (1,2,3,6,12):x[f'lag_{lag}']=x.y.shift(lag)
    for w in (3,6,12):x[f'roll_mean_{w}']=x.y.shift(1).rolling(w).mean();x[f'roll_std_{w}']=x.y.shift(1).rolling(w).std()
    x['sin12']=np.sin(2*np.pi*x.date.dt.month/12);x['cos12']=np.cos(2*np.pi*x.date.dt.month/12);x['trend']=np.arange(len(x));return x

COLS=['lag_1','lag_2','lag_3','lag_6','lag_12','roll_mean_3','roll_mean_6','roll_mean_12','roll_std_3','roll_std_6','roll_std_12','sin12','cos12','trend']
def ml(train,h,kind):
    x=features(train); fit=x.dropna(subset=COLS+['y'])
    if len(fit)<12:return None
    if kind=='HGB':model=HistGradientBoostingRegressor(max_iter=250,learning_rate=.05,max_leaf_nodes=12,l2_regularization=1,random_state=42)
    else:model=Pipeline([('impute',SimpleImputer(strategy='median')),('scale',StandardScaler()),('ridge',Ridge(alpha=10))])
    model.fit(fit[COLS],fit.y);work=train.copy();out=[]
    for _ in range(h):
        dt=work.date.iloc[-1]+pd.offsets.MonthBegin(1); temp=pd.concat([work,pd.DataFrame([{'date':dt,'y':np.nan}])],ignore_index=True); row=features(temp).iloc[-1:];row['trend']=len(work)
        v=max(0,float(model.predict(row[COLS])[0]));out.append(v);work=pd.concat([work,pd.DataFrame([{'date':dt,'y':v}])],ignore_index=True)
    return np.asarray(out)

def candidates():return {'SARIMAX':sarimax,'Holt Exponential Smoothing':holt,'Damped Trend':damped,'Seasonal Naive':seasonal,'Gradient Boosting + Lags':lambda y,h:ml(y,h,'HGB'),'Ridge + Lags/Rolling':lambda y,h:ml(y,h,'RIDGE'),'Drift':drift,'Recent Mean':recent}

def validate(y,fn,h):
    n=len(y)
    # Start before 12 months so exactly-12-month datasets can be backtested.
    # Candidates that need more history simply return None for those folds.
    start=max(8,min(30,int(n*.55)))
    a=[];p=[]
    for end in range(start,n,3):
        take=min(h,n-end)
        if take <= 0: continue
        try:q=fn(y.iloc[:end].copy(),take)
        except Exception:q=None
        if q is not None and len(q)==take and np.all(np.isfinite(q)):
            a.extend(y.iloc[end:end+take].y);p.extend(q)
    return None if len(a)<3 else {'mape':mape(a,p),'rmse':rmse(a,p),'n':len(a)}

def run(payload):
    h=max(1,min(12,int(payload.get('horizon',3))));y=monthly(clean(payload.get('records',[])))
    if len(y)<12:return {'ok':False,'error':f'{len(y)} monthly observations; at least 12 required for model comparison.','monthly_points':len(y)}
    model_map=candidates();board=[]
    for name,fn in model_map.items():
        score=validate(y,fn,h)
        if score:board.append({'model':name,**score})
    if not board:return {'ok':False,'error':'No model passed rolling-origin validation.'}
    board.sort(key=lambda z:(z['mape'],z['rmse']))

    # Never let one validated model failure take down the whole forecast.
    # Try models in validated rank order and use the first finite prediction.
    best=None;pred=None
    for entry in board:
        try:
            candidate=model_map[entry['model']](y,h)
            if candidate is not None and len(candidate)==h and np.all(np.isfinite(candidate)):
                best=entry;pred=np.maximum(0,np.asarray(candidate,float));break
        except Exception:
            continue
    if best is None:return {'ok':False,'error':'Validated models could not generate a forecast.'}

    dates=[];d=y.date.iloc[-1]
    for _ in range(h):d=d+pd.offsets.MonthBegin(1);dates.append(d.strftime('%Y-%m'))
    return {'ok':True,'model':best['model'],'validation':best,'leaderboard':board,'history':[{'month':r.date.strftime('%Y-%m'),'price':float(r.y)} for r in y.itertuples()],'forecast':[{'month':m,'price':float(v)} for m,v in zip(dates,pred)],'latest_historical':float(y.y.iloc[-1]),'monthly_points':len(y)}

if __name__=='__main__':
    try:print(json.dumps(run(json.load(sys.stdin))))
    except Exception as e:print(json.dumps({'ok':False,'error':str(e)}))
