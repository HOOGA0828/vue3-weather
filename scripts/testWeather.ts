import { fetchWeeklyWeather } from './src/services/weatherService';

async function test() {
    const data = await fetchWeeklyWeather('東京都');
    console.log(JSON.stringify(data, null, 2));
}

test();
