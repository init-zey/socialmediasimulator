import { emit } from "./event"
import { Message, progress } from "./game"
import { chat } from "./llm"

export interface UserText {
    name:string,
    prompt:string
}
export interface MessageText {
    title: string,
    content: string,
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

function getMessageTitlePrompt(content:string):string
{
    return `[${content}]扮演作者，选择1个短语作为标题，不要出现任何标点符号。`;
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
            title: "",
            content: "",
            minimumVersion: ""
        });
    }
    // const content = await chat(getMessageContentPrompt(progress.messages[msg]));
    // const title = await chat(getMessageTitlePrompt(content));
    const msgObj = progress.messages[msg];
    if(msgObj!=undefined)
    {
        let describe = '不感兴趣'
        if (msgObj.v>0.5) describe='认同';
        if (msgObj.v<-0.5) describe='反对';
        const content = `${getUserName(msgObj.i)}对${getUserName(msgObj.j)}${describe}。`;
        const title = "消息"+msg.toString();
        const minimumVersion = await chat(getMessageMinimumVersionPrompt(content));
        text.messageTexts[msg] = {title, content, minimumVersion}
        localStorage.setItem('text', JSON.stringify(text));
        emit("generatedMessage", msg, title, content);
        text.generateQueue.shift();
    }
    generating = false;
    console.log("消息生成完毕");
}

export async function startGenerateMessage(msg:Message)
{
    if (text.generateQueue != undefined && (msg.id>=text.messageTexts.length || text.messageTexts[msg.id].title == ''))
    {
        text.generateQueue.push(msg.id);
    }
}

