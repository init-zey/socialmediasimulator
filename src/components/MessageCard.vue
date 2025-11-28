<template>
<n-card class="message-card" hoverable>
    <template #header>
        <n-skeleton v-if="title==''" :width="100" round />
        <div v-else>
            <h3><n-ellipsis :line-clamp="2">{{ title }}</n-ellipsis></h3>
        </div>
    </template>
    <n-skeleton v-if="content==''" text :repeat="2"/>
    <div v-else>
        <p>{{msg.t}}</p><p><n-ellipsis :line-clamp="2">{{ content }}</n-ellipsis></p>
    </div>
    <slot name="suffix"></slot>
    <template #action>
        <slot name="action"></slot>
    </template>
</n-card>
</template>

<script setup lang="ts">
import { Message } from '@/game';
import { defineProps, ref } from 'vue';
import { NCard, NSkeleton, NEllipsis } from 'naive-ui';
import { text } from '@/text';

const props = defineProps<{msg:Message}>();
let title = ref("");
let content = ref("");
const intervalId = setInterval(()=>{
    const messageText = text.messageTexts[props.msg.id];
    if (typeof(messageText)!="undefined" && messageText.title != '')
    {
        title.value = messageText.title;
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
    margin-top: 20px;
    padding: 10px;
    box-shadow:0px 0px 3px 0px rgba(0,0,0,0.5);
}
</style>