<template>
  <div class="canvas-user" @click="onClick">
    <div class="username"> {{ getUserName(user.id) }} </div>
    <div v-if="bubbleTextLife>0" class="bubble">
      {{ bubbleText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { desubscribe, emit, subscribe } from '@/event';
import { defineProps, onBeforeUnmount, onMounted, ref } from 'vue'
import { getUserName } from '@/text';
import { instability, progress } from '@/game';
import { User } from './GameCanvas.vue';
const props = defineProps<{
  user: User,
  selected: boolean,
  focused: boolean
}>();
function onClick()
{
  emit('userPressed', props.user.id);
}
const bubbleText = ref('');
const bubbleTextLife = ref(0);
let bubbleEvent = 0;
onMounted(()=>{
  setInterval(()=>{
    if (bubbleTextLife.value>0)
    {
      bubbleTextLife.value-=10/1000;
    }
  },10)
  bubbleEvent = subscribe('userBubbleText',(id,bubbleTextContent)=>
  {
    if(id!=props.user.id||bubbleTextLife.value>0)return;
    bubbleTextLife.value=3+Math.random()*3;
    bubbleText.value=bubbleTextContent;
  });
})
onBeforeUnmount(()=>{
  desubscribe('userBubbleText',bubbleEvent);
})
</script>

<style scoped>
.canvas-user
{
  transition-duration: 100ms;
  transition-property: width,height,outline;
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
.bubble
{
  position: absolute;
  top: -50px;
  text-wrap-mode: nowrap;
  text-align: center;
  width: min-content;
  background: #000;
  border-radius: 3px;
  color: white;
  padding: 10px;
  z-index: 998;
}
</style>