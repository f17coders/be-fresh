import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.model_selection import GridSearchCV
import pickle

df = pd.read_csv('data_sensor.csv', sep=',', header = 0)

# 데이터 불러오기
df = pd.concat([df])
df.columns = df.columns.str.replace(' ', '_')
# print(df.columns)

#######################################################
# 데이터 전처리

# 시간 데이터를 연도, 월, 일, 시간 등으로 분리하여 숫자로 변환
df['time'] = pd.to_datetime(df['time'])

# 데이터의 첫 번째 시간
start_time = df['time'].iloc[0]

# 상대적인 시간(시간의 경과)을 분 단위로 계산하여 새로운 열로 추가
df['elapsed_time'] = (df['time'] - start_time).dt.total_seconds() / 60

X = df[['elapsed_time', 'temperature', 'humidity', 'gas', 'nh3']]
y = df['ph_values']

# 훈련 데이터와 테스트 데이터 분리
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=10)

#######################################################
# 모델 선정

# 랜덤 포레스트 모델
model = RandomForestRegressor(n_estimators=100, random_state=10)

#######################################################
# 하이퍼파라미터 튜닝

# 하이퍼파라미터 그리드 설정
param_grid = {
    'n_estimators': [100, 200, 300],
    'max_depth': [10, 20, 30],
    'min_samples_split': [2, 5, 10],
    'min_samples_leaf': [1, 2, 4]
}

# 그리드 서치 설정
grid_search = GridSearchCV(estimator=model, param_grid=param_grid, cv=3, n_jobs=-1, verbose=2)

# 그리드 서치 실행
grid_search.fit(X_train, y_train)

# 최적 하이퍼파라미터 출력
print("Best Parameters:", grid_search.best_params_)

# 최적 하이퍼파라미터로 모델 재설정
best_params = grid_search.best_params_
model = RandomForestRegressor(**best_params, random_state=10)

#######################################################
# 모델 훈련
model.fit(X_train, y_train)

# 훈련된 모델로 예측
y_pred = model.predict(X_test)

#######################################################
# 모델 평가
mse = mean_squared_error(y_test, y_pred)
rmse = np.sqrt(mse)
r2 = r2_score(y_test, y_pred)

print("Mean Squared Error:", mse)
print("Root Mean Squared Error:", rmse)
print("R-squared:", r2)

#######################################################
# 속성 중요도 추출
importances = model.feature_importances_

# 속성 중요도를 내림차순으로 정렬하여 출력
indices = np.argsort(importances)[::-1]
print("Feature ranking:")
for f in range(X.shape[1]):
    print(f"{f + 1}. feature '{X.columns[indices[f]]}' ({importances[indices[f]]})")

# 속성 중요도 시각화
plt.figure(figsize=(10, 6))
plt.title("Feature Importance")
plt.bar(range(X.shape[1]), importances[indices], align="center")
plt.xticks(range(X.shape[1]), X.columns[indices], rotation=90)
plt.xlim([-1, X.shape[1]])
plt.show()

# 예측 결과 출력
result = pd.DataFrame({'Actual': y_test, 'Predicted': y_pred})
print(result)

#######################################################
# 모델 저장
# pickle 라이브러리 사용하여 모델 직렬화
with open('predict_ph', 'wb') as file:
    pickle.dump(model, file)