<template>
    <n-card class="flow noscroll">
        <center>
            <n-tag v-if="flow==0">主推送流</n-tag>
            <n-input v-else v-model:value="label" size="small" type="text" placeholder="自定义推送流"/>
        </center>
        <draggable
            v-model="source"
            animation="200"
            item-key="element"
            group="flow"
            style="height: 100%;"
        >
        <template #item="element">
            <div>
                <MessageCard :msg="progress.messages[element.element]">
                    <template #header-extra>
                        <b>{{ (source?.length??0) - element.index }}x</b>
                    </template>
                </MessageCard>
            </div>
        </template>
        <!-- <p>{{ element }}</p> -->
        </draggable>
    </n-card>
</template>

<script setup lang="ts">
import { progress } from '@/game';
import MessageCard from './MessageCard.vue';
import draggable from 'vuedraggable';
import { defineProps, defineModel } from 'vue';
import { NButton, NInput, NTag, NCard } from 'naive-ui';

defineProps<{flow:number}>();
const source = defineModel<Array<number>>("source");
const label = defineModel<string>("label");
</script>