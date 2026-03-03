<template>
  <div class="h-screen w-screen flex flex-col bg-slate-50 overflow-hidden font-sans text-slate-800">
    <!-- Header 與 控制列 -->
    <header class="bg-slate-800 text-white p-3 sm:p-4 shadow-md flex flex-wrap sm:flex-nowrap justify-between items-center z-10 shrink-0 gap-2">
      <h1 class="text-lg sm:text-xl font-bold tracking-wide truncate w-full sm:w-auto">日本 47 都道府縣天氣預報</h1>
      
      <!-- 切換按鈕 -->
      <div class="flex bg-slate-700 rounded-lg p-1 w-full sm:w-auto mt-1 sm:mt-0 max-w-full">
        <button 
          @click="displayMode = 'temp'"
          :class="['flex-1 sm:flex-none px-2 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap', displayMode === 'temp' ? 'bg-blue-500 text-white shadow' : 'text-slate-300 hover:text-white hover:bg-slate-600']"
        >
          🌡️ 氣溫
        </button>
        <button 
          @click="displayMode = 'pop'"
          :class="['flex-1 sm:flex-none px-2 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-colors ml-1 whitespace-nowrap', displayMode === 'pop' ? 'bg-blue-500 text-white shadow' : 'text-slate-300 hover:text-white hover:bg-slate-600']"
        >
          ☔ 降雨
        </button>
      </div>
    </header>

    <!-- 主內容區塊 (填滿剩餘高度) -->
    <main class="flex-1 relative w-full h-full overflow-hidden p-4 flex">
      <div class="w-full h-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <JapanWeatherMap :displayMode="displayMode" />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import JapanWeatherMap from './components/JapanWeatherMap.vue'

// 'temp' 顯示氣溫, 'pop' 顯示降雨機率
const displayMode = ref<'temp' | 'pop'>('temp')
</script>
