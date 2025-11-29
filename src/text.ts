import { emit } from "./event"
import { Message, progress } from "./game"
import { chat } from "./llm"

export interface UserText {
    name:string,
    prompt:string
}
export interface MessageText {
    content: string,
    time: string,
    minimumVersion: string
}

export let text:{
    userTexts:Array<UserText>,
    messageTexts:Array<MessageText>,
    generateQueue:Array<number>,
    flowLabel:Array<string>
}={
    userTexts: [],
    messageTexts: [],
    generateQueue: [],
    flowLabel: ['主推送流']
}

export function loadText()
{
    const textSource = localStorage.getItem('text');
    if (textSource != null)
    {
        text = JSON.parse(textSource);
    }
}

export function resetText()
{
    text = {
        userTexts: [],
        messageTexts: [],
        generateQueue: [],
        flowLabel: ['主推送流']
    }
}

function getUserText(id:number):UserText
{
    if (id >= 0 && id < text.userTexts.length) return text.userTexts[id];
    return {
        name: '',
        prompt: ''
    }
}

export function getUserName(id:number):string
{
    if (id<0 || id>=text.userTexts.length) return id.toString();
    return text.userTexts[id].name
}

function getFullUserPrompt(id:number)
{
    // const basicPrompt = getUserText(id).prompt;
    let historyContainer = "";
    if (id in progress.userMemory && progress.userMemory[id].length>0)
    {
        historyContainer = `你需要参考的信息：[${progress.userMemory[id].filter(m=>m<text.messageTexts.length).map(m=>text.messageTexts[m].minimumVersion).join()}]。`;
    }
    return `${historyContainer}`;
}

const traits:Array<string> = ["神经质","幽默","严肃"];

function randomPick(arr:Array<string>):string
{
    return arr[Math.floor(Math.random()*traits.length)];
}

function getRelationshipDiffDescribe(relationship:number,other:string):string
{
    if (relationship > 0.5) return `对${other}的认同`;
    if (relationship < 0.5) return `反对${other}`;
    return `对社交媒体平台推送机制的反感`;
}
function getRelationshipDescribe(relationship:number):string
{
    if (relationship > 0.5) return "认同";
    if (relationship < 0.5) return "排斥";
    return "不感兴趣";
}

function getMessageContentPrompt(msg:Message):string
{
    return `扮演一名社交媒体用户虚构贴文。你的个性：${randomPick(traits)}。${getFullUserPrompt(msg.i)}要求1：长度1句话。要求2：站在${getUserText(msg.i).prompt}的视角表达你${getRelationshipDiffDescribe(msg.v,getUserText(msg.j).prompt)}。`;
}
function getMessageMinimumVersionPrompt(content:string):string
{
    return `[${content}]一句话总结这篇社媒博文。`;
}

let generating = false;

export async function processGenerateQueue()
{
    if (generating || text.generateQueue == undefined || text.generateQueue.length==0) return;
    const msg = text.generateQueue[0];
    if (msg==undefined) return;
    console.log("生成新消息");
    generating = true;
    if (text.messageTexts.length - 1 < msg)
    {
        text.messageTexts.push({
            content: "",
            minimumVersion: "",
            time:""
        });
    }
    // const content = await chat(getMessageContentPrompt(progress.messages[msg]));
    // const title = await chat(getMessageTitlePrompt(content));
    const msgObj = progress.messages[msg];
    if(msgObj!=undefined)
    {
        let describe = '不感兴趣'
        if (msgObj.v>0.1) describe='认同';
        if (msgObj.v<-0.1) describe='反对';
        const content = `${msgObj.i==msgObj.a?'我':getUserName(msgObj.i)}对${msgObj.j==msgObj.a?'我自己':getUserName(msgObj.j)}${describe}。`;
        const minimumVersion = await chat(getMessageMinimumVersionPrompt(content));
        text.messageTexts[msg] = {content, minimumVersion, time:getTimeText(msgObj.t)}
        emit("generatedMessage", msg, content);
        text.generateQueue.shift();
    }
    generating = false;
    console.log("消息生成完毕");
}

export async function startGenerateMessage(msg:Message)
{
    if (text.generateQueue != undefined && (msg.id>=text.messageTexts.length || text.messageTexts[msg.id].content == ''))
    {
        text.generateQueue.push(msg.id);
    }
}

const weekdays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export function getTimeText(time:number)
{
    const day = time + 100;
    const year = ((day / 365) + 22).toFixed();
    const month = (day % 365 / 12).toFixed();
    const weekday = day % 7;
    return (Math.random()*12).toFixed()+':'+(Math.random()*60).toFixed()+' '+(Math.random()>0.5?'P':'A')+'M'+' • '+`${weekdays[weekday]} ${month}, ${year}`
}

export function getResponse(user:number, msg:Message, dInstability:number)
{
    const d = -dInstability;
    if (d>0.2)
    {
        return "👍";
    }
    else if (d>0.4)
    {
        return "🤣";
    }
    else if (d<-0.2)
    {
        return "😡";
    }
    else if (d<-0.4)
    {
        return "😅";
    }
    else
    {
        return "👀";
    }
}