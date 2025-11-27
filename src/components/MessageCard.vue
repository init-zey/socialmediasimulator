<template>
<n-card class="message-card" hoverable>
    <template #header>
        <n-skeleton v-if="title==''" :width="100" round />
        <div v-else>
            <h3>{{ title }}</h3>
        </div>
    </template>
    <n-skeleton v-if="content==''" text :repeat="2"/>
    <div v-else>
        时间:{{msg.t}}<br/>{{ content }}
    </div>
    <template #action>
        <slot name="action"></slot>
    </template>
</n-card>
</template>

<script setup lang="ts">
import { Message } from '@/game';
import { defineProps, ref } from 'vue';
import { NCard, NSkeleton } from 'naive-ui';
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
        clearInterval(intervalId);
    }
}, 100);
</script>

<style scoped>
.message-card
{
    margin-left: auto;
    margin-right: auto;
    margin-top: 20px;
    padding: 10px;
}
</style>