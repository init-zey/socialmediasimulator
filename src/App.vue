<script setup lang="ts">
import { computed, nextTick, onMounted, Ref, ref, watch } from 'vue';
import GameCanvas from './components/GameCanvas.vue';
import MessageCard from './components/MessageCard.vue';
import MessageList from './components/MessageList.vue';
import game, { createUser, Message, progress, processPushTask, getSubjectUserGraph, rSetIn, updateUsers, setProgress, resetProgress } from './game';
import { subscribe } from './event';
import { NPageHeader, NTabs, NTabPane, NDrawer, NDrawerContent, NButton, NFlex, NDynamicTags, AutoCompleteInst, NAutoComplete, NCard, NModal, NIcon, NRow, NCol, NNumberAnimation, NStatistic, NDivider } from 'naive-ui';
import { getUserName, loadText, processGenerateQueue, resetText, text } from './text';
import { startGenerateMessage } from './text';
import MessageFlow from './components/MessageFlow.vue';
import { View, ThumbsUp, AnalyticsReference, AiResultsHigh, Time, Network1 } from '@vicons/carbon'

onMounted(()=>{
    // const progressSource = localStorage.getItem('progress');
    // if (progressSource != null)
    // {
    //     setProgress(JSON.parse(progressSource));
    //     gameScore.value = progress.score;
    //     gameTime.value = progress.time;
    // }
    // else
    // {
        
    // }
    // const appstateSource = localStorage.getItem('appstate');
    // if (appstateSource != null)
    // {
    //     appState.value = JSON.parse(appstateSource);
    // }
    // loadText();
    window.addEventListener('beforeunload', ()=>{
        localStorage.setItem('appstate', JSON.stringify(appState.value))
        localStorage.setItem('progress', JSON.stringify(progress));
    });
    gameInit();
});

export interface AppState {
    mode: "user-edit" | "connect" | "disconnect";
    editingUser: number;
    uncollectedMessages: Record<number,Array<number>>;
    flows: Array<Array<number>>;
    messageStatistic: Array<{msg:number,views:number,likes:number,exposure:number,score:number}>;
}

const appState:Ref<AppState> = ref({
    mode:'user-edit',
    editingUser:-1,
    uncollectedMessages:{},
    flows:[[]],
    messageStatistic:[]
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
    if (!(msg.a in appState.value.uncollectedMessages))
    {
        appState.value.uncollectedMessages[msg.a] = [];
    }
    appState.value.uncollectedMessages[msg.a].push(msg.id);
});

function forgetMsg(msg:Message)
{
    appState.value.uncollectedMessages[msg.a] = appState.value.uncollectedMessages[msg.a].filter(m=>m!=msg.id);
}
function collectMsg(msg:Message)
{
    forgetMsg(msg);
    appState.value.flows[0].push(msg.id);
}
function finishRound()
{
    progress.time += 1;
    gameTime.value = progress.time;
    appState.value.uncollectedMessages = {};
    for(let flow=0;flow<appState.value.flows.length;flow++)
    {
        processPushTask(appState.value.flows[flow],flow);
        appState.value.flows[flow] = [];
    }
    updateUsers();
    if (Object.keys (appState.value.uncollectedMessages).length==0)
    {
        gameEnded.value = true;
    }
    else if (appState.value.messageStatistic.length>0)
    {
        appState.value.messageStatistic = appState.value.messageStatistic.sort((s1,s2)=>s2.exposure-s1.exposure);
        showStatistic.value = true;
    }
}
subscribe('addedMessage', (msg:Message)=>startGenerateMessage(msg));
setInterval(() => {
    processGenerateQueue();
}, 1000);
setInterval(() => {
    windowWidth.value = window.innerWidth;
}, 1);
const windowWidth = ref(0);
function checkoutMessageStatistic(msgId:number)
{
    for (let i=0;i<appState.value.messageStatistic.length;i++)
    {
        if (appState.value.messageStatistic[i].msg == msgId) return i;
    }
    appState.value.messageStatistic.push({msg:msgId,views:0,likes:0,exposure:0,score:0});
    return appState.value.messageStatistic.length-1;
}
subscribe('viewedMessage',(msgId,view)=>{
    appState.value.messageStatistic[checkoutMessageStatistic(msgId)].views = view;
})
subscribe('likedMessage',(msgId,like)=>{
    appState.value.messageStatistic[checkoutMessageStatistic(msgId)].likes = like;
})
subscribe('messageKnownExposure',(msgId,exposure)=>{
    appState.value.messageStatistic[checkoutMessageStatistic(msgId)].exposure = exposure;
})
subscribe('messageGainedScore',(msgId,score)=>{
    appState.value.messageStatistic[checkoutMessageStatistic(msgId)].score = score;
    progress.score += score;
    gameScore.value = progress.score;
    roundScore += score;
})
const showStatistic = ref(false);
let roundScore = 0;
const gameScore = ref(0);
const gameTime = ref(0);
const gameEnded = ref(false);
subscribe('resetProgress', ()=>{
    appState.value={
        mode:'user-edit',
        editingUser:-1,
        uncollectedMessages:{},
        flows:[[]],
        messageStatistic:[]
    };
    gameTime.value = 0;
    gameScore.value = 0;
    resetText();
    gameInit();
});
function gameInit()
{
    for(let i=0;i<Math.random()*4+4;i++)
    {
        createUser(0);
    }
    for(let p=0;p<progress.userCount;p++)
    {
        const G = getSubjectUserGraph(p);
        // for(let x=0;x<4;x++)
        // {
        //     for(let o=0;o<4;o++)
        //     {
        //         rSetIn(x,o,1,G);
        //     }
        // }
        for(let x=0;x<progress.userCount;x++)
        {
            rSetIn(p,x,(Math.random()*2-1)*2,G);
        }
    }
    finishRound();
}
</script>

<template>
<div class="app">
    <!-- <p v-for="flow,flowId in appState.flows" :key="flowId">{{ flowId }}</p> -->
    <GameCanvas v-model="appState" ref="canvas"/>
    <n-modal v-model:show="showStatistic" preset="card" style="width: 600px;" :title="`第${progress.time}回合统计`" size="huge" :bordered="false"
        @update-show="(show)=>{if(!show){appState.messageStatistic=[];roundScore=0;}}"
    >
        <center>
            <h3>总得分</h3>
            <h1><n-number-animation :to="Math.floor(roundScore)"/></h1>
        </center>
        <MessageCard v-for="statistic in appState.messageStatistic" :key=statistic.msg :msg="progress.messages[statistic.msg]">
            <template #suffix>
                <n-row>
                    <n-col :span="12">
                        <n-statistic label="浏览" :value="statistic.views.toFixed(3)">
                            <template #prefix><n-icon><View/></n-icon></template>
                            <template #suffix>K</template>
                        </n-statistic>
                    </n-col>
                    <n-col :span="12">
                        <n-statistic label="点赞" :value="(statistic.likes*(Math.abs(Math.random()-0.8)+0.8)).toFixed(3)">
                            <template #prefix><n-icon><ThumbsUp/></n-icon></template>
                            <template #suffix>K</template>
                        </n-statistic>
                    </n-col>
                    <n-col :span="12">
                        <n-statistic label="曝光倍率" :value="statistic.exposure">
                            <template #prefix><n-icon><AnalyticsReference/></n-icon></template>
                            <template #suffix>x</template>
                        </n-statistic>
                    </n-col>
                    <n-col :span="12">
                        <n-statistic label="得分" :value="statistic.score.toFixed()">
                            <template #prefix><n-icon><AiResultsHigh/></n-icon></template>
                        </n-statistic>
                    </n-col>
                </n-row>
            </template>
        </MessageCard>
    </n-modal>
    <MessageFlow style="box-shadow: none; background: none; border: none; padding: 20px; z-index: 999; position: fixed; left: 20px; top: 20px; bottom: 20px;" v-model:label="text.flowLabel[0]" v-model:source="appState.flows[0]" :flow="0"/>
    <!-- <n-drawer v-model:show="showFlowsEditor" :width="windowWidth" :placement="'left'">
        <n-drawer-content :body-style="'background-color:transparent;' :body-content-style=""">
            <div class="flows">
                <n-flex class="noscroll" style="flex-grow: 1;overflow-y:scroll;">
                    <MessageFlow v-for="i,flow in appState.flows.length" :key="flow" v-model:label="text.flowLabel[flow]" v-model:source="appState.flows[flow]" :flow="flow"/>
                    <NCard class="flowControl">
                        <n-flex vertical>
                            <n-button @click="appState.flows.push([])">添加</n-button>
                            <n-button @click="appState.flows.pop()" :disabled="appState.flows.length<=1">移除</n-button>
                        </n-flex>
                    </NCard>
                </n-flex>
                <div style="border-top: 1px solid gainsboro; height: 8px;"></div>
                <n-page-header subtitle="推送流" @back="showFlowsEditor=false"></n-page-header>
            </div>
        </n-drawer-content>
    </n-drawer> -->
        <n-drawer class="user-editor-container" v-model:show="showUserEditor" :width="windowWidth>500?500:windowWidth" @update-show="(show)=>{if(!show){
            progress.userFlowTags[appState.editingUser]=editingFlowTags.map(label=>text.flowLabel.indexOf(label)).filter(flow=>flow>0);
            console.log(progress.userFlowTags[appState.editingUser]);
            appState.editingUser=-1;
        }}">
            <n-drawer-content :native-scrollbar="false">
                <template #header>
                    <n-page-header subtitle="用户分析" @back="showUserEditor=false"></n-page-header>
                    <h1>#{{ getUserName(appState.editingUser) }}</h1>
                </template>
                <!-- <p>
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
                </p> -->
                <!--<n-tabs class="user-editor" type="segment" animated>
                    <n-tab-pane name="new" tab="最新发言">-->
                        <MessageCard :msg="progress.messages[msgId]" v-for="msgId in (appState.uncollectedMessages[appState.editingUser])" :key="msgId">
                            <template #action>
                                <n-flex justify="space-between">
                                    <n-button @click="collectMsg(progress.messages[msgId])">收集</n-button>
                                    <n-button @click="forgetMsg(progress.messages[msgId])">忽略</n-button>
                                </n-flex>
                            </template>
                        </MessageCard>
                    <!--</n-tab-pane>
                    <n-tab-pane name="history" tab="历史发言">
                        <MessageList :source="getUserMessages(appState.editingUser)" :filter="(msg)=>true" :select="false"/>
                    </n-tab-pane>
                </n-tabs>-->
            </n-drawer-content>
        </n-drawer>
        <div class="pagebottom">
            <div class="buttons">
                <!-- <n-button round type="primary" size="large" @click="showFlowsEditor=true">编辑推送流</n-button> -->
            </div>
            <div class="score">
                <n-icon><Time/></n-icon> {{ gameTime }} <n-icon><Network1/></n-icon> <n-number-animation :to="gameScore"/>
            </div>
            <div class="buttons">
                <n-button round type="primary" size="large" @click="finishRound">结束回合</n-button>
            </div>
        </div>
        <n-modal v-model:show="gameEnded" preset="card" style="width: 600px;" :title="`游戏结束`" size="huge" :bordered="false" :mask-closable=false>
            <p>你的网络在第<b>{{ gameTime }}</b>回合安静下来了，你的得分是<b>{{ gameScore }}</b>。</p>
            <center><n-button @click="gameEnded=false;resetProgress()">重新开始</n-button></center>
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
.buttons
{
    display: flex;
    flex-direction: column;
    gap: 8px;
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
.noscroll::-webkit-scrollbar {
    display: none;
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
.pagebottom
{
    display:flex;
    position:absolute;
    height:40px;
    justify-content:space-between;
    bottom:20px;
    left:20px;
    right:20px;
}
.score
{
    background: white;
    box-shadow: 0 0 5px rgba(0,0,0,0.5);
    border-radius: 8px;
    color:black;
    padding: 8px;
    text-wrap-mode: nowrap;
    text-align: center;
    font-weight: bold;
}
</style>