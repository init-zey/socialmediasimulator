<template>
  <div class="canvas-user" :style="{left: (px + x) * ps - 20 + 'px', top: (py + y) * ps - 20 + 'px', outline: (selected?'2px':'1px') + ' solid '+ (focused?'#ff0':'#000'), 'border-radius': ((type==0)?50:0)+'%'}"
  @click="onClick"
  >
    <n-badge :value="badgeDefault" :offset="[10,-5]">
    <n-badge :value="badgeInfo" :type="'info'" :offset="[10,30]">
    <div class="username">{{ getUserName(id) }}</div>
    </n-badge>
    </n-badge>
  </div>
</template>

<script setup lang="ts">
import { emit } from '@/event';
import { defineProps } from 'vue'
import { NBadge } from 'naive-ui';
import { getUserName } from '@/text';
import { progress } from '@/game';
const props = defineProps<{
  id: number,
  x: number,
  y: number,
  selected: boolean,
  focused: boolean,
  px: number,
  py: number,
  ps: number,
  badgeDefault: number,
  badgeInfo: number
}>();
function onClick()
{
  emit('userPressed', props.id);
}
const type=progress.userType[props.id];
</script>

<style scoped>
.canvas-user
{
  position: absolute;
  outline: 1px solid #000;
  background: #fff;
  color: #000;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  -webkit-user-drag: none;
  cursor: pointer;
}
.username
{
  margin: auto;
  font-weight: bold;
  text-wrap-mode: nowrap;
}
</style>