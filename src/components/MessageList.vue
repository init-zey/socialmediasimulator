<template>
<n-data-table
    v-model:checked-row-keys="checkedRowKeys"
    :columns="columns"
    :data="source"
    :pagination="false"
    :bordered="false"
    :row-key="(msg:Message)=>msg.id"
striped />
</template>

<script setup lang="ts">
import { Message, progress } from '@/game';
import { DataTableColumns } from 'naive-ui';
import { defineProps, defineModel } from 'vue';
import { NDataTable } from 'naive-ui';
const props = defineProps<{source:Array<Message>,filter:(msg:Message)=>boolean,select:boolean}>();

const checkedRowKeys=defineModel<Array<number>>();

function createColumns(): DataTableColumns<Message> {
  return [
    {
      title: '创作群体',
      key: 'i'
    },
    {
      title: '时间',
      key: 't'
    },
    {
      title: '涉及群体',
      key: 'j'
    },
    {
      title: '态度',
      key: 'v'
    }
  ]
}

let columns=createColumns();

if (props.select)
{
  columns = [{
    type: 'selection',
    multiple: true,
    disabled: (row)=>!props.filter(progress.messages[row.id])
  }, ...columns]
}

</script>

<style scoped>

</style>