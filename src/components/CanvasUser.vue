<template>
  <div class="canvas-user" :style="{left: (px + x) * ps - 20 + 'px', top: (py + y) * ps - 20 + 'px', outline: (selected?'2px':'1px') + ' solid '+ (focused?'#ff0':'#000'), 'border-radius': ((type==0)?50:0)+'%', width:radius+'px', height:radius+'px'}"
  @click="onClick"
  >
    <!-- <div class="username"> {{ getUserName(id) }} </div> -->
    <div class="username"> {{ getUserName(id) }},{{ userInstability.toFixed(2) }} </div>
  </div>
</template>

<script setup lang="ts">
import { emit } from '@/event';
import { defineProps, onMounted, ref } from 'vue'
import { NBadge } from 'naive-ui';
import { getUserName } from '@/text';
import { instability, progress, rGet } from '@/game';
const props = defineProps<{
  id: number,
  x: number,
  y: number,
  selected: boolean,
  focused: boolean,
  px: number,
  py: number,
  ps: number
}>();
function onClick()
{
  emit('userPressed', props.id);
}
const type=progress.userType[props.id];
const userInstability = ref(0);
const radius = ref(40);
onMounted(()=>{
  // console.log('mounted');
  setInterval(()=>{
    userInstability.value = instability(props.id,false);
    radius.value = 40 + 10 * rGet(props.id, props.id);
  },10)
})
</script>

<style scoped>
.canvas-user
{
  position: absolute;
  outline: 1px solid #000;
  background: #fff;
  color: #000;
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