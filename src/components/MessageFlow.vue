<template>
    <n-card class="flow" :content-style="'display:flex;flex-direction:column;height:100%;padding:0;'">
        <slot name="prefix"></slot>
        <div style="overflow:scroll;margin:20px;flex-grow:1;" class="noscroll">
            <center>
                <n-input v-if="flow!=0" v-model:value="label" size="small" type="text" placeholder="自定义推送流"/>
            </center>
            <draggable
                v-model="source"
                animation="200"
                item-key="element"
                group="flow"
                class="message-list"
            >
            <template #item="element">
                <div>
                    <MessageCard :msg="progress.messages[element.element]">
                        <template #header-extra>
                            <div class="exposure-level">{{ (source?.length??0) - element.index }}<n-icon><ArrowUp/></n-icon></div>
                        </template>
                    </MessageCard>
                </div>
            </template>
            <!-- <p>{{ element }}</p> -->
            </draggable>
        </div>
        <slot name="suffix"></slot>
    </n-card>
</template>

<script setup lang="ts">
import { progress } from '@/game';
import MessageCard from './MessageCard.vue';
import draggable from 'vuedraggable';
import { defineProps, defineModel } from 'vue';
import { NInput, NCard, NIcon } from 'naive-ui';
import { ArrowUp } from '@vicons/carbon';

defineProps<{flow:number}>();
const source = defineModel<Array<number>>("source");
const label = defineModel<string>("label");
</script>

<style scoped>
@media screen and (max-width:600px) {
    .message-list
    {
        display: flex;
    }
}
.exposure-level
{
    font-weight: bold;
}
</style>