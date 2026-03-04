import axios from 'axios';

export interface GeoLocation {
    id: number;
    name: string; // "天王寺区"
    latitude: number;
    longitude: number;
    country: string; // "Japan"
    admin1?: string; // 都道府縣 "Osaka"
    admin2?: string; // 城市 "Osaka"
    admin3?: string; // 區 "Tennoji Ward"
}

/**
 * 透過 Open-Meteo Geocoding API 搜尋地點 (限制為日本)
 * @param query 搜尋關鍵字 (如 "大正區", "Tennoji")
 * @returns GeoLocation 陣列
 */
export async function searchLocation(query: string): Promise<GeoLocation[]> {
    if (!query || query.trim() === '') return [];

    // 因為 Open-Meteo 對於沒有加上後綴(如：區、市) 的查詢，會優先回傳一堆同名的普通聚落 (PPL)
    // 例如搜 "新宿" 會先回傳埼玉縣的聚落，而找不到 "新宿區"。
    // 解法：我們平行發送原始 Query 與加上「区 / 市」後綴的 Query，然後合併結果重新排名。
    const q = query.trim();
    const isMissingSuffix = !q.endsWith('区') && !q.endsWith('市') && !q.endsWith('町') && !q.endsWith('村') && !q.endsWith('県') && !q.endsWith('府');

    const urls = [
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=20&language=ja&format=json`
    ];

    if (isMissingSuffix) {
        urls.push(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q + '区')}&count=5&language=ja&format=json`);
        urls.push(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q + '市')}&count=5&language=ja&format=json`);
    }

    try {
        const responses = await Promise.all(urls.map(url => axios.get(url).catch(() => ({ data: { results: [] } }))));

        let allResults: any[] = [];
        responses.forEach(res => {
            if (res.data && res.data.results) {
                allResults = allResults.concat(res.data.results);
            }
        });

        if (allResults.length === 0) return [];

        // 1. 先只保留日本的地點
        const japanResults = allResults.filter((item: any) => item.country === '日本' || item.country_code === 'JP');

        // 2. 針對日本地點進行權重排序與過濾
        // ADM1: 都道府縣, ADM2: 政令指定都市/郡, ADM3: 市/特別區/町/村
        // PPLA: 行政中心, PPLX: 也是一種區域名
        const isAdministrative = (code: string) => code?.startsWith('ADM') || code?.startsWith('PPLA') || code === 'PPLX';

        const filtered = japanResults.sort((a: any, b: any) => {
            // 行政區或行政中心絕對優先
            const aAdmin = isAdministrative(a.feature_code) ? 1 : 0;
            const bAdmin = isAdministrative(b.feature_code) ? 1 : 0;
            if (aAdmin !== bAdmin) return bAdmin - aAdmin;

            // 人口多的優先 (Open-Meteo 的大城市會有 pop)
            const aPop = a.population || 0;
            const bPop = b.population || 0;
            if (aPop !== bPop) return bPop - aPop;

            // 優先顯示字串長度比較接近原本搜尋關鍵字長度的 (例如: 新宿區 長度 3，對比 新宿 2，差 1)
            const aLenDiff = Math.abs(a.name.length - q.length);
            const bLenDiff = Math.abs(b.name.length - q.length);
            return aLenDiff - bLenDiff;
        });

        // 只取前 10 筆不重複顯示
        const uniqueResults = [];
        const seenNames = new Set();

        for (const item of filtered) {
            // 為了避免重複，我們用 admin1 + name + admin2 當作唯一鍵
            const uniqueKey = `${item.admin1}-${item.name}-${item.admin2 || ''}`;
            if (!seenNames.has(uniqueKey)) {
                seenNames.add(uniqueKey);
                uniqueResults.push({
                    id: item.id,
                    name: item.name,
                    latitude: item.latitude,
                    longitude: item.longitude,
                    country: item.country,
                    admin1: item.admin1,
                    admin2: item.admin2,
                    admin3: item.admin3,
                });
            }
            if (uniqueResults.length >= 8) break;
        }

        return uniqueResults;
    } catch (error) {
        console.error('Failed to fetch geocoding data:', error);
        return [];
    }
}
