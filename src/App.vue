<script setup lang="ts">
import { onMounted, Ref, ref } from 'vue';
import GameCanvas from './components/GameCanvas.vue';
import MessageCard from './components/MessageCard.vue';
import MessageList from './components/MessageList.vue';
import { createUser, Message, progress, processPushTask, setProgress, getSubjectUserGraph, rSetIn, rGetIn, updateUsers } from './game';
import { subscribe } from './event';
import { NPageHeader, NTabs, NTabPane, NDrawer, NDrawerContent, NButton, NModal, NCard, NFlex } from 'naive-ui';
import { getUserName, processGenerateQueue, text } from './text';
import { startGenerateMessage } from './text';

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
    const studenGraph = getSubjectUserGraph(0);
    rSetIn(0,1,-1,studenGraph);
    rSetIn(0,2,2,studenGraph);
    rSetIn(0,3,1,studenGraph);
    rSetIn(1,2,-1,studenGraph);
    rSetIn(1,3,1,studenGraph);
});

export interface AppState {
        mode: "user-edit" | "connect" | "disconnect";
        editingUser: number;
        uncollectedMessages: Record<number,Array<number>>;
        collectedMessages: Array<number>;
        readyToPushMessages: Record<number,Array<number>>;
}

const appState:Ref<AppState> = ref({
    mode:'user-edit',
    editingUser:-1,
    uncollectedMessages:{},
    collectedMessages:[],
    readyToPushMessages:{}
});

const showUserEditor = ref(false);
const collectedMessagesModal = ref(false);

const messages = ref(progress.messages);
function getUserMessages(author:number)
{
    return messages.value.filter(m=>m.i==author);
}

subscribe('userPressed', (id)=>
{
    if (progress.userType[id]==0)
    {
        if (appState.value.mode=="user-edit")
        {
            if (!(id in appState.value.readyToPushMessages)) {appState.value.readyToPushMessages[id] = []}
            showUserEditor.value = true;
            appState.value.editingUser = id;
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
    appState.value.collectedMessages.push(msg.id);
}
function finishRound()
{
    progress.time += 1;
    appState.value.uncollectedMessages = {};
    // appState.value.collectedMessages = appState.value.collectedMessages.filter(msg=>progress.time-msg.t<=1);
    processPushTask(appState.value.readyToPushMessages);
    appState.value.readyToPushMessages = {};
    updateUsers();
}
subscribe('addedMessage', (msg:Message)=>startGenerateMessage(msg));
setInterval(() => {
    processGenerateQueue();
}, 1000);
setInterval(() => {
    windowWidth.value = window.innerWidth;
}, 1);
const windowWidth = ref(0);
</script>

<template>
<div class="app">
    <GameCanvas :app-state="appState" ref="canvas"/>
    <n-drawer class="user-editor-container" v-model:show="showUserEditor" :width="windowWidth>500?500:windowWidth" @update-show="(show)=>{if(!show)appState.editingUser=-1}">
        <n-drawer-content :native-scrollbar="false">
            <template #header>
                <NPageHeader subtitle="用户分析" @back="appState.editingUser=-1;showUserEditor=false"></NPageHeader>
                <h1>#{{ getUserName(appState.editingUser) }}</h1>
            </template>
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
                <n-tab-pane name="push-list" tab="本次推送">
                    <!-- <n-flex justify="center">
                        <n-button @click="selectMessageModal=true" :disabled="getUserPushableMessages(appState.editingUser).length==0">修改</n-button>
                    </n-flex>
                    <MessageCard :msg="progress.messages[msgId]" v-for="msgId in (appState.readyToPushMessages[appState.editingUser])" :key="msgId"/> -->
                    <MessageList :source="appState.collectedMessages.map(mid=>progress.messages[mid])" :filter="m=>m.i!=appState.editingUser&&((!(appState.editingUser in progress.userMemory))||progress.userMemory[appState.editingUser].includes(m.id))" :select="true" v-model="appState.readyToPushMessages[appState.editingUser]"/>
                </n-tab-pane>
            </n-tabs>
        </n-drawer-content>
    </n-drawer>
    <div class="corner-buttons">
        <n-button round type="primary" size="large" @click="collectedMessagesModal=true">已收集消息</n-button>
        <n-button round type="primary" size="large" @click="finishRound">结束回合</n-button>
    </div>
    <n-modal v-model:show="collectedMessagesModal">
    <n-card style="width: 600px" title="已收集消息">
    <MessageList :source="appState.collectedMessages.map(mid=>progress.messages[mid])" :filter="(msg)=>true" :select="false"/>
    </n-card>
    </n-modal>
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
    right: 20px;
    bottom: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}
@media (max-width: 500px) {
    .user-editor-container {
        width: 400px;
    }
}
</style>