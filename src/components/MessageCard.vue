<template>
<n-card class="message-card" :content-class="'message-content'" :header-style="'padding: 5px'" :footer-style="'padding-bottom: 5px'" hoverable>
    <template #header>
        <div class="author">@{{ getUserName(msg.a) }}</div>
    </template>
    <template #header-extra>
        <slot name="header-extra"></slot>
    </template>
    <n-skeleton v-if="content==''" text :repeat="2"/>
    <div v-else>
        <p class="content"><n-ellipsis :line-clamp="2">{{ content }}</n-ellipsis></p>
    </div>
    <slot name="suffix"></slot>
     <div class="time">{{ timestr }}</div>
    <template #footer>
        <slot name="action"></slot>
    </template>
</n-card>
</template>

<script setup lang="ts">
import { Message } from '@/game';
import { defineProps, onMounted, ref, watch } from 'vue';
import { NCard, NSkeleton, NEllipsis } from 'naive-ui';
import { getUserName, text } from '@/text';

const props = defineProps<{msg:Message}>();
let content = ref("");
let timestr = ref("");
const intervalId = setInterval(()=>{
    const messageText = text.messageTexts[props.msg.id];
    if (typeof(messageText)!="undefined" && messageText.content != '')
    {
        content.value = messageText.content;
        // clearInterval(intervalId);
    }
}, 1);
</script>

<style scoped>
.message-card
{
    margin-left: auto;
    margin-right: auto;
    margin-top: 0;
    margin-bottom: 20px;
    padding: 10px;
    border-radius: 20px;
    border: 1px dashed lightgray;
}
.author
{
    font-weight: bold;
    font-size: 16px;
}
.content
{
    font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
}
.time
{
    color: gray;
    font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
}
.message-content
{
    padding: 0;
}
@media screen and (max-width:600px) {
    .message-card
    {
        width: 200px;
        margin-top: auto;
        margin-bottom: 20px;
        margin-left: 0;
        margin-right: 20px;
    }
}
</style>