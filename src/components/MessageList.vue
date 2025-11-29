<template>
<n-card class="flow" :content-style="'display:flex;flex-direction:column;height:100%;padding:0;'">
  <slot name="prefix"></slot>
  <div style="overflow:scroll;margin:20px;flex-grow:1;" class="noscroll">
    <MessageCard v-for="msg in source" :msg="msg"/>
  </div>
  <slot name="suffix"></slot>
</n-card>
</template>

<script setup lang="ts">
import { Message } from '@/game';
import { defineProps } from 'vue';
import { NCard } from 'naive-ui';
import MessageCard from './MessageCard.vue';
defineProps<{source:Array<Message>}>();
</script>

<style scoped>

</style>