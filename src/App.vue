<script setup lang="ts">
import { nextTick, onMounted, Ref, ref, watch } from 'vue';
import GameCanvas from './components/GameCanvas.vue';
import MessageCard from './components/MessageCard.vue';
import { createUser, Message, progress, rSet, updateUsers, resetProgress, loadProgress, pushMsgToUser, rGet, createMessage, score, time, saveProgress } from './game';
import { emit, subscribe } from './event';
import { NPageHeader, NTag, NSpace, NDrawer, NDrawerContent, NButton, AutoCompleteInst, NDynamicTags, NModal, NIcon, NRow, NCol, NNumberAnimation, NStatistic, useMessage, NFlex, NCard, NDivider, NProgress } from 'naive-ui';
import { getUserName, loadText, processGenerateQueue, resetText, text } from './text';
import { startGenerateMessage } from './text';
import { View, ThumbsUp, AnalyticsReference, AiResultsHigh, Time, Network1 } from '@vicons/carbon'
import StatusBar from './components/StatusBar.vue';

const naiveMessage = useMessage();

const searchCost = 10;

const showHelp = ref(false);

function load()
{
    loadProgress();
    loadText();
    const appstateSource = localStorage.getItem('appstate');
    if (appstateSource != null)
    {
        appState.value = JSON.parse(appstateSource);
    }
    naiveMessage.success("已读取");
}

function save()
{
    localStorage.setItem('appstate', JSON.stringify(appState.value))
    saveProgress();
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
            e.preventDefault();
        }
    })
    gameInit();
    const delta = 10;
    setInterval(()=>{
        if (appState.value.paused||showStatistic.value) return;
        gameProcess(delta/1000);
    },delta);
});

export interface AppState {
    mode: "select-relationship" | "broadcast";
    editingRelationship: {i:number,j:number};
    paused: boolean;
    selectedUsers: Array<number>;
    focusedUser: number;
    collectColddown: number;
}

const appState:Ref<AppState> = ref({
    mode:'select-relationship',
    editingRelationship:{i:-1,j:-1},
    paused:true,
    selectedUsers: [],
    focusedUser: -1,
    collectColddown: 0
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
function collectMessage(i:number,j:number,v:number)
{
    collectedMessage.value = undefined;
    collectedMessage.value=createMessage(i,i,j,v)
    score.value -= searchCost;
}
watch(score,(newScore)=>{
    if (newScore <= searchCost)
    {
        gameEnded.value = true;
    }
})

const events:Record<number,()=>void> = {
    10: ()=>createUser(1,'年度游戏颁奖','',true)
}

function gameProcess(delta:number)
{
    const lastTime = Math.floor(time.value);
    time.value += delta;
    if (appState.value.collectColddown > 0)
    {
        appState.value.collectColddown -= delta;
    }
    if (Math.floor(time.value)-lastTime>0)
    {
        score.value -= 1;
        for(let eTime in events)
        {
            if (eTime == time.value.toFixed())
            {
                events[eTime]();
                naiveMessage.info("新事件发生了！");
            }
        }
    }
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
    for (let user=0;user<progress.userCount;user++)
    {
        if (progress.userType[user]!=0) continue;
        pushMsgToUser(collectedMessage.value,user);
    }
    rSet(collectedMessage.value.i,collectedMessage.value.j,collectedMessage.value.v);
    showStatistic.value = true;
    appState.value.paused = true;
    appState.value.mode = 'select-relationship';
    appState.value.collectColddown = 3;
}
subscribe('addedMessage', (msg:Message)=>startGenerateMessage(msg));
setInterval(() => {
    processGenerateQueue();
}, 100);
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
subscribe('messageGainedScore',(msgscore)=>{
    collectedMessageStatistic.value.score += msgscore;
    score.value += msgscore;
});
subscribe('messageResponsed',(author,response)=>{
    collectedMessageStatistic.value.responses[author]=response;
});
const gameEnded = ref(false);
subscribe('resetProgress', ()=>{
    appState.value={
        mode:'select-relationship',
        editingRelationship:{i:0,j:0},
        paused:true,
        selectedUsers: [],
        focusedUser: -1,
        collectColddown: 0
    };
    collectedMessageStatistic.value=createDefaultMessageStatistic();
    resetText();
});
function gameInit()
{
    for (let g=0;g<3;g++)
    {
        randomCreateTopic();
    }
    for (let i=0;i<progress.userCount;i++)
    {
        rSet(i,i,0);
    }
}
function randomCreateUser()
{
    createUser(0);
    let userId = progress.userCount-1;
    rSet(userId,Math.floor(userId*Math.random()),1);
    rSet(userId, userId, 0);
}
function randomCreateTopic()
{
    createUser(1);
    const s = progress.userCount;
    const size = 2+Math.ceil(Math.random()*3);
    for(let i=0;i<size;i++)
    {
        createUser(0);
        for (let j=0;j<s-1;j++)
        {
            if (progress.userType[j]==1)
            {
                rSet(s+i,j,(Math.floor(Math.random()*3)-1)*0.2);
            }
        }
        rSet(s+i,s-1,1);
    }
    for(let i=0;i<size;i++)
    {
        for(let j=0;j<size;j++)
        {
            rSet(s+i,s+j,Math.floor(Math.random()*3)-1);
        }
    }
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
                    <n-col :span="24">
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
                    <n-page-header subtitle="关系分析" @back="showEditorDrawer=false"></n-page-header>
                    <h1>{{ getUserName(appState.editingRelationship.i) }}与{{ getUserName(appState.editingRelationship.j) }}</h1>
                </template>
                <div>
                    <center v-if="appState.collectColddown>0">
                        <n-flex vertical>
                            <center>
                                <n-progress type="circle" :percentage="Math.ceil((1-appState.collectColddown/3)*100)"/>
                            </center>
                            冷却剩余 {{ appState.collectColddown.toFixed(1) }}s
                        </n-flex>
                    </center>
                    <n-flex v-else vertical>
                        <n-button v-if="collectedMessage==undefined" @click="collectMessage(appState.editingRelationship.i,appState.editingRelationship.j,1)">搜索正面极端(-{{ searchCost }}<n-icon><Network1/>)</n-icon></n-button>
                        <n-button v-if="collectedMessage==undefined" @click="collectMessage(appState.editingRelationship.i,appState.editingRelationship.j,-1)">搜索反面极端(-{{ searchCost }}<n-icon><Network1/>)</n-icon></n-button>
                        <n-button v-if="collectedMessage!=undefined" @click="broadcastCollectedMessage" :type="'primary'">推送</n-button>
                        <n-button v-if="collectedMessage!=undefined" @click="collectedMessage=undefined" :type="'primary'">取消</n-button>
                        <MessageCard v-if="collectedMessage!=undefined" :msg="collectedMessage">
                            <template #action>
                            </template>
                        </MessageCard>
                    </n-flex>
                </div>
            </n-drawer-content>
        </n-drawer>
        <n-modal v-model:show="gameEnded" preset="card" style="width: 500px;" :title="`游戏结束`" size="huge" :bordered="false" :mask-closable=false>
            <h3>你耗尽了<n-icon><Network1/></n-icon>，让平台拥有了<n-number-animation :to="progress.userCount"/>个用户。</h3>
            <template #action>
                <center><n-button @click="gameEnded=false;resetProgress();gameInit();">重新开始</n-button></center>
            </template>
        </n-modal>
        <div style="position: fixed;right: 16px;top:16px; display: flex;flex-direction: column;gap:8px">
            <n-button @click="save" :type="'primary'">保存</n-button>
            <n-button @click="load" :type="'primary'">读取</n-button>
            <n-button @click="showHelp=!showHelp" :type="'info'">查看帮助</n-button>
        </div>
        <div class="pagebottom" style="position: absolute;bottom: 0;left: 0;right: 0;">
            <div class="buttons" style="margin-top:auto">
                <n-button :type="'primary'" @click="randomCreateTopic();score-=200;">增加版面-200<n-icon><Network1/></n-icon></n-button>
                <n-button :type="'primary'" @click="randomCreateUser();score-=50;">吸引用户-50<n-icon><Network1/></n-icon></n-button>
                <div class="score" style="font-weight: bold;margin-top:auto">
                    <n-icon><Time/></n-icon> {{ time.toFixed() }} <n-icon><Network1/></n-icon> {{score }}
                </div>
            </div>
            <div style="margin-top: auto; font-weight: bold;">
                <div class="score">{{appState.collectColddown>0?`冷却剩余${appState.collectColddown.toFixed(1)}s`:'消息搜索已就绪'}}</div>
            </div>
            <div class="buttons" style="margin-top:auto">
                <n-button class="score" round size="large" @click="appState.paused=!appState.paused">{{appState.paused?'继续':'暂停'}} Space</n-button>
            </div>
        </div>
        <n-modal v-model:show="showHelp" style="width: auto; margin: auto;" title="帮助" preset="card">
            <p>我们的平台快要寿终正寝了，作为推送算法，我们该做点事情。</p>
            <p><n-icon><Network1/></n-icon>是你的<b>流量点数</b>，它是你最重要的资源，一旦耗尽，我们就没救了。</p>
            <p><n-icon><Network1/></n-icon>的数量显示在左下角。</p>
            <n-divider/>
            <p>你屏幕上的标签都是我们平台的<b>用户</b>，此外还有<b>#话题</b>。线条则是<b>关系</b>。</p>
            <p><span style="color:red">红色</span>=排斥，<span style="color:blue">蓝色</span>=认可。</p>
            <p>一旦你有足够多<n-icon><Network1/></n-icon>，就可以吸引更多<b>用户</b>，甚至添加新<b>话题</b>。</p>
            <n-divider/>
            <p>关系不只是两个用户之间的事情。</p>
            <p>在人类眼中，<span style="color:red">敌人</span>的<span style="color:red">敌人</span>是<span style="color:朋友">朋友</span>，<span style="color:blue">朋友</span>的<span style="color:blue">朋友</span>还是<span style="color:blue">朋友</span>。</p>
            <p>当事实与预期出现差距时，人类就会感到不平衡。</p>
            <p>大部分信息都很无聊，但你有个绝招。</p>
            <p>你能花费<n-icon><Network1/></n-icon>搜索并放大两个用户群之间的极端言论，制造更多变数。变数越大，浏览越多；越符合观看者的预期，点赞越多。</p>
            <p>浏览和点赞之和会转为<n-icon><Network1/></n-icon>。</p>
        </n-modal>
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
    pointer-events: none;
    flex: 0;
    display:flex;
    justify-content:space-between;
    margin: 8px;
}
.pagebottom > *
{
    pointer-events: auto;
}
.score
{
    top:auto;
    bottom:0;
    background: white;
    box-shadow: 0 0 3px rgba(0,0,0,0.5);
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