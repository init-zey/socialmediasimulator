<script setup lang="ts">
import { computed, nextTick, onMounted, Ref, ref, watch } from 'vue';
import GameCanvas from './components/GameCanvas.vue';
import MessageCard from './components/MessageCard.vue';
import MessageList from './components/MessageList.vue';
import { createUser, Message, progress, processPushTask, getSubjectUserGraph, rSetIn, updateUsers } from './game';
import { subscribe } from './event';
import { NPageHeader, NTabs, NTabPane, NDrawer, NDrawerContent, NButton, NFlex, NDynamicTags, AutoCompleteInst, NAutoComplete, NCard, NModal, NIcon, NRow, NCol, NNumberAnimation } from 'naive-ui';
import { getUserName, processGenerateQueue, text } from './text';
import { startGenerateMessage } from './text';
import MessageFlow from './components/MessageFlow.vue';
import { View, ThumbsUp } from '@vicons/carbon'

onMounted(()=>{
    // const progressSource = localStorage.getItem('progress');
    // if (progressSource != null)
    // {
    //     setProgress(JSON.parse(progressSource));
    // }
    // else
    // {
        
    // }
    // const appstateSource = localStorage.getItem('appstate');
    // if (appstateSource != null)
    // {
    //     appState.value = JSON.parse(appstateSource);
    // }
    // window.addEventListener('beforeunload', ()=>{
    //     localStorage.setItem('appstate', JSON.stringify(appState.value))
    //     localStorage.setItem('progress', JSON.stringify(progress));
    // });
    createUser(0);
    createUser(0);
    createUser(1);
    createUser(1);
    for(let p=0;p<progress.userCount;p++)
    {
        const G = getSubjectUserGraph(p);
        for(let x=0;x<progress.userCount;x++)
        {
            for(let o=x;o<progress.userCount;o++)
            {
                if (x==p)
                {
                    rSetIn(x,o,1,G);
                }
                else
                {
                    rSetIn(x,o,-1,G);
                }
            }
        }
    }
    text.userTexts.push(
        {
            name: "学生",
            prompt: ""
        },
        {
            name: "丘",
            prompt: ""
        },
        {
            name: "人品",
            prompt: ""
        },
        {
            name: "数学",
            prompt: ""
        }
    );
});

export interface AppState {
    mode: "user-edit" | "connect" | "disconnect";
    editingUser: number;
    uncollectedMessages: Record<number,Array<number>>;
    flows: Array<Array<number>>;
    messageStatistic: Record<number, {views:number,likes:number}>
}

const appState:Ref<AppState> = ref({
    mode:'user-edit',
    editingUser:-1,
    uncollectedMessages:{},
    collectedMessages:[],
    flows:[[]],
    messageStatistic:{}
});

const showUserEditor = ref(false);
const showFlowsEditor = ref(false);

const messages = ref(progress.messages);
function getUserMessages(author:number)
{
    return messages.value.filter(m=>m.i==author);
}

const editingFlowTags:Ref<Array<string>> = ref([]);
function onCreateFlowTag(tag:string):string
{
    if (editingFlowTags.value.includes(tag))return "";
    const flow = text.flowLabel.indexOf(tag);
    if (flow==undefined) return "";
    if (flow<=0) return "";
    return tag;
}
const autoCompleteInstRef = ref<AutoCompleteInst | null>(null)
watch(autoCompleteInstRef, (value) => {
  if (value)
    nextTick(() => value.focus())
})
const flowTagInputValue = ref('');
const flowTagOptions = computed(() => {
  if (flowTagInputValue.value === null) {
    return []
  }
  return text.flowLabel.filter(label=>!editingFlowTags.value.includes(label)&&label.includes(flowTagInputValue.value)).map((completion) => {
    return {
      label: completion,
      value: completion
    }
  })
})
subscribe('userPressed', (id)=>
{
    if (progress.userType[id]==0)
    {
        if (appState.value.mode=="user-edit")
        {
            showUserEditor.value = true;
            appState.value.editingUser = id;
            while (progress.userFlowTags.length <= id)
            {
                progress.userFlowTags.push([]);
            }
            editingFlowTags.value = progress.userFlowTags[id].map(flow=>text.flowLabel[flow]);
        }
    }
})

subscribe('addedMessage', (msg:Message)=>{
    if (!(msg.i in appState.value.uncollectedMessages))
    {
        appState.value.uncollectedMessages[msg.i] = [];
    }
    appState.value.uncollectedMessages[msg.i].push(msg.id);
});

function forgetMsg(msg:Message)
{
    appState.value.uncollectedMessages[msg.i] = appState.value.uncollectedMessages[msg.i].filter(m=>m!=msg.id);
}
function collectMsg(msg:Message)
{
    forgetMsg(msg);
    appState.value.flows[0].push(msg.id);
}
function finishRound()
{
    progress.time += 1;
    appState.value.uncollectedMessages = {};
    for(let flow=0;flow<appState.value.flows.length;flow++)
    {
        processPushTask(appState.value.flows[flow],flow);
        appState.value.flows[flow] = [];
    }
    updateUsers();
    showStatistic.value = true;
}
subscribe('addedMessage', (msg:Message)=>startGenerateMessage(msg));
setInterval(() => {
    processGenerateQueue();
}, 1000);
setInterval(() => {
    windowWidth.value = window.innerWidth;
}, 1);
const windowWidth = ref(0);
// const flowsPage = ref(1);
// const flowsPageSize = 3;
// function getFlowPage()
// {
//     let arr = [];
//     for(let i=0;i<(Math.min(flowsPage.value*flowsPageSize,appState.value.flows.length)-1)%(flowsPageSize)+1;i++)
//     {
//         arr.push((flowsPage.value-1) * flowsPageSize + i);
//     }
//     return arr;
// }
// const flowsPageCount = ref(1);
// watch(appState.value.flows, (newValue)=>{
//     flowsPageCount.value = Math.ceil(newValue.length/flowsPageSize);
//     flowsPage.value = flowsPageCount.value;
// });
subscribe('viewedMessage',(msgId,view)=>{
    if(!(msgId in appState.value.messageStatistic)) appState.value.messageStatistic[msgId] = {views:0,likes:0};
    appState.value.messageStatistic[msgId].views += view;
})
subscribe('likedMessage',(msgId,like)=>{
    if(!(msgId in appState.value.messageStatistic)) appState.value.messageStatistic[msgId] = {views:0,likes:0};
    appState.value.messageStatistic[msgId].likes += like;
})
const showStatistic = ref(false);
</script>

<template>
<div class="app">
    <!-- <p v-for="flow,flowId in appState.flows" :key="flowId">{{ flowId }}</p> -->
    <GameCanvas :app-state="appState" ref="canvas"/>
    <n-modal v-model:show="showStatistic" preset="card" style="width: 600px;" title="统计数据" size="huge" :bordered="false"
        @update-show="(show)=>{if(!show)appState.messageStatistic={}}"
    >
        <MessageCard v-for="(statistic, msg) in appState.messageStatistic" :key=msg :msg="progress.messages[msg]">
            <template #suffix>
                <n-row>
                    <n-col :span="12">
                        <n-icon><View/></n-icon>
                        <n-number-animation :from="0" :to="statistic.views"/>
                    </n-col>
                    <n-col :span="12">
                        <n-icon><ThumbsUp/></n-icon>
                        <n-number-animation :from="0" :to="statistic.likes"/>
                    </n-col>
                </n-row>
            </template>
        </MessageCard>
    </n-modal>
    <n-drawer v-model:show="showFlowsEditor" :width="windowWidth>800?800:windowWidth" :placement="'left'">
        <n-drawer-content>
            <div class="flows">
                <n-flex style="flex-grow: 1;overflow-y: scroll;overflow-x: hidden;">
                    <MessageFlow v-for="i,flow in appState.flows.length" :key="flow" v-model:label="text.flowLabel[flow]" v-model:source="appState.flows[flow]" :flow="flow"/>
                    <NCard class="flowControl">
                        <n-flex vertical>
                            <n-button @click="appState.flows.push([])">添加</n-button>
                            <n-button @click="appState.flows.pop()" :disabled="appState.flows.length<=1">移除</n-button>
                        </n-flex>
                    </NCard>
                </n-flex>
                <!-- <n-pagination v-model:page="flowsPage" :page-count="flowsPageCount"/> -->
            </div>
        </n-drawer-content>
    </n-drawer>
        <n-drawer class="user-editor-container" v-model:show="showUserEditor" :width="windowWidth>500?500:windowWidth" @update-show="(show)=>{if(!show){
            progress.userFlowTags[appState.editingUser]=editingFlowTags.map(label=>text.flowLabel.indexOf(label)).filter(flow=>flow>0);
            console.log(progress.userFlowTags[appState.editingUser]);
            appState.editingUser=-1;
        }}">
            <n-drawer-content :native-scrollbar="false">
                <template #header>
                    <NPageHeader subtitle="用户分析" @back="showUserEditor=false"></NPageHeader>
                    <h1>#{{ getUserName(appState.editingUser) }}</h1>
                </template>
                <p>
                <n-dynamic-tags v-model:value="editingFlowTags" @create=onCreateFlowTag>
                    <template #input="{ submit, deactivate }">
                    <n-auto-complete
                        ref="autoCompleteInstRef"
                        v-model:value="flowTagInputValue"
                        size="small"
                        :options="flowTagOptions"
                        placeholder="添加订阅"
                        :clear-after-select="true"
                        @select="submit($event)"
                        @blur="deactivate"
                    />
                    </template>
                </n-dynamic-tags>
                </p>
                <n-tabs class="user-editor" type="segment" animated>
                    <n-tab-pane name="new" tab="最新发言">
                        <MessageCard :msg="progress.messages[msgId]" v-for="msgId in (appState.uncollectedMessages[appState.editingUser])" :key="msgId">
                            <template #action>
                                <n-flex justify="space-between">
                                    <n-button @click="collectMsg(progress.messages[msgId])">收集</n-button>
                                    <n-button @click="forgetMsg(progress.messages[msgId])">忽略</n-button>
                                </n-flex>
                            </template>
                        </MessageCard>
                    </n-tab-pane>
                    <n-tab-pane name="history" tab="历史发言">
                        <MessageList :source="getUserMessages(appState.editingUser)" :filter="(msg)=>true" :select="false"/>
                    </n-tab-pane>
                </n-tabs>
            </n-drawer-content>
        </n-drawer>
        <div class="corner-buttons corner-buttons-rb">
            <n-button round type="primary" size="large" @click="finishRound">结束回合</n-button>
        </div>
        <div class="corner-buttons corner-buttons-lb">
            <n-button round type="primary" size="large" @click="showFlowsEditor=true">编辑推送流</n-button>
        </div>
</div>
</template>

<style>
body
{
    margin: 0;
    overflow: hidden;
}

.app
{
    display: flex;
    width: 100vw;
    height: 100vh;
}
.corner-buttons
{
    position: absolute;
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.corner-buttons-lb
{
    left: 20px;
    bottom: 20px;
}
.corner-buttons-rb
{
    right: 20px;
    bottom: 20px;
}
@media (max-width: 500px) {
    .user-editor-container {
        width: 400px;
    }
}
.flows
{
    overflow: hidden;
    height: 100%;
    display: flex;
    flex-direction: column;
}
.flow
{
    overflow-y: scroll;
    width: 300px;
    height: 100%;
    margin: 8px;
    box-shadow: 0 0 5px 0px rgba(0,0,0,0.5);
}
.flow::-webkit-scrollbar {
    display: none;
}
.flowControl
{
    width: 300px;
    margin: 8px;
    height: min-content;
    display: flex;
    flex-direction: column;
}
</style>