<template>
<div class="canvas"
:style="{'background-size': 20*s+'px '+20*s+'px', 'background-position': x*s+'px '+y*s+'px'}">
    <div class="mouse-input-handler" @mousedown="onMousedown" @mouseup="onMouseup" @mousemove="onMousemove" @touchstart="onTouchStart" @touchend="onTouchEnd" @touchmove="onTouchMove" @wheel="onWheel"></div>
    <CanvasUser v-for="user in state.users" :key="user.id"
    :id="user.id" :x="user.x" :y="user.y" :px="x" :py="y" :ps="s" :selected="appState?.selectedUsers.includes(user.id)??false" :focused="appState?.focusedUser==user.id"
    />
    <canvas id="lines"/>
</div>
</template>

<script setup lang="ts">
import { debugMode, getRepulsion, progress, rGet } from '../game'
import { defineModel, onMounted, Ref, ref } from 'vue'
import CanvasUser from './CanvasUser.vue'
import { emit, subscribe } from '../event'
import { AppState } from '@/App.vue';
type User = {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
};
const state:Ref<{
    users: Array<User>
}> = ref({
  users: [],
})

subscribe('resetProgress',()=>{
    state.value = {
        users: []
    };
})

const appState = defineModel<AppState>();

const x = ref(0);
const y = ref(0);
const s = ref(1);
subscribe('userPressed', (id)=>
{
    // if (appState.value?.mode == 'user-edit') return;
    if (appState.value == undefined) return;
    let selectedUsers = appState.value.selectedUsers;
    if (appState.value?.mode == 'select-relationship')
    {
        if (selectedUsers.includes(id))
        {
            if (appState.value.focusedUser != id)
            {
                appState.value.focusedUser = id;
            }
            else
            {
                appState.value.selectedUsers = selectedUsers.filter(i=>i!=id);
                appState.value.focusedUser = -1;
            }
        }
        else{
            appState.value.focusedUser = id;
            selectedUsers.push(id);
            if (selectedUsers.length==2)
            {
                const i=selectedUsers[0];
                const j=selectedUsers[1];
                if(appState.value.focusedUser==i)
                {
                    emit('relationSelected',i,j);
                }
                else
                {
                    emit('relationSelected',j,i);
                }
                appState.value.focusedUser = -1;
                appState.value.selectedUsers = [];
            }
        }
    }
    else
    {
        if (selectedUsers.includes(id))
        {
            appState.value.selectedUsers = selectedUsers.filter(i=>i!=id);
        }
        else
        {
            appState.value.selectedUsers.push(id);
        }
    }
})

let multiSelecting = false;
let multiSelectStartX = 0;
let multiSelectStartY = 0;
let mouseX = 0;
let mouseY = 0;
let touchStartX = 0;
let touchStartY = 0;
let touchStartCanvasX = 0;
let touchStartCanvasY = 0;
let touchesDistance = -1;

function onTouchStart(e: TouchEvent)
{
    e.preventDefault();
    if (e.touches.length == 1)
    {
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchStartCanvasX = x.value;
        touchStartCanvasY = y.value;
    }
}

function onTouchEnd(e: TouchEvent)
{
    e.preventDefault();
    if (e.touches.length == 0)
    {
        touchesDistance = -1;
    }
}

function onTouchMove(e: TouchEvent)
{
    e.preventDefault();
    if (e.touches.length == 1 && touchesDistance == -1)
    {
        const touch = e.touches[0];
        mouseX = touch.clientX;
        mouseY = touch.clientY;
        x.value = mouseX - touchStartX + touchStartCanvasX;
        y.value = mouseY - touchStartY + touchStartCanvasY;
    }
    else if (e.touches.length == 2)
    {
        const x1 = e.touches[0].clientX;
        const y1 = e.touches[0].clientY;
        const x2 = e.touches[1].clientX;
        const y2 = e.touches[1].clientY;
        const d = Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
        if (touchesDistance>0)
        {
            let delta = (d - touchesDistance) * 0.01;
            if (delta < -1)
            {
                delta = -1;
            }
            if (delta > 1)
            {
                delta = 1;
            }
            delta += 1;
            // if (delta < 0)
            // {
            //     delta += 1;
            // }
            changeScale((x1+x2)/2, (y1+y2)/2, delta);
        }
        touchesDistance = d;
    }
}

function onMousemove(e:any)
{
    if (e.buttons==4) {
        x.value += e.movementX / s.value;
        y.value += e.movementY / s.value;
    }
    mouseX = e.clientX;
    mouseY = e.clientY;
    multiSelecting = appState.value?.mode=="broadcast" && e.buttons==1;
}

function onMousedown(e:any)
{
    if (e.buttons==1)
    {
        multiSelecting = appState.value?.mode=="broadcast";
        multiSelectStartX=e.clientX;
        multiSelectStartY=e.clientY;
    }
    bgDownButtons = e.buttons;
}

let bgDownButtons = 0;


function onMouseup(e:any)
{
    if (appState.value == undefined) return;
    if (bgDownButtons == 1)
    {
        appState.value.selectedUsers = [];
        appState.value.focusedUser = -1;
    }
    if (multiSelecting && Math.abs(mouseX - multiSelectStartX) > 10 && Math.abs(mouseY - multiSelectStartY) > 10)
    {
        appState.value.selectedUsers = state.value.users.filter(user=>
        {
            if (appState.value == undefined) return;
            const ux = (user.x + x.value) * s.value;
            const uy = (user.y + y.value) * s.value;
            let newSelecteState = e.shiftKey?appState.value.selectedUsers.includes(user.id):false;
            if (((ux > multiSelectStartX && ux < mouseX) || (ux > mouseX && ux < multiSelectStartX))
            && ((uy > multiSelectStartY && uy < mouseY) || (uy > mouseY && uy < multiSelectStartY)))
            {
                newSelecteState = true;
            }
            return newSelecteState;
        }).map(user=>user.id);
    }
    multiSelecting = false;
}

function changeScale(mx:number, my:number, delta:number)
{

    let s1 = s.value;
    let mx1 = mx / s1 - x.value;
    let my1 = my / s1 - y.value;
    s.value *= delta;
    let s2 = s.value;
    let mx2 = mx / s2 - x.value;
    let my2 = my / s2 - y.value;
    x.value += mx2 - mx1;
    y.value += my2 - my1;
}

function onWheel(e:any)
{
    let delta = e.wheelDelta * 0.01;
    if (delta < 0)
    {
        delta += 2.0;
    }
    if (delta < 0 || delta > 2.0) return;
    changeScale(e.clientX, e.clientY, delta);
}

let linesCanvas:any;
let linesCtx:any;

const idealDist = 150;
const delta = 1/60;
const stepLength = 100;
const d = delta * stepLength;

function getForce(ax:number, ay:number, bx:number, by:number, repulsion:boolean, idealDistScale:number, strengthScale:number) {
    const dx = bx - ax;
    const dy = by - ay;
    const ls = dx * dx + dy * dy;
    const l = Math.sqrt(ls);
    const tl = idealDist * idealDistScale;
    const s = 15 * strengthScale;
    let f = s * (l - tl) / ls * d;
    if (repulsion && l >= tl)
    {
        f = 0;
    }
    return {
        x: dx * f,
        y: dy * f
    }
}

onMounted(()=>{
    linesCanvas = document.getElementById('lines');
    linesCtx = linesCanvas.getContext("2d");
    setInterval(physicsProcess,delta*1000);
    subscribe("createdUser", (id:number)=>{
        state.value.users.push({
            id: id,
            x: (id % 2) * 100,
            y: Math.floor(id / 2) * 100,
            vx: 0,
            vy: 0
        });
    });
    subscribe("removedUser", ()=>{
        state.value.users.pop();
    });
    subscribe("tryGetBroadcastCollectedMessageTargets", ()=>{
        if (appState.value == undefined) return;
        emit('getBroadcastCollectedMessageTargets',appState.value.selectedUsers);
        appState.value.selectedUsers = [];
        appState.value.focusedUser = -1;
    })
});

function physicsProcess()
{
    const users = state.value.users;
    for (let i = 0; i < progress.userCount-1; i++) {
        const a = users[i];
        for (let j = i + 1; j < progress.userCount; j++) {
            const b = users[j];
            const repulsion = getRepulsion(i,j);
            let f = getForce(a.x, a.y, b.x, b.y, repulsion, repulsion?1:0.5, repulsion?0.5:0.5);
            a.vx += f.x;
            a.vy += f.y;
            b.vx -= f.x;
            b.vy -= f.y;
        }
    }
    Object.values(state.value.users).forEach(user=>
        {
            user.vx *= 1 - (0.2 * d);
            user.vy *= 1 - (0.2 * d);
            user.vx -= user.x * 0.01 * d;
            user.vy -= user.y * 0.01 * d;
            user.x += user.vx * d;
            user.y += user.vy * d;
        }
    )
    redraw();
}

function redraw()
{
    if (appState.value==undefined) return;
    linesCanvas.width = window.innerWidth;
    linesCanvas.height = window.innerHeight;
    for (let fromId=0;fromId<progress.userCount;fromId++)
    {
        const from = state.value.users[fromId];
        if (from==undefined) continue;
        for (let toId=fromId+1;toId<progress.userCount;toId++){
            const to = state.value.users[toId];
            const rFT = rGet(fromId, toId);
            const rTF = rGet(fromId, toId);
            let aFT = Math.abs(rFT);
            if (aFT > 1) aFT = 1;
            if (aFT < 0) aFT = 0;
            // if (aFT > 0.2) {aFT = 1} else {aFT=0}
            const styleFT = `#${(rFT<0)?'ff':'00'}00${(rFT>=0)?'ff':'00'}${Math.floor(aFT*255).toString(16).padStart(2,'0')}`;
            let aTF = Math.abs(rTF);
            if (aTF > 1) aTF = 1;
            if (aTF < 0) aTF = 0;
            // if (aTF > 0.2) {aTF = 1} else {aTF=0}
            const styleTF = `#${(rTF<0)?'ff':'00'}00${(rTF>=0)?'ff':'00'}${Math.floor(aTF*255).toString(16).padStart(2,'0')}`;
            const x1 = (from.x+x.value)*s.value;
            const y1 = (from.y+y.value)*s.value;
            const x2 = (to.x+x.value)*s.value;
            const y2 = (to.y+y.value)*s.value;
            const grd=linesCtx.createLinearGradient(x1, y1, x2, y2);
            grd.addColorStop(0,styleFT);
            grd.addColorStop(1,styleTF);
            linesCtx.strokeStyle = grd;
            linesCtx.beginPath();
            linesCtx.moveTo(x1, y1);
            linesCtx.lineTo(x2, y2);
            linesCtx.stroke();
        }
    }
    // for(let i=0;i<progress.userCount;i++)
    // {
    //     for(let j=i+1;j<progress.userCount;j++)
    //     {
    //         const from = state.value.users[i];
    //         const to = state.value.users[j];
    //         const repulsion = getRepulsion(i,j);
    //         const style = `#00ff00${(!repulsion)?'ff':'00'}`;
    //         linesCtx.strokeStyle = style;
    //         linesCtx.beginPath();
    //         linesCtx.moveTo((from.x+x.value)*s.value, (from.y+y.value)*s.value);
    //         linesCtx.lineTo((to.x+x.value)*s.value, (to.y+y.value)*s.value);
    //         linesCtx.stroke();
    //     }
    // }
    const w = mouseX-multiSelectStartX;
    const h = mouseY-multiSelectStartY;
    if (multiSelecting && Math.abs(w) > 10 && Math.abs(h) > 10)
    {
        linesCtx.rect(multiSelectStartX, multiSelectStartY, w, h);
        linesCtx.fillStyle = '#00000033';
        linesCtx.fill();
    }
}

</script>

<style scoped>
.canvas
{
    position: absolute;
    width: 100vw;
    height: 100vh;
    scroll-behavior:unset;
    background-image:
    linear-gradient(to right, gainsboro 1px, transparent 1px),
    linear-gradient(to bottom, gainsboro 1px, transparent 1px);
}
.bg
{
    position: absolute;
    width: 100%;
    height: 100%;
}
.mouse-input-handler
{
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}
</style>