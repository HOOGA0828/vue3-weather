export interface DailyWeather {
    date: string;
    pop: string;       // 降雨機率
    tempMin: string;   // 最低氣溫
    tempMax: string;   // 最高氣溫
}

// 47 都道府縣對應 JMA Area Code
export const PREFECTURE_TO_JMA_AREA: Record<string, string> = {
    "北海道": "016000", // 代表：石狩地方
    "青森県": "020000",
    "岩手県": "030000",
    "宮城県": "040000",
    "秋田県": "050000",
    "山形県": "060000",
    "福島県": "070000",
    "茨城県": "080000",
    "栃木県": "090000",
    "群馬県": "100000",
    "埼玉県": "110000",
    "千葉県": "120000",
    "東京都": "130000",
    "神奈川県": "140000",
    "新潟県": "150000",
    "富山県": "160000",
    "石川県": "170000",
    "福井県": "180000",
    "山梨県": "190000",
    "長野県": "200000",
    "岐阜県": "210000",
    "静岡県": "220000",
    "愛知県": "230000",
    "三重県": "240000",
    "滋賀県": "250000",
    "京都府": "260000",
    "大阪府": "270000",
    "兵庫県": "280000",
    "奈良県": "290000",
    "和歌山県": "300000",
    "鳥取県": "310000",
    "島根県": "320000",
    "岡山県": "330000",
    "広島県": "340000",
    "山口県": "350000",
    "徳島県": "360000",
    "香川県": "370000",
    "愛媛県": "380000",
    "高知県": "390000",
    "福岡県": "400000",
    "佐賀県": "410000",
    "長崎県": "420000",
    "熊本県": "430000",
    "大分県": "440000",
    "宮崎県": "450000",
    "鹿児島県": "460100", // 代表：鹿児島（奄美を除く）
    "沖縄県": "471000",   // 代表：沖縄本島
};

/**
 * 取得指定都道府縣的未來一週天氣 (舊版，保留給大地圖用)
 * @param prefName 都道府縣名稱 (如 "東京都")
 */
export async function fetchWeeklyWeather(prefName: string): Promise<DailyWeather[]> {
    const areaCode = PREFECTURE_TO_JMA_AREA[prefName];
    if (!areaCode) {
        throw new Error(`Unknown prefecture: ${prefName}`);
    }

    const url = `https://www.jma.go.jp/bosai/forecast/data/forecast/${areaCode}.json`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        // JMA API 回傳陣列，[0] 為近三日報，[1] 為一週預報（大部分情況）
        const weeklyData = data.length > 1 ? data[1] : data[0];

        const timeSeries = weeklyData.timeSeries;

        // timeSeries[0] 包含日期與降雨機率 (pops)
        const timeDefines = timeSeries[0].timeDefines;
        const pops = timeSeries[0].areas[0].pops;

        // timeSeries[1] 包含最低溫 (tempsMin) 與最高溫 (tempsMax)
        const tempsMin = timeSeries[1].areas[0].tempsMin || [];
        const tempsMax = timeSeries[1].areas[0].tempsMax || [];

        const result: DailyWeather[] = [];

        // timeSeries[0].timeDefines 裝日期
        // timeSeries[1].timeDefines 也裝日期，通常長度與 0 一致但有時會有偏差
        const dateArray = timeSeries[1].timeDefines;
        for (let i = 0; i < dateArray.length; i++) {
            const dateStr = new Date(dateArray[i]).toISOString().split('T')[0];

            let min = tempsMin[i];
            let max = tempsMax[i];

            // JMA有時今天最低/高溫會給空字串，如果陣列不只一天，我們就跳過第一天的無效資料
            if ((min === undefined || min === '') && (max === undefined || max === '') && i === 0 && dateArray.length > 1) {
                continue;
            }

            // 把降雨機率也對應過來，如果 timeSeries[0] 沒對齊，就先 Fallback
            const popIndex = timeDefines.findIndex((d: string) => new Date(d).toISOString().split('T')[0] === dateStr);
            const pop = popIndex !== -1 ? pops[popIndex] : '--';

            result.push({
                date: dateStr,
                pop: pop || '--',
                tempMin: min === '' || min === undefined ? '--' : min,
                tempMax: max === '' || max === undefined ? '--' : max
            });
        }

        console.log(`[JMA Weather for ${prefName} / ${areaCode}]:`, result);
        return result;

    } catch (error) {
        console.error('Failed to fetch weather data:', error);
        return [];
    }
}

/**
 * 透過經緯度取得未來一週天氣 (取代原本靠 AreaCode)
 * 適用於 Geocoding API 搜尋回來的精確市區町村
 */
export async function fetchWeatherByCoords(lat: number, lon: number): Promise<DailyWeather[]> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        const daily = data.daily;

        if (!daily) return [];

        const result: DailyWeather[] = [];
        for (let i = 0; i < daily.time.length; i++) {
            const dateStr = daily.time[i];
            const min = daily.temperature_2m_min[i];
            const max = daily.temperature_2m_max[i];
            const pop = daily.precipitation_probability_max[i];

            result.push({
                date: dateStr,
                pop: pop !== null ? String(pop) : '--',
                tempMin: min !== null ? String(Math.round(min)) : '--',
                tempMax: max !== null ? String(Math.round(max)) : '--',
            });
        }

        console.log(`[Open-Meteo Weekly for Lat:${lat}, Lon:${lon}]:`, result);
        return result;

    } catch (error) {
        console.error('Failed to fetch Open-Meteo weekly geometry data:', error);
        return [];
    }
}
