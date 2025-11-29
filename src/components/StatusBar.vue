<template>
  <div class="status-bar">
    <div class="time">{{ time }}</div>
    <div class="status-icons">
      <!-- 网络信号 -->
      <div class="network-info">
        <div class="signal">
          <div 
            v-for="i in 4" 
            :key="i" 
            class="signal-bar"
          ></div>
        </div>
        <span class="network-type">WIRED</span>
      </div>
      
      <!-- Wi-Fi图标 -->
      <n-icon :size="20"><Wifi/></n-icon>
      
      <!-- 电池信息 -->
      <div class="battery-info">
        <span class="battery-percent">100%</span>
        <n-icon :size="24"><BatteryFull/></n-icon>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NIcon } from 'naive-ui';
import { Wifi, BatteryFull } from '@vicons/carbon';
import { onMounted, ref } from 'vue';
const time = ref('');
const now = new Date();
function updateTime()
{
  let hours = now.getHours().toString().padStart(2, '0'); // 获取当前时间的小时
  let minutes = now.getMinutes().toString().padStart(2, '0'); // 获取当前时间的分数
  time.value = `${hours}:${minutes}`;
}
updateTime();
onMounted(()=>{
    setInterval(()=>{
      updateTime();
    },10000);
})
</script>

<style scoped>
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 44px;
  padding: 0 16px;
  color: black;
  font-size: 14px;
  font-weight: 600;
}

.time {
  font-weight: 700;
  font-size: 15px;
}

.status-icons {
  display: flex;
  align-items: center;
  gap: 12px;
}

.network-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.signal {
  display: flex;
  align-items: flex-end;
  gap: 1px;
  height: 12px;
}

.signal-bar {
  width: 3px;
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 1px;
  transition: background-color 0.2s;
}

.network-type {
  font-size: 12px;
  margin-left: 2px;
}

.wifi-icon {
  position: relative;
  width: 16px;
  height: 12px;
  opacity: 0.3;
  transition: opacity 0.2s;
}

.wifi-icon.active {
  opacity: 1;
}

.wifi-arc {
  position: absolute;
  border: 1.5px solid black;
  border-top: none;
  border-right: none;
  border-radius: 0 0 0 100%;
}

.wifi-arc.outer {
  width: 14px;
  height: 14px;
  bottom: 0;
  left: 0;
  transform: rotate(-45deg);
}

.wifi-arc.middle {
  width: 10px;
  height: 10px;
  bottom: 2px;
  left: 2px;
  transform: rotate(-45deg);
}

.wifi-arc.inner {
  width: 6px;
  height: 6px;
  bottom: 4px;
  left: 4px;
  transform: rotate(-45deg);
}

.wifi-dot {
  position: absolute;
  width: 2px;
  height: 2px;
  background-color: black;
  border-radius: 50%;
  bottom: 6px;
  left: 6px;
}

.battery-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.battery-percent {
  font-size: 12px;
}

.battery-container {
  position: relative;
  width: 22px;
  height: 12px;
  border: 1px solid black;
  border-radius: 2px;
}

.battery-level {
  position: absolute;
  top: 1px;
  left: 1px;
  height: 8px;
  background-color: black;
  border-radius: 1px;
  transition: width 0.3s;
}

.battery-tip {
  position: absolute;
  top: 3px;
  right: -2px;
  width: 1px;
  height: 4px;
  background-color: black;
  border-radius: 0 1px 1px 0;
}

.charging-icon {
  font-size: 12px;
  margin-left: 2px;
}

/* 充电状态下的特殊样式 */
.status-bar.charging .battery-level {
  background-color: #4cd964; /* iOS 充电绿色 */
}
</style>