export interface CurrentWeather {
    temp: number | null;
    pop: number | null;
}

// 47 都道府縣代表城市的經緯度（縣廳所在地）
export const PREFECTURE_COORDS: Record<string, { lat: number; lon: number }> = {
    '北海道': { lat: 43.064, lon: 141.347 },
    '青森県': { lat: 40.824, lon: 140.740 },
    '岩手県': { lat: 39.704, lon: 141.153 },
    '宮城県': { lat: 38.269, lon: 140.872 },
    '秋田県': { lat: 39.718, lon: 140.102 },
    '山形県': { lat: 38.241, lon: 140.364 },
    '福島県': { lat: 37.750, lon: 140.468 },
    '茨城県': { lat: 36.342, lon: 140.447 },
    '栃木県': { lat: 36.566, lon: 139.884 },
    '群馬県': { lat: 36.391, lon: 139.060 },
    '埼玉県': { lat: 35.857, lon: 139.649 },
    '千葉県': { lat: 35.605, lon: 140.123 },
    '東京都': { lat: 35.690, lon: 139.692 },
    '神奈川県': { lat: 35.448, lon: 139.643 },
    '新潟県': { lat: 37.902, lon: 139.023 },
    '富山県': { lat: 36.695, lon: 137.213 },
    '石川県': { lat: 36.594, lon: 136.626 },
    '福井県': { lat: 36.065, lon: 136.222 },
    '山梨県': { lat: 35.664, lon: 138.568 },
    '長野県': { lat: 36.651, lon: 138.181 },
    '岐阜県': { lat: 35.391, lon: 136.722 },
    '静岡県': { lat: 34.977, lon: 138.383 },
    '愛知県': { lat: 35.180, lon: 136.907 },
    '三重県': { lat: 34.730, lon: 136.509 },
    '滋賀県': { lat: 35.004, lon: 135.869 },
    '京都府': { lat: 35.021, lon: 135.756 },
    '大阪府': { lat: 34.686, lon: 135.520 },
    '兵庫県': { lat: 34.691, lon: 135.183 },
    '奈良県': { lat: 34.685, lon: 135.833 },
    '和歌山県': { lat: 34.226, lon: 135.168 },
    '鳥取県': { lat: 35.504, lon: 134.238 },
    '島根県': { lat: 35.472, lon: 133.051 },
    '岡山県': { lat: 34.662, lon: 133.935 },
    '広島県': { lat: 34.396, lon: 132.460 },
    '山口県': { lat: 34.186, lon: 131.471 },
    '徳島県': { lat: 34.066, lon: 134.559 },
    '香川県': { lat: 34.340, lon: 134.043 },
    '愛媛県': { lat: 33.842, lon: 132.766 },
    '高知県': { lat: 33.560, lon: 133.531 },
    '福岡県': { lat: 33.607, lon: 130.418 },
    '佐賀県': { lat: 33.249, lon: 130.299 },
    '長崎県': { lat: 32.745, lon: 129.874 },
    '熊本県': { lat: 32.790, lon: 130.742 },
    '大分県': { lat: 33.238, lon: 131.613 },
    '宮崎県': { lat: 31.911, lon: 131.424 },
    '鹿児島県': { lat: 31.560, lon: 130.558 },
    '沖縄県': { lat: 26.212, lon: 127.681 },
};

/**
 * 取得單一都道府縣的即時天氣 (Open-Meteo)
 */
async function fetchCurrentForPref(
    prefName: string,
    coords: { lat: number; lon: number }
): Promise<CurrentWeather> {
    const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${coords.lat}&longitude=${coords.lon}` +
        `&current=temperature_2m,precipitation_probability` +
        `&timezone=Asia%2FTokyo`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        const current = data.current;
        return {
            temp: current?.temperature_2m ?? null,
            pop: current?.precipitation_probability ?? null,
        };
    } catch (e) {
        console.error(`[Open-Meteo] Failed for ${prefName}:`, e);
        return { temp: null, pop: null };
    }
}

/**
 * 平行取得 47 都道府縣的即時天氣
 */
export async function fetchAllCurrentWeather(): Promise<Record<string, CurrentWeather>> {
    const entries = Object.entries(PREFECTURE_COORDS);
    const results = await Promise.allSettled(
        entries.map(([prefName, coords]) => fetchCurrentForPref(prefName, coords))
    );

    const record: Record<string, CurrentWeather> = {};
    results.forEach((result, i) => {
        const prefName = entries[i][0];
        record[prefName] =
            result.status === 'fulfilled'
                ? result.value
                : { temp: null, pop: null };
    });

    return record;
}
