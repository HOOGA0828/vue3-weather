<template>
  <div class="relative w-full h-full flex font-sans" ref="containerRef">
    
    <!-- 地圖區塊 -->
    <div class="flex-1 h-full relative overflow-hidden bg-gradient-to-br from-blue-50 to-sky-100 flex items-center justify-center rounded-xl shadow-inner">
      <div v-if="!mapInitialized" class="absolute inset-0 flex flex-col items-center justify-center z-20 bg-white/60 backdrop-blur-md">
        <div class="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4 shadow-sm"></div>
        <p class="text-slate-800 font-bold tracking-wide">正在載入日本氣象資料...</p>
      </div>
      
      <svg ref="svgRef" class="w-full h-full cursor-grab active:cursor-grabbing transition-opacity duration-700" :style="{ opacity: mapInitialized ? 1 : 0 }"></svg>
      
      <!-- Hover Tooltip -->
      <div 
        v-show="tooltip.visible" 
        class="absolute bg-white/90 border border-slate-200/50 p-3.5 rounded-xl shadow-xl pointer-events-none z-10 min-w-[170px] transition-all duration-75 ease-out"
        :style="{ top: tooltip.y + 'px', left: tooltip.x + 'px' }"
      >
        <div class="text-lg font-extrabold text-slate-800 border-b border-slate-200/60 pb-1.5 mb-2.5 flex items-center gap-2">
          <span class="w-2 h-5 bg-blue-500 rounded-full inline-block"></span>
          {{ tooltip.prefName }}
        </div>
        <div v-if="hoverCurrent" class="text-sm font-medium text-slate-600 flex flex-col gap-1.5">
          <div class="flex justify-between items-center gap-4">
            <span class="text-slate-400">☔ 即時降雨機率</span>
            <strong class="text-blue-600">{{ hoverCurrent.pop !== null ? hoverCurrent.pop + '%' : '--' }}</strong>
          </div>
          <div class="flex justify-between items-center gap-4">
            <span class="text-slate-400">🌡️ 即時氣溫</span>
            <strong class="text-rose-500">{{ hoverCurrent.temp !== null ? hoverCurrent.temp + '°' : '--' }}</strong>
          </div>
        </div>
        <div v-else class="text-sm text-slate-400 italic">載入即時資料中...</div>
      </div>
    </div>

    <!-- 精美彈出視窗 Modal -->
    <Transition name="modal">
      <div v-if="selectedPref" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" @click.self="selectedPref = ''">
        <!-- 模糊背景罩 -->
        <div class="absolute inset-0 bg-slate-900/40 transition-opacity" @click="selectedPref = ''"></div>
        
        <!-- 卡片主體 (移除過度吃效能的 blur 與 transform，改用純色背景) -->
        <div class="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200">
          
          <!-- Modal Header (shrink-0 = 不隨內容捲動) -->
          <div class="bg-gradient-to-r from-blue-600 to-sky-500 text-white shrink-0 relative overflow-hidden">
            <!-- 裝飾泡泡 -->
            <div class="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full pointer-events-none"></div>
            <div class="absolute -left-10 -bottom-10 w-32 h-32 bg-blue-900/20 rounded-full pointer-events-none"></div>

            <!-- 標題列 -->
            <div class="relative z-10 flex justify-between items-center p-4 sm:p-6 md:p-8 pb-3 sm:pb-4">
              <div>
                <h2 class="text-2xl sm:text-3xl md:text-4xl font-black tracking-wider flex items-center gap-2 sm:gap-3">
                  <span class="text-3xl sm:text-4xl md:text-5xl leading-none drop-shadow-sm">📍</span>
                  {{ selectedPref }}
                </h2>
                <!-- 副標題：手機隱藏，桌機才顯示 -->
                <p class="hidden sm:block text-blue-50 mt-2 ml-11 md:ml-14 opacity-90 font-medium tracking-wide">日本氣象廳 ‧ 未來一週天氣預報</p>
              </div>
              <button @click="selectedPref = ''" class="relative z-10 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors border border-white/20 shrink-0 ml-2">
                <span class="text-2xl sm:text-3xl leading-none font-light block">&times;</span>
              </button>
            </div>

            <!-- 即時天氣列（固定在 header，不隨 body 捲動） -->
            <div v-if="selectedCurrentWeather" class="relative z-10 flex gap-3 px-4 sm:px-6 md:px-8 pb-4 sm:pb-5">
              <div class="flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-xl px-4 py-2 flex-1 justify-center border border-white/20">
                <span class="text-base">🌡️</span>
                <div>
                  <div class="text-[10px] text-blue-100 font-medium">即時氣溫</div>
                  <div class="text-lg font-black text-white drop-shadow">{{ selectedCurrentWeather.temp !== null ? selectedCurrentWeather.temp + '°' : '--' }}</div>
                </div>
              </div>
              <div class="flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-xl px-4 py-2 flex-1 justify-center border border-white/20">
                <span class="text-base">☔</span>
                <div>
                  <div class="text-[10px] text-blue-100 font-medium">即時降雨</div>
                  <div class="text-lg font-black text-white drop-shadow">{{ selectedCurrentWeather.pop !== null ? selectedCurrentWeather.pop + '%' : '--' }}</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Modal Body 滾動區 -->
          <div class="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div 
                v-for="(day, index) in (weatherStore.weatherData[selectedPref] || [])" 
                :key="day.date"
                class="bg-white p-3 sm:p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow hover:border-blue-300 transition-colors duration-150 group relative overflow-hidden flex flex-col justify-between h-auto sm:h-44"
              >
                <!-- 裝飾底色標籤 (今天特別凸顯) -->
                <div v-if="index === 0" class="absolute top-0 right-0 bg-rose-500 text-white text-[9px] sm:text-[10px] font-bold px-2 py-0.5 sm:px-3 sm:py-1 rounded-bl-xl shadow-sm tracking-widest uppercase">今日</div>

                <div class="font-bold text-slate-700 text-base sm:text-lg group-hover:text-blue-600 transition-colors">{{ formatDate(day.date) }}</div>
                
                <div class="mt-2 sm:mt-auto space-y-1.5 sm:space-y-3">
                  <div class="flex items-center justify-between text-xs sm:text-sm">
                    <div class="flex items-center gap-1 sm:gap-1.5 text-slate-500">
                      <span class="text-sm sm:text-lg">☔</span> <span class="font-medium sm:hidden">降雨機率</span>
                    </div>
                    <span class="font-black text-blue-600 text-base sm:text-lg">{{ day.pop }}<span class="text-xs sm:text-sm font-medium">%</span></span>
                  </div>
                  
                  <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner hidden sm:block">
                    <div class="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full" :style="`width: ${day.pop === '--' ? 0 : day.pop}%`"></div>
                  </div>

                  <div class="flex items-center justify-between text-xs sm:text-sm pt-1.5 sm:pt-2 sm:border-t border-slate-50">
                    <div class="flex items-center gap-1 sm:gap-1.5 text-slate-500">
                      <span class="text-sm sm:text-lg">🌡️</span> <span class="font-medium sm:hidden">溫度</span>
                    </div>
                    <span class="font-bold text-slate-700 sm:text-base flex gap-1 items-baseline">
                      <span class="text-sky-500 text-sm sm:text-lg">{{ day.tempMin }}°</span>
                      <span class="text-slate-300 font-normal">/</span>
                      <span class="text-rose-500 text-sm sm:text-lg">{{ day.tempMax }}°</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div v-if="!(weatherStore.weatherData[selectedPref] && weatherStore.weatherData[selectedPref].length > 0)" class="flex flex-col items-center justify-center text-slate-400 py-16 bg-white rounded-3xl border border-dashed border-slate-200">
              <span class="text-5xl mb-4 opacity-50 grayscale filter">☁️</span>
              <p class="font-medium text-lg">該地區目前無法取得天氣資訊</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed, watch } from 'vue';
import * as d3 from 'd3';
import { useWeatherStore } from '../stores/weatherStore';

const props = defineProps<{
  displayMode: 'temp' | 'pop'
}>();

const weatherStore = useWeatherStore();

const containerRef = ref<HTMLElement | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);
const mapInitialized = ref(false);
const currentZoomK = ref(1); // 追蹤目前的縮放比例，用來調整文字大小

// 側邊欄選擇的都道府縣
const selectedPref = ref(decodeURIComponent(window.location.pathname.slice(1)) || '');

// 當 selectedPref 改變時，更新網址列
watch(selectedPref, (newPref) => {
  const newPath = newPref ? `/${newPref}` : '/';
  if (decodeURIComponent(window.location.pathname) !== newPath) {
    window.history.pushState({ pref: newPref }, '', newPath);
  }
});

// 監聽上一頁/下一頁事件 (popstate) 以同步 URL 到內部狀態
onMounted(() => {
  window.addEventListener('popstate', () => {
    selectedPref.value = decodeURIComponent(window.location.pathname.slice(1)) || '';
  });
});

// Tooltip 狀態
const tooltip = reactive({
  visible: false,
  x: 0,
  y: 0,
  prefName: ''
});

const hoverCurrent = computed(() => {
  if (!tooltip.prefName) return null;
  return weatherStore.currentData[tooltip.prefName] ?? null;
});

const selectedCurrentWeather = computed(() => {
  if (!selectedPref.value) return null;
  return weatherStore.currentData[selectedPref.value] ?? null;
});

// 日期格式化小工具
const formatDate = (dateString: string) => {
  const d = new Date(dateString);
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  return `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;
};

// 色彩映射尺規
// 氣溫：正藍 (-5) -> 白/黃 (15) -> 紅 (35)
const tempColorScale = d3.scaleLinear<string>()
  .domain([-5, 15, 35])
  // #3b82f6 是 Tailwind 的 blue-500 (純粹的冷色系無綠邊)，#fef08a 是暖黃，#fda4af 是粉紅
  .range(['#3b82f6', '#fef08a', '#fda4af'])
  .clamp(true);

// 降雨機率：土色 (0) -> 淺藍 (50) -> 深藍 (100)
const popColorScale = d3.scaleLinear<string>()
  .domain([0, 50, 100])
  .range(['#d4a96a', '#bfdbfe', '#3b82f6'])
  .clamp(true);

// 提取各區域顏色（優先使用 Open-Meteo 即時資料）
const getPrefectureColor = (prefName: string) => {
  // 若為高亮選取區塊
  if (selectedPref.value === prefName) return '#2563eb'; // Tailwind blue-600

  const current = weatherStore.currentData[prefName];

  if (props.displayMode === 'temp') {
    const val = current?.temp;
    if (val !== null && val !== undefined) return tempColorScale(val);
  } else if (props.displayMode === 'pop') {
    const val = current?.pop;
    if (val !== null && val !== undefined) return popColorScale(val);
  }

  return '#f1f5f9';
};

let gContent: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
let currentPathGenerator: d3.GeoPath<any, d3.GeoPermissibleObjects> | null = null;

const updateLabelsAndColors = () => {
  if (!gContent || !weatherStore.hasFetchedAll) return;
  
  // 更新文字內容與顏色（改用 Open-Meteo 即時資料）
  gContent.selectAll('.weather-label')
    .text((d: any) => {
      const prefName = d.properties.nam_ja;
      const current = weatherStore.currentData[prefName];
      
      if (props.displayMode === 'temp') {
        return current?.temp !== null && current?.temp !== undefined ? `${current.temp}°` : '';
      } else {
        return current?.pop !== null && current?.pop !== undefined ? `${current.pop}%` : '';
      }
    })
    .attr('fill', props.displayMode === 'temp' ? '#7f1d1d' : '#1e3a8a');

  // 更新地圖各區塊背景色
  gContent.selectAll('.prefecture')
    .transition().duration(400)
    .attr('fill', (d: any) => getPrefectureColor(d.properties.nam_ja));
};

// 監聽按鈕與選擇變化，更新地圖標籤與顏色
watch([() => props.displayMode, selectedPref], updateLabelsAndColors);

const renderMap = async () => {
  if (!containerRef.value || !svgRef.value) return;

  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight || 800;

  const svg = d3.select(svgRef.value)
    .attr('width', width)
    .attr('height', height);

  const g = svg.append('g');
  gContent = g;

  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.5, 8])
    .on('zoom', (event) => {
      // 縮放地圖
      g.attr('transform', event.transform);
      currentZoomK.value = event.transform.k;
      
      // 動態反向縮小文字大小
      const baseFontSize = 13;
      const adjustedSize = baseFontSize / event.transform.k;
      
      const prefBaseFontSize = 8;
      const adjustedPrefSize = prefBaseFontSize / event.transform.k;
      
      // 避免縮放過小導致文字糊掉
      g.selectAll('.weather-label')
        .attr('font-size', `${Math.max(1.5, adjustedSize)}px`)
        .attr('stroke-width', `${3 / event.transform.k}px`);
        
      g.selectAll('.pref-label')
        .attr('font-size', `${Math.max(1.2, adjustedPrefSize)}px`)
        .attr('stroke-width', `${2.5 / event.transform.k}px`);
    });

  svg.call(zoom);

  try {
    const geojsonData = await d3.json('https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson') as any;

    const projection = d3.geoMercator()
      .center([137.0, 38.2]) 
      .scale(height * 2.5)
      .translate([width / 2, height / 2]);

    currentPathGenerator = d3.geoPath().projection(projection);

    g.selectAll('.prefecture')
      .data(geojsonData.features)
      .enter()
      .append('path')
      .attr('class', 'prefecture')
      .attr('d', currentPathGenerator as any)
      .attr('fill', (d: any) => getPrefectureColor(d.properties.nam_ja))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.2)
      .attr('cursor', 'pointer')
      .on('mousemove', function(event, d: any) {
        const prefName = d.properties.nam_ja;
        tooltip.visible = true;
        
        const containerRect = containerRef.value?.getBoundingClientRect();
        if (containerRect) {
          tooltip.x = event.clientX - containerRect.left + 15;
          tooltip.y = event.clientY - containerRect.top + 15;
        }
        
        tooltip.prefName = prefName;
      })
      .on('mouseout', function(_event, _d: any) {
        tooltip.visible = false;
      })
      .on('click', function(event, d: any) {
        const prefName = d.properties.nam_ja;
        // 打開 Modal 顯示該區塊
        selectedPref.value = prefName;
        // 取消剛剛加上的 filter 避免閃動
        d3.select(this).style('filter', 'none');
      });

    // 建立文字標籤佔位 (氣溫 / 降雨機率)
    g.selectAll('.weather-label')
      .data(geojsonData.features)
      .enter()
      .append('text')
      .attr('class', 'weather-label')
      .attr('transform', (d: any) => {
        // 東京都的 GeoJSON centroid 落在離島，直接 override 成本州座標
        if (d.properties.nam_ja === '東京都') {
          const [px, py] = projection([139.62, 35.68])!;
          return `translate(${px}, ${py + 2})`;
        }
        let centroid = currentPathGenerator!.centroid(d);
        if (Number.isNaN(centroid[0])) return `translate(0,0)`;
        return `translate(${centroid[0]}, ${centroid[1] + 1})`;
      })
      .attr('text-anchor', 'middle')
      .attr('font-size', '13px')
      .attr('font-family', 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif')
      .attr('font-weight', '900')
      .attr('pointer-events', 'none')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', '3px')
      .attr('stroke-linejoin', 'round')
      .attr('paint-order', 'stroke')
      .style('letter-spacing', '0.02em');

    // 建立都道府縣名稱標籤 (全局顯示)
    g.selectAll('.pref-label')
      .data(geojsonData.features)
      .enter()
      .append('text')
      .attr('class', 'pref-label') // 全局顯示，移除 sm:hidden
      .text((d: any) => d.properties.nam_ja)
      .attr('transform', (d: any) => {
        // 東京都的 GeoJSON centroid 落在離島，直接 override 成本州座標
        if (d.properties.nam_ja === '東京都') {
          const [px, py] = projection([139.62, 35.68])!;
          return `translate(${px}, ${py - 1})`;
        }
        let centroid = currentPathGenerator!.centroid(d);
        if (Number.isNaN(centroid[0])) return `translate(0,0)`;
        return `translate(${centroid[0]}, ${centroid[1] - 1.5})`;
      })
      .attr('text-anchor', 'middle')
      .attr('font-size', '8px')
      .attr('font-family', 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont')
      .attr('font-weight', '900')
      .attr('fill', '#0f172a')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', '2.5px')
      .attr('stroke-linejoin', 'round')
      .attr('paint-order', 'stroke')
      .attr('pointer-events', 'none');

    updateLabelsAndColors();
    mapInitialized.value = true;
  } catch (error) {
    console.error('Failed to load map data:', error);
  }
};

onMounted(async () => {
  // 平行發出兩個請求：JMA 週預報 + Open-Meteo 即時天氣
  await Promise.all([
    weatherStore.fetchAllWeather(),
    weatherStore.fetchAllCurrent(),
  ]);
  await renderMap();
});
</script>

<style scoped>
.prefecture {
  transition: opacity 0.2s ease;
  vector-effect: non-scaling-stroke; /* 縮放時保持邊框粗細不變 */
}

/* Modal Vue Transition Animations */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
