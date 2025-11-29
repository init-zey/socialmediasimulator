<script setup lang="ts">
import { nextTick, onMounted, Ref, ref, watch } from 'vue';
import GameCanvas from './components/GameCanvas.vue';
import MessageCard from './components/MessageCard.vue';
import { createUser, Message, progress, rSet, updateUsers, resetProgress, loadProgress, pushMsgToUser, rGet, createMessage } from './game';
import { emit, subscribe } from './event';
import { NPageHeader, NTag, NSpace, NDrawer, NDrawerContent, NButton, AutoCompleteInst, NDynamicTags, NModal, NIcon, NRow, NCol, NNumberAnimation, NStatistic, useMessage, NFlex } from 'naive-ui';
import { getUserName, loadText, processGenerateQueue, resetText, text } from './text';
import { startGenerateMessage } from './text';
import { View, ThumbsUp, AnalyticsReference, AiResultsHigh, Time, Network1 } from '@vicons/carbon'
import StatusBar from './components/StatusBar.vue';

const naiveMessage = useMessage();

const searchCost = 10;

function load()
{
    loadProgress();
    loadText();
    const appstateSource = localStorage.getItem('appstate');
    if (appstateSource != null)
    {
        appState.value = JSON.parse(appstateSource);
        gameScore.value = progress.score;
        gameTime.value = progress.time;
    }
    naiveMessage.success("已读取");
}

function save()
{
    localStorage.setItem('appstate', JSON.stringify(appState.value))
    localStorage.setItem('progress', JSON.stringify(progress));
    localStorage.setItem('text', JSON.stringify(text));
    naiveMessage.success("已保存");
}

onMounted(()=>{
    window.addEventListener('beforeunload', ()=>{
        save();
    });
    window.addEventListener('keydown', (e)=>{
        if(e.key==' ')
        {
            appState.value.paused = !appState.value.paused;
            naiveMessage.info(appState.value.paused?"已暂停":"已恢复");
        }
    })
    gameInit();
    const delta = 100;
    setInterval(()=>{
        if (appState.value.paused||showStatistic.value) return;
        gameProcess(delta/1000);
    },delta);
});

export interface AppState {
    mode: "select-relationship" | "broadcast";
    editingRelationship: {i:number,j:number};
    paused: boolean;
    selectedUsers: Array<number>
    focusedUser: number
}

const appState:Ref<AppState> = ref({
    mode:'select-relationship',
    editingRelationship:{i:-1,j:-1},
    paused:true,
    selectedUsers: [],
    focusedUser: -1
});

const collectedMessage: Ref<Message|undefined> = ref(undefined);

const showEditorDrawer = ref(false);
const showStatistic = ref(false);

interface MessageStatistic {views:number,likes:number,score:number,responses:Record<number,string>}

function createDefaultMessageStatistic()
{
    return {views:0,likes:0,score:0,responses:{}};
}
let collectedMessageStatistic:Ref<MessageStatistic> = ref(createDefaultMessageStatistic());
subscribe('relationSelected', (i,j)=>
{
    if (appState.value.mode=="select-relationship")
    {
        showEditorDrawer.value = true;
        collectedMessage.value = undefined;
        appState.value.editingRelationship = {i,j};
    }
});
function collectMessage(i:number,j:number)
{
    let r = -rGet(i,j);
    if (Math.abs(r) < 0.1)
    {
        r = Math.random()?1:-1;
    }
    collectedMessage.value=createMessage(i,i,j,r)
    progress.score -= searchCost;
    gameScore.value = progress.score;
    if (gameScore.value <= searchCost)
    {
        gameEnded.value = true;
    }
}
function gameProcess(delta:number)
{
    updateUsers(delta);
}
// function startBroadcastCollectedMessage()
// {
//     appState.value.mode = 'broadcast';
//     appState.value.paused = true;
//     showEditorDrawer.value = false;
// }
// function endBroadcastCollectedMessage()
// {
//     emit('tryGetBroadcastCollectedMessageTargets');
// }
// function exitBroadcastCollectedMessage()
// {
//     appState.value.mode = 'select-relationship';
// }
// subscribe('getBroadcastCollectedMessageTargets', (targets:Array<number>)=>
// {

// })
function broadcastCollectedMessage()
{
    showEditorDrawer.value = false;
    if (collectedMessage.value == undefined) return;
    collectedMessageStatistic.value={views:0,likes:0,score:0,responses:{}};
    gameTime.value = progress.time;
    for (let user=0;user<progress.userCount;user++)
    {
        if (progress.userType[user]!=0) continue;
        pushMsgToUser(collectedMessage.value,user);
    }
    rSet(collectedMessage.value.i,collectedMessage.value.j,collectedMessage.value.v);
    showStatistic.value = true;
    appState.value.paused = true;
    appState.value.mode = 'select-relationship';
}
subscribe('addedMessage', (msg:Message)=>startGenerateMessage(msg));
setInterval(() => {
    processGenerateQueue();
}, 1000);
setInterval(() => {
    windowWidth.value = window.innerWidth;
}, 1);
const windowWidth = ref(0);
subscribe('viewedMessage',(view)=>{
    collectedMessageStatistic.value.views += view;
});
subscribe('likedMessage',(like)=>{
    collectedMessageStatistic.value.likes += like;
});
subscribe('messageGainedScore',(score)=>{
    collectedMessageStatistic.value.score += score;
    progress.score += score;
    gameScore.value = progress.score;
});
subscribe('messageResponsed',(author,response)=>{
    collectedMessageStatistic.value.responses[author]=response;
});
const gameScore = ref(progress.score);
const gameTime = ref(0);
const gameEnded = ref(false);
subscribe('resetProgress', ()=>{
    appState.value={
        mode:'select-relationship',
        editingRelationship:{i:0,j:0},
        paused:true,
        selectedUsers: [],
        focusedUser: -1
    };
    collectedMessageStatistic.value=createDefaultMessageStatistic();
    gameTime.value = 0;
    gameScore.value = progress.score;
    resetText();
});
function gameInit()
{
    // const size = 10;
    // for (let g=0;g<1;g++)
    // {
    //     for(let i=0;i<size;i++)
    //     {
    //         createUser(0);
    //     }
    //     for(let i=0;i<size;i++)
    //     {
    //         for(let j=0;j<size;j++)
    //         {
    //             rSet(g*size+i,g*size+j,Math.random()>0.5?1:-1);
    //             // rSet(g*size+i,g*size+j,Math.floor(Math.random()*3)-1);
    //         }
    //     }
        // for(let p=3;p<size;p++)
        // {
        //     for(let o=0;o<3;o++)
        //     {
        //         rSet(g*size+p,g*size+p-1-o,Math.random()>0.5?1:-1);
        //     }
        //     for(let o=0;o<3;o++)
        //     {
        //         rSet(g*size+p,g*size+o,1);
        //     }
        // }
        // for(let p=0;p<size;p++)
        // {
        //     rSet(g*size+p,g*size+p,1);
        // }
        // if (g>0)
        // {
        //     rSet((g-1)*size, g*size, 1);
        // }
    // }
    createUser(0);
    createUser(0);
    createUser(0);
    createUser(0);
    rSet(0,1,-1);
    rSet(0,2,-1);
    rSet(1,2,-1);
    rSet(0,3,1);
    rSet(1,3,2);
    rSet(2,3,3);

    rSet(0,0,0);
    rSet(1,1,0);
    rSet(2,2,0);
}
</script>

<template>
<div class="app">
    <GameCanvas v-model="appState" ref="canvas"/>
    <n-modal v-model:show="showStatistic" preset="card" style="margin: 60px;" :title="`数据统计`" size="huge" :bordered="false"
        @update-show="(show)=>{if(!show){}}"
    >
        <MessageCard v-if="collectedMessage!=undefined" :msg="collectedMessage">
            <template #suffix>
                <n-space>
                    <n-tag v-for="response,author in collectedMessageStatistic.responses" :key="author" round>
                            {{getUserName(author)}} {{ response }}
                    </n-tag>
                </n-space>
                <n-row>
                    <n-col :span="12">
                        <n-statistic label="浏览" :value="(collectedMessageStatistic.views*1000).toFixed()">
                            <template #prefix><n-icon><View/></n-icon></template>
                        </n-statistic>
                    </n-col>
                    <n-col :span="12">
                        <n-statistic label="点赞" :value="(collectedMessageStatistic.likes*Math.max(Math.random(),0.5)*1000).toFixed()">
                            <template #prefix><n-icon><ThumbsUp/></n-icon></template>
                        </n-statistic>
                    </n-col>
                    <n-col :span="12">
                        <n-statistic label="点数获取" :value="collectedMessageStatistic.score.toFixed()">
                            <template #prefix><n-icon><Network1/></n-icon></template>
                        </n-statistic>
                    </n-col>
                </n-row>
            </template>
        </MessageCard>
    </n-modal>
    <!-- <MessageList class="mainFlow" v-model:label="text.flowLabel[0]" :source="" :flow="0">
        <template #prefix>
            <StatusBar/>
        </template>
        <template #suffix>
        </template>
    </MessageList>-->
        <n-drawer v-model:show="showEditorDrawer" :width="windowWidth>500?500:windowWidth">
            <n-drawer-content :native-scrollbar="false">
                <template #header>
                    <n-page-header subtitle="用户重合度" @back="showEditorDrawer=false"></n-page-header>
                    <h1>{{ getUserName(appState.editingRelationship.i) }}↔{{ getUserName(appState.editingRelationship.j) }}={{ rGet(appState.editingRelationship.i,appState.editingRelationship.j).toFixed(2) }}</h1>
                </template>
                <div>
                    <n-flex vertical>
                        <n-button v-if="collectedMessage==undefined" @click="collectMessage(appState.editingRelationship.i,appState.editingRelationship.j)">搜索反例(-{{ searchCost }}<n-icon><Network1/>)</n-icon></n-button>
                        <n-button v-else @click="broadcastCollectedMessage" :type="'primary'">推送</n-button>
                        <MessageCard v-if="collectedMessage!=undefined" :msg="collectedMessage">
                            <template #action>
                            </template>
                        </MessageCard>
                    </n-flex>
                </div>
            </n-drawer-content>
        </n-drawer>
        <n-modal v-model:show="gameEnded" preset="card" style="margin: 60px;" :title="`游戏结束`" size="huge" :bordered="false" :mask-closable=false>
            <p>你耗尽了<Network1/>搜索点数。</p>
            <center><n-button @click="gameEnded=false;resetProgress();gameInit();">重新开始</n-button></center>
        </n-modal>
        <div style="position: fixed;right: 16px;top:16px; display: flex;flex-direction: column;gap:8px">
            <n-button @click="save" :type="'primary'">保存</n-button>
            <n-button @click="load" :type="'primary'">读取</n-button>
        </div>
        <div class="pagebottom" style="position: absolute;bottom: 0;left: 0;right: 0;">
            <div class="score" style="font-weight: bold;margin-top:auto">
                <n-icon><Time/></n-icon> {{ gameTime }} <n-icon><Network1/></n-icon> <n-number-animation :to="gameScore"/>
            </div>
            <!-- <n-flex vertical v-if="appState.mode=='broadcast'&&collectedMessage!=undefined">
                <MessageCard :msg="collectedMessage"/>
                <n-space :justify="'center'">
                    <n-button class="score" round size="large" @click="endBroadcastCollectedMessage" :disabled="appState.selectedUsers.length==0">完成</n-button>
                    <n-button class="score" round size="large" @click="exitBroadcastCollectedMessage">取消</n-button>
                </n-space>
            </n-flex> -->
            <div class="buttons" style="margin-top:auto">
                <n-button class="score" round size="large" @click="appState.paused=!appState.paused">{{appState.paused?'继续':'暂停'}} space</n-button>
            </div>
        </div>
</div>
</template>

<style>
body
{
    margin: 0;
    overflow: hidden;
    user-select: none;
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
    width: 300px;
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
    flex: 0;
    display:flex;
    justify-content:space-between;
    margin: 8px;
}
.score
{
    top:auto;
    bottom:0;
    background: white;
    /* box-shadow: 0 0 5px rgba(0,0,0,0.5); */
    border-radius: 20px;
    color:black;
    padding: 8px;
    text-wrap-mode: nowrap;
    text-align: center;
}
.mainFlow
{
    z-index:999;
    position:fixed;
    left:8px;
    top:8px;
    bottom: 8px;
    z-index:999;
}
@media screen and (max-width:600px) {
    .mainFlow
    {
        width: auto;
        top:auto;
        right: 8px;
        height: 30%;
    }
    .user-editor-message-list
    {
        display: flex;
        flex-direction: row;
        height: 100%;
        flex-wrap: wrap;
    }
}
</style>