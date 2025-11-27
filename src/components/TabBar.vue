<template>
    <div class="tabbar">
        <div :class="page==0?'pageButton pageButtonCurrent':'pageButton'" @click="changePage(0)">网络</div>
        <div :class="page==1?'pageButton pageButtonCurrent':'pageButton'" @click="changePage(1)">消息库</div>
        <div :class="page==2?'pageButton pageButtonCurrent':'pageButton'" @click="changePage(2)">设置</div>
    </div>
</template>

<script setup lang="ts">
import { emit } from '@/event';
import { defineProps } from 'vue'
defineProps<{page:number}>();
function changePage(newPage:number)
{
    console.log(newPage);
    emit('changedPage',newPage);
}
</script>

<style scoped>
.tabbar{
    z-index: 2;
    width: 40px;
    background: white;
    box-shadow:0px 0px 8px 0px rgba(0,0,0,0.5);
    display: flex;
    flex-direction: column;
    padding: 8px;
    gap: 16px;
}
.pageButton{
    font-weight: bold;
    background: none;
    text-align: center;
    cursor: pointer;
}
.pageButtonCurrent{
    outline: 1px solid #000;
}
</style>