<template>
  <div class="canvas-user" @click="onClick">
    <span class="username"> {{ getUserName(user.id) }} </span>
    <!-- <n-tag class="username"> {{ userInstability }} </n-tag> -->
    <div v-if="bubbleTextLife>0" class="bubble">
      {{ bubbleText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { desubscribe, emit, subscribe } from '@/event';
import { defineProps, onBeforeUnmount, onMounted, ref } from 'vue'
import { getUserName } from '@/text';
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
// const userInstability = ref(0);
onMounted(()=>{
  setInterval(()=>{
    if (bubbleTextLife.value>0)
    {
      bubbleTextLife.value-=10/1000;
    }
    // userInstability.value = instability(props.user.id);
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
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  -webkit-user-drag: none;
}
.username
{
  margin: auto;
  text-wrap-mode: nowrap;
  font-family: Verdana, Geneva, Tahoma, sans-serif;
  cursor: pointer;
  background-image: url("../assets/NameTag.png");
  background-size: cover;
  color: white;
  padding-left: 15px;
  padding-right: 15px;
}
.bubble
{
  font-weight: 300;
  position: absolute;
  top: -40px;
  text-wrap-mode: nowrap;
  text-align: center;
  width: min-content;
  background: #000;
  color: white;
  padding: 10px;
  z-index: 998;
  clip-path: polygon(0% 0%, 100% 0%, 100% 90%, 54% 90%, 50% 100%, 46% 90%, 0% 90%);
}
</style>