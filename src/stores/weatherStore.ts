import { defineStore } from 'pinia';
import { fetchWeeklyWeather, DailyWeather, PREFECTURE_TO_JMA_AREA } from '../services/weatherService';
import { fetchAllCurrentWeather, CurrentWeather } from '../services/currentWeatherService';

const pendingWeeklyRequests = new Map<string, Promise<DailyWeather[] | null>>();
const BACKGROUND_CONCURRENCY = 6;

export const useWeatherStore = defineStore('weather', {
    state: () => ({
        weatherData: {} as Record<string, DailyWeather[]>,
        currentData: {} as Record<string, CurrentWeather>,
        weatherLoading: {} as Record<string, boolean>,
        isLoading: false,
        isCurrentLoading: false,
        hasFetchedAll: false,
        hasFetchedCurrent: false,
    }),
    actions: {
        // 取得單一都道府縣天氣
        async fetchWeatherForPrefecture(prefName: string) {
            if (this.weatherData[prefName]) {
                return this.weatherData[prefName];
            }

            const pending = pendingWeeklyRequests.get(prefName);
            if (pending) return pending;

            this.weatherLoading[prefName] = true;
            const request = (async () => {
                try {
                    const data = await fetchWeeklyWeather(prefName);
                    if (data && data.length > 0) {
                        this.weatherData[prefName] = data;
                    }
                    return data;
                } catch (error) {
                    console.error(error);
                    return null;
                } finally {
                    this.weatherLoading[prefName] = false;
                    pendingWeeklyRequests.delete(prefName);
                }
            })();

            pendingWeeklyRequests.set(prefName, request);
            return request;
        },

        // 一次取得全日本天氣 (為地圖標籤準備)
        async fetchAllWeather() {
            if (this.hasFetchedAll || this.isLoading) return;

            this.isLoading = true;
            const prefs = Object.keys(PREFECTURE_TO_JMA_AREA);
            let nextIndex = 0;

            // 限制背景併發數，避免一次送出 47 個請求而拖慢互動中的查詢。
            const worker = async () => {
                while (nextIndex < prefs.length) {
                    const pref = prefs[nextIndex++];
                    await this.fetchWeatherForPrefecture(pref);
                }
            };

            try {
                await Promise.all(
                    Array.from(
                        { length: Math.min(BACKGROUND_CONCURRENCY, prefs.length) },
                        () => worker()
                    )
                );
                this.hasFetchedAll = true;
            } finally {
                this.isLoading = false;
            }
        },

        // 取得全日本即時天氣 (Open-Meteo)
        async fetchAllCurrent() {
            if (this.hasFetchedCurrent) return;

            this.isCurrentLoading = true;
            try {
                this.currentData = await fetchAllCurrentWeather();
                this.hasFetchedCurrent = true;
            } catch (e) {
                console.error('[weatherStore] fetchAllCurrent failed:', e);
            } finally {
                this.isCurrentLoading = false;
            }
        },
    }
});
