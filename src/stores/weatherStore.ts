import { defineStore } from 'pinia';
import { fetchWeeklyWeather, DailyWeather, PREFECTURE_TO_JMA_AREA } from '../services/weatherService';
import { fetchAllCurrentWeather, CurrentWeather } from '../services/currentWeatherService';

export const useWeatherStore = defineStore('weather', {
    state: () => ({
        weatherData: {} as Record<string, DailyWeather[]>,
        currentData: {} as Record<string, CurrentWeather>,
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
            try {
                const data = await fetchWeeklyWeather(prefName);
                if (data && data.length > 0) {
                    this.weatherData[prefName] = data;
                }
                return data;
            } catch (error) {
                console.error(error);
                return null;
            }
        },

        // 一次取得全日本天氣 (為地圖標籤準備)
        async fetchAllWeather() {
            if (this.hasFetchedAll) return;

            this.isLoading = true;
            const prefs = Object.keys(PREFECTURE_TO_JMA_AREA);
            const promises = prefs.map(pref => this.fetchWeatherForPrefecture(pref));

            await Promise.allSettled(promises);
            this.hasFetchedAll = true;
            this.isLoading = false;
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
