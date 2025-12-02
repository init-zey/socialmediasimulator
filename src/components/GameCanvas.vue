<template>
<div class="canvas"
:style="{'background-size': 20*s+'px '+20*s+'px', 'background-position': x*s+'px '+y*s+'px'}">
<!-- outline: (appState?.selectedUsers.includes(user.id)?'3px':'2px') + ' solid '+ (appState?.focusedUser==user.id?'#ff0':`#000`),
            'border-radius': ((progress.userType[user.id]==0)?50:0)+'%', -->
    <div class="canvas-bg2" :style="{'background-size': 80*s+'px '+80*s+'px', 'background-position': x*s+'px '+y*s+'px'}"
    ></div>
    <div class="mouse-input-handler"
        @mousedown="onMousedown"
        @mouseup="onMouseup"
        @mousemove="onMousemove"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
        @pointermove="(e)=>pointerMoved(e.movementX,e.movementY)"
        @wheel="onWheel">
    </div>
    <CanvasUser v-for="user in users.filter(user=>userAvaliable(user.id)&&isUserInWindow(user))" :key="user.id"
        @pointerdown="draggingUser=user.id"
        @mousemove="(e:MouseEvent)=>pointerMoved(e.movementX,e.movementY)"
        @pointerup="draggingUser=-1"
        @touchstart="(e:TouchEvent)=>{
            const touch = e.touches[0];
            mouseX = touch.clientX;
            mouseY = touch.clientY;
        }"
        @touchmove="(e:TouchEvent)=>{
            const touch = e.touches[0];
            const dx = touch.clientX-mouseX;
            const dy = touch.clientY-mouseY;
            pointerMoved(dx,dy);
            mouseX=touch.clientX;
            mouseY=touch.clientY;
        }"
        @touchend="draggingUser=-1"
        :user="user" :selected="appState?.selectedUsers.includes(user.id)??false" :focused="appState?.focusedUser==user.id"
        :style="{left: calcX(user) + 'px', top: calcY(user) + 'px',
            'font-weight': appState?.selectedUsers.includes(user.id)?'600':'300',
            'opacity': progress.userLife[user.id]<0?1:progress.userLife[user.id],
            width:user.radius+'px', height:user.radius+'px', 'transform': `rotate(${user.a}deg)`}"
    />
    <canvas id="lines"/>
</div>
</template>

<script setup lang="ts">
import { getRepulsion, instability, progress, rGet, userAvaliable } from '../game'
import { defineModel, onMounted, Ref, ref } from 'vue'
import CanvasUser from './CanvasUser.vue'
import { emit, subscribe } from '../event'
import { AppState } from '@/App.vue';
function calcX(user:User)
{
    return (x.value + user.x) * s.value - user.radius*0.5 + user.dx;
}
function calcY(user:User)
{
    return (y.value + user.y) * s.value - user.radius*0.5 + user.dy;
}
function isUserInWindow(user:User)
{
    const scrX = calcX(user);
    const scrY = calcY(user);
    return scrX > -100 && scrX < window.innerWidth + 100 && scrY > -100 && scrY < window.innerHeight + 100;
}
export interface User {
    id: number;
    x: number;
    y: number;
    dx: number;
    dy: number;
    vx: number;
    vy: number;
    va: number;
    a: number;
    radius: number;
}
const users:Ref<Array<User>> = ref([]);

subscribe('resetProgress',()=>{
    users.value = [];
})

const appState = defineModel<AppState>();

const x = ref(window.innerWidth*0.5);
const y = ref(window.innerHeight*0.5);
const s = ref(1);
subscribe('userPressed', (id)=>
{
    // if (appState.value?.mode == 'user-edit') return;
    if (appState.value == undefined) return;
    if (progress.userType[id]!=0) return;
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
    draggingUser = -1;
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
    draggingUser = -1;
    if (appState.value == undefined) return;
    if (bgDownButtons == 1)
    {
        appState.value.selectedUsers = [];
        appState.value.focusedUser = -1;
    }
    if (multiSelecting && Math.abs(mouseX - multiSelectStartX) > 10 && Math.abs(mouseY - multiSelectStartY) > 10)
    {
        appState.value.selectedUsers = users.value.filter(user=>
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
        users.value.push({
            id,
            x: (id % 2) * 100,
            y: Math.floor(id / 2) * 100,
            dx: 0,
            dy: 0,
            vx: 0,
            vy: 0,
            va: 0,
            a: 0,
            radius: 40
        });
    });
    subscribe("removedUser", ()=>{
        users.value.pop();
    });
    subscribe("tryGetBroadcastCollectedMessageTargets", ()=>{
        if (appState.value == undefined) return;
        emit('getBroadcastCollectedMessageTargets',appState.value.selectedUsers);
        appState.value.selectedUsers = [];
        appState.value.focusedUser = -1;
    });
    window.addEventListener('keydown', (e)=>{
        if(e.key=='a')
        {
            x.value += 30;
            e.preventDefault();
        }
        else if(e.key=='d')
        {
            x.value -= 30;
            e.preventDefault();
        }
        else if(e.key=='w')
        {
            y.value += 30;
            e.preventDefault();
        }
        else if(e.key=='s')
        {
            y.value -= 30;
            e.preventDefault();
        }
        else if(e.key=='q')
        {
            changeScale(window.innerWidth*0.5,window.innerHeight*0.5,0.9);
            e.preventDefault();
        }
        else if(e.key=='e')
        {
            changeScale(window.innerWidth*0.5,window.innerHeight*0.5,1.1);
            e.preventDefault();
        }
    })
});

function physicsProcess()
{
    redraw();
    for (let i = 0; i < users.value.length; i++) {
        const a = users.value[i];
        a.radius = 40 + 10 * rGet(a.id, a.id);
        if (isNaN(a.radius)) a.radius = 40;
        if (a.radius > 50) a.radius = 50;
        if (a.radius < 30) a.radius = 30;
        if (progress.userType[a.id]==0)
        {
            const userInstability = instability(i,false);
            if (!isNaN(userInstability))
            {
                a.dx = userInstability*Math.random()*2;
                a.dy = userInstability*Math.random()*2;
                if (a.dx > 10)
                {
                    a.dx = 10;
                }
                else if (a.dx < 0)
                {
                    a.dx = 0;
                }
                if (a.dy > 10)
                {
                    a.dy = 10;
                }
                else if (a.dy < 0)
                {
                    a.dy = 0;
                }
            }
            else
            {
                a.dx = Math.random() * 10;
                a.dy = Math.random() * 10;
            }
        }
        for (let j = i + 1; j < users.value.length; j++) {
            const b = users.value[j];
            const repulsion = getRepulsion(i,j);
            let f = getForce(a.x, a.y, b.x, b.y, repulsion, repulsion?1:0.5, repulsion?0.5:0.5);
            a.vx += f.x;
            a.vy += f.y;
            b.vx -= f.x;
            b.vy -= f.y;
        }
    }
    Object.values(users.value).forEach(user=>
    {
        user.vx *= 1 - (0.2 * d);
        user.vy *= 1 - (0.2 * d);
        // user.vx -= user.x * 0.01 * d;
        // user.vy -= user.y * 0.01 * d;
        user.va -= user.vx * 0.05 * d;
        user.a += user.va * d;
        user.va *= 1-0.5*d;
        if (Math.abs(user.a) > 5)
        {
            user.a *= 1-0.1*d;
        }
        if (draggingUser == user.id) return;
        user.x += user.vx * d;
        user.y += user.vy * d;
    }
    )
}

function redraw()
{
    if (appState.value==undefined) return;
    linesCanvas.width = window.innerWidth;
    linesCanvas.height = window.innerHeight;
    for (let fromId=0;fromId<progress.userCount;fromId++)
    {
        if(!userAvaliable(fromId)) continue;
        const from = users.value[fromId];
        if (from==undefined) continue;
        for (let toId=fromId+1;toId<progress.userCount;toId++){
            if(!userAvaliable(toId)) continue;
            const to = users.value[toId];
            const rFT = rGet(fromId, toId);
            const rTF = rGet(fromId, toId);
            const opacity = (progress.userLife[fromId]<0?1:Math.min(progress.userLife[fromId],1)) * (progress.userLife[toId]<0?1:Math.min(progress.userLife[toId],1));
            let aFT = Math.abs(rFT);
            if (aFT > 1) aFT = 1;
            if (aFT < 0) aFT = 0;
            if (aFT > 0.5) {aFT = 1} else {aFT=0}
            aFT *= opacity;
            const minColorValue = '22';
            const styleFT = `#${(rFT<0)?'ff':'00'}${minColorValue}${(rFT>=0)?'ff':'00'}${Math.floor(aFT*255).toString(16).padStart(2,'0')}`;
            let aTF = Math.abs(rTF);
            if (aTF > 1) aTF = 1;
            if (aTF < 0) aTF = 0;
            if (aTF > 0.5) {aTF = 1} else {aTF=0}
            aTF *= opacity;
            const styleTF = `#${(rTF<0)?'ff':'00'}${minColorValue}${(rTF>=0)?'ff':'00'}${Math.floor(aTF*255).toString(16).padStart(2,'0')}`;
            const x1 = (from.x+x.value)*s.value;
            const y1 = (from.y+y.value)*s.value;
            const x2 = (to.x+x.value)*s.value;
            const y2 = (to.y+y.value)*s.value;
            const grd=linesCtx.createLinearGradient(x1, y1, x2, y2);
            grd.addColorStop(0,styleFT);
            grd.addColorStop(1,styleTF);
            linesCtx.strokeStyle = grd;
            linesCtx.beginPath();
            linesCtx.setLineDash([10, 3]);
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
let draggingUser = -1;
function pointerMoved(ex:number, ey:number)
{
    if (draggingUser != -1)
    {
        const user = users.value[draggingUser];
        user.x += ex / s.value;
        user.y += ey / s.value;
    }
}
</script>

<style scoped>
.canvas
{
    position: absolute;
    width: 100dvw;
    height: 100dvh;
    scroll-behavior:unset;
    background-image:
        linear-gradient(to right, #eeeeee, 1px, transparent 1px),
        linear-gradient(to bottom, #eeeeee, 1px, transparent 1px);
}
.canvas-bg2
{
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    background-image:
        linear-gradient(to right, gainsboro 1px, transparent 1px),
        linear-gradient(to bottom, gainsboro 1px, transparent 1px);
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