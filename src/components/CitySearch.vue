<template>
  <div class="relative w-full max-w-sm md:max-w-md mx-auto z-40">
    <div class="relative flex items-center bg-white/90 backdrop-blur-md border border-slate-200 shadow-md rounded-2xl p-1 transition-shadow duration-200" :class="{ 'ring-2 ring-blue-400': isFocused }">
      <span class="pl-3 pr-2 text-slate-400 text-lg">🔍</span>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="輸入地區 (ex. 札幌市、天王寺)"
        class="w-full bg-transparent border-none outline-none py-2 text-slate-700 font-medium placeholder:text-slate-400 placeholder:text-sm sm:placeholder:text-base"
        @input="onInput"
        @keydown.enter="onEnter"
        @compositionstart="onCompositionStart"
        @compositionend="onCompositionEnd"
        @focus="isFocused = true"
        @blur="onBlur"
      />
      <!-- 載入中動畫 -->
      <span v-if="isLoading" class="absolute right-3 w-5 h-5 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin"></span>
      <!-- 清除按鈕 -->
      <button v-else-if="searchQuery" @click="clearSearch" class="absolute right-3 text-slate-400 hover:text-slate-600 font-bold p-1">
        &times;
      </button>
    </div>

    <!-- 下拉選單 -->
    <Transition name="fade-slide">
      <ul
        v-if="showDropdown && results.length > 0"
        class="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-64 overflow-y-auto"
      >
        <li
          v-for="item in results"
          :key="item.id"
          class="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-none transition-colors group flex items-center justify-between"
          @mousedown="selectLocation(item)"
        >
          <div>
            <div class="font-bold text-slate-700 group-hover:text-blue-700">{{ item.name }}</div>
            <div class="text-xs text-slate-400 mt-0.5 font-medium">
              {{ formatAdminLevel(item) }}
            </div>
          </div>
          <span class="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded-full group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
            選擇
          </span>
        </li>
      </ul>
    </Transition>
    
    <!-- 查無結果 -->
    <Transition name="fade-slide">
      <div v-if="showDropdown && searchQuery && !isLoading && results.length === 0" class="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl px-4 py-6 text-center text-slate-500">
        找不到包含「{{ searchQuery }}」的地點
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { searchLocation, GeoLocation } from '../services/geocodingService';

const emit = defineEmits<{
  (e: 'select', location: GeoLocation): void
  (e: 'active', isActive: boolean): void
}>();

const searchQuery = ref('');
const results = ref<GeoLocation[]>([]);
const isLoading = ref(false);
const isFocused = ref(false);
const showDropdown = ref(false);
const isComposing = ref(false); // 追蹤是否正在進行中文/日文拼音輸入

const isActive = computed(() => isFocused.value || showDropdown.value);
watch(isActive, (val) => {
  emit('active', val);
});

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const formatAdminLevel = (item: GeoLocation) => {
  const parts = [];
  if (item.admin1) parts.push(item.admin1);
  if (item.admin2 && item.admin2 !== item.admin1) parts.push(item.admin2);
  if (item.admin3 && item.admin3 !== item.admin2) parts.push(item.admin3);
  return parts.join(' ');
};

const onCompositionStart = () => {
  isComposing.value = true;
};

const onCompositionEnd = (e: Event) => {
  isComposing.value = false;
  // 拼音輸入完成後手動觸發一次搜尋
  onInput();
};

const onEnter = () => {
  if (isComposing.value) return;
  // 強制觸發搜尋
  forceSearch();
};

const onInput = () => {
  // 如果我們還在打注音/平假名尚未按下 Enter 結算字元，就不去打 API，不過濾本地可繼續。
  // 注意要求：「已經把一個字打出來的時候就要進行關聯」，所以只要字串有變且不是正在拼字(Composing)就搜尋
  if (isComposing.value) return;
  forceSearch();
};

const forceSearch = () => {
  showDropdown.value = true;
  isLoading.value = true;
  
  if (debounceTimer) clearTimeout(debounceTimer);
  
  if (!searchQuery.value.trim()) {
    results.value = [];
    isLoading.value = false;
    return;
  }

  debounceTimer = setTimeout(async () => {
    try {
      const data = await searchLocation(searchQuery.value);
      results.value = data;
    } catch (e) {
      console.error(e);
      results.value = [];
    } finally {
      isLoading.value = false;
    }
  }, 400); // 防抖 400ms
};

const clearSearch = () => {
  searchQuery.value = '';
  results.value = [];
  showDropdown.value = false;
};

// 使用 mousedown 而非 click，避免 input blur 事件搶先關閉了選單
const selectLocation = (item: GeoLocation) => {
  searchQuery.value = item.name;
  showDropdown.value = false;
  emit('select', item);
};

const onBlur = () => {
  isFocused.value = false;
  // 延遲關閉選單，允許點擊發生
  setTimeout(() => {
    showDropdown.value = false;
  }, 200);
};
</script>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
