import { ref } from "vue";
import { emit } from "./event";
import { getBubbleText, getResponse, getUserName, text, topicNames } from "./text";
import userNames from "./userNames";

export interface Message {id:number, a:number, i:number, j:number, v:number, t:number}

export interface Progress{
  userMemory: Record<number, Array<number>>;
  userGraph: Record<string, number>;
  messages: Array<Message>;
  userCount: number;
  userType: Array<number>;
  userFlowTags: Array<Array<number>>;
}

export let debugMode = false;

export let progress:Progress = {
  userMemory: {},
  userGraph: {},
  messages: [],
  userType: [],
  userCount: 0,
  userFlowTags: []
}
export const time= ref(0);
export const score= ref(100);

export function resetProgress()
{
  progress = {
    userMemory: {},
    userGraph: {},
    messages: [],
    userType: [],
    userCount: 0,
    userFlowTags: []
  };
  time.value = 0;
  score.value = 100;
  emit("resetProgress");
}

export function loadProgress()
{
  resetProgress();
  const progressSource = localStorage.getItem('progress');
  if (progressSource != null)
  {
    setProgress(JSON.parse(progressSource));
  }
  time.value = parseInt(localStorage.getItem("time")??"0");
  score.value = parseInt(localStorage.getItem("score")??"0");
}

export function saveProgress()
{
  localStorage.setItem('progress', JSON.stringify(progress));
  localStorage.setItem('time', time.value.toString());
  localStorage.setItem('score', score.value.toString());
}

function setProgress(newProgress:Progress)
{
  resetProgress();
  progress = newProgress;
  for(let i=0;i<progress.userCount;i++)
  {
    emit("createdUser",i);
  }
  progress.messages.forEach(msg => {
    emit('addedMessage', msg);
  });
}

export function rGet(a:number,b:number):number
{
  return rGetIn(a,b,progress.userGraph);
}
function rGetIn(a:number,b:number,G:Record<string,number>):number
{
  if (a>b) return rGetIn(b,a,G);
  const k = a.toString(32)+'_'+b.toString(32);
  if (!(k in G)) {
    return 0;
  }
  return G[k];
}

export function rSet(a:number,b:number,v:number)
{
  rSetIn(a,b,v,progress.userGraph);
}
function rSetIn(a:number,b:number,v:number,G:Record<string,number>)
{
  if (a>b)
  {
    rSetIn(b,a,v,G);
    return;
  }
  const k = a.toString(32)+'_'+b.toString(32);
  G[k] = v;
}

export function createMessage(a:number, i:number, j:number, v:number)
{
  const msg = {id:progress.messages.length,a,i,j,v,t:time.value};
  progress.messages.push(msg);
  emit('addedMessage', msg);
  return msg;
}

function changeAttitude(a:number, b:number, d:number):number
{
  const oldValue=rGet(a,b);
  const newValue=oldValue+d;
  rSet(a,b,newValue);
  const i = a;
  const j = b;
  if (progress.userType[i]==0 && progress.userType[j]==0)
  {
    const bubbleText = getBubbleText(i,j,newValue,oldValue);
    if (bubbleText != '')
    {
      emit('userBubbleText',i,bubbleText.replace('OTHER',getUserName(j)));
      emit('userBubbleText',j,bubbleText.replace('OTHER',getUserName(i)));
    }
  }
  return d;
}

function updateUser(user:number,delta:number)
{
  // const ipds:Record<number,number> = {};
  // let norm = 0;
  // for(let o=user;o<progress.userCount;o++)
  // {
  //   const grad = -ipds[o]/norm;
  // }
}

export function instability(p:number,log:boolean=false)
{
  let s = 0;
  const Gpp = rGet(p,p);
  for(let x=0;x<progress.userCount;x++)
  {
    const Gpx = rGet(p,x);
    for(let o=0;o<progress.userCount;o++)
    {
      const Gpo = rGet(p,o);
      const Gox = rGet(o,x);
      // const i = Gpx*Gpo*Gox-Gpp;
      const i = Gpx*Gpo*Gox-Gpp;
      if(log)
      {
        console.log(`Gpo=${Gpo}`)
        console.log(`Gox=${Gox}`)
        console.log(`Gpx=${Gpx}`)
        console.log(`i(p=${p},o=${o},x=${x})=${i}`)
      }
      s-=Math.min(i,0);
    }
  }
  return s;
}

// function instabilityPartialD(p:number,o:number)
// {
//   const dGpo = 0.01;
//   const pdir = instabilitydGpo(p,o,dGpo);
//   const ndir = instabilitydGpo(p,o,-dGpo);
//   return (pdir + ndir) * 0.5;
// }

function instabilityPartialD(p:number,o:number)
{
  let d = 0;
  const Gpp = rGet(p,p);
  const Gpo = rGet(p,o);
  for(let x=0;x<progress.userCount;x++)
  {
    const Gox = rGet(o,x);
    const Gpx = rGet(p,x);
    const i1=-Math.min(Gpo*Gox*Gpx-Gpp,0);
    const dGpo = 0.01;
    let i2 = 0;
    const Gpo2 = Gpo+dGpo;
    if (x==o)
    {
      if (p==x)
      {
        //-min(Gpo*Gpo*Gpo-Gpo,0)
        i2=Gpo2*Gpo2*Gpo2-Gpo2;
      }
      else
      {
        //-min(Gox*Gpo^2-Gpp,0)
        i2=Gox*Gpo2*Gpo2-Gpp;
      }
    }
    else
    {
      if (p==o)
      {
        //-min(Gox*Gpx*Gpo-Gpo,0)
        i2=Gox*Gpx*Gpo2-Gpo2;
      }
      else
      {
        //-min(Gox*Gpx*Gpo-Gpp,0)
        i2=Gox*Gpx*Gpo2-Gpp;
      }
    }
    i2=-Math.min(i2,0);
    d+=(i2-i1)/dGpo;
  }
  return d;
}

export async function pushMsgToUser(msg:Message, user:number)
{
  if (user==msg.a) return;
  if(!(user in progress.userMemory))
  {
    progress.userMemory[user] = [];
  }
  progress.userMemory[user].push(msg.id);
  const oldGij = rGet(msg.i,msg.j);
  const oldInstability = instability(user);
  rSet(msg.i,msg.j,msg.v);
  const newInstability = instability(user);
  rSet(msg.i,msg.j,oldGij);
  const d = newInstability - oldInstability;
  changeAttitude(user,user,Math.abs(d)*0.01);
  const views = Math.abs(d);
  const likes = d>0?d:(Math.random()*Math.abs(d)*0.5);
  emit('viewedMessage', views);
  emit('likedMessage', likes);
  if (views > 0.1)
  {
    emit('messageResponsed',user,getResponse(user, msg, d))
  }
  emit('messageGainedScore',Math.ceil((Math.abs(d)+Math.max(d,0))*4));
}

export function updateUsers(delta:number)
{
  for(let p=0;p<progress.userCount;p++)
  {
    if(progress.userType[p]!=0) continue;
    let maxIpo = -1;
    let maxIpo_o = -1;
    for(let o=p;o<progress.userCount;o++)
    {
      // if(progress.userType[o]==1)
      // {
      //   if (Math.abs(rGet(p,o))<0.6)
      //   {
      //     changeAttitude(p,o,rGet(p,o)*(1-delta));
      //     continue;
      //   }
      // }
      const ipo = -instabilityPartialD(p,o);
      if (Math.abs(ipo) > Math.abs(maxIpo))
      {
        maxIpo = ipo;
        maxIpo_o = o;
      }
    }
    if (maxIpo_o >= 0)
    {
      changeAttitude(p,maxIpo_o,delta*maxIpo);
    }
    // updateUser(i,delta);
  }
  // applyChange();
}

export function getRepulsion(i:number, j:number):boolean
{
    const rij=(a:number,b:number)=>Math.abs(rGet(a,b))<0.5;
    let repulsion = rij(i,j);
    if (!repulsion)
    {
        let innerRepulsion = false;
        for(let d=1;d<j-i&&!innerRepulsion;d++)
        {
            innerRepulsion = !rij(i,i+d)&&!rij(i+d,j);
        }
        let outterRepulsion = false;
        for(let d=1;d<i-j+progress.userCount&&!outterRepulsion;d++)
        {
            let o = j+d;
            if (o >= progress.userCount)
            {
                o -= progress.userCount;
            }
            outterRepulsion = !rij(o,i)&&!rij(j,o);
        }
        repulsion = innerRepulsion && outterRepulsion;
    }
    return repulsion;
}

export function createUser(type:number,name:string='',prompt:string='',randomRelationship:boolean=false)
{
    const id = progress.userCount;
    progress.userCount += 1;
    progress.userType.push(type);
    if(name=='')
    {
      text.userTexts.push({
        name: type==0?userNames[id]:topicNames[id%topicNames.length],
        prompt: ''
      });
    }
    else
    {
      text.userTexts.push({name,prompt})
    }
    if(randomRelationship)
    {
      for(let i=0;i<progress.userCount;i++)
      {
        if (progress.userType[i]==0)
        {
          const r = Math.random();
          if (r < 0.33)
          {
            rSet(i,id,0.6);
            emit('userBubbleText',i,'同感');
          }
          else if (r > 0.66)
          {
            rSet(i,id,-0.6);
            emit('userBubbleText',i,'什么鬼');
          }
          else
          {
            emit('userBubbleText',i,'不感兴趣');
          }
        }
      }
    }
    emit("createdUser",id);
}

export function removeUser()
{
  progress.userCount -= 1;
  progress.userType.pop();
  emit("removedUser");
}

export default {}

export function executeCommand(cmd:string[])
{
  if (cmd[0]=='debug')
  {
    debugMode = !debugMode;
  }
}