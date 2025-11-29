import { emit } from "./event";
import { getResponse, getUserName } from "./text";

export interface Message {id:number, a:number, i:number, j:number, v:number, t:number}

export interface Progress{
  userMemory: Record<number, Array<number>>;
  userGraph: Record<string, number>;
  messages: Array<Message>;
  userCount: number;
  userType: Array<number>;
  userAttention: Array<Record<number,number>>;
  userFlowTags: Array<Array<number>>;
  time: number;
  score: number;
}

let userGraphChange:Record<string, number>={};

export let debugMode = false;

export let progress:Progress = {
  userMemory: {},
  userGraph: {},
  messages: [],
  userType: [],
  userAttention: [],
  userCount: 0,
  userFlowTags: [],
  time: 0,
  score: 1000
}

export function resetProgress()
{
  progress = {
    userMemory: {},
    userGraph: {},
    messages: [],
    userType: [],
    userAttention: [],
    userCount: 0,
    userFlowTags: [],
    time: 0,
    score: 1000
  };
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
  if (a>b) return rGet(b,a);
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
  const msg = {id:progress.messages.length,a,i,j,v,t:progress.time};
  progress.messages.push(msg);
  emit('addedMessage', msg);
  return msg;
}

function changeAttitude(a:number, b:number, d:number):number
{
  const value=rGetIn(a,b,userGraphChange)+d;
  rSetIn(a,b,value,userGraphChange);
  return d;
}

function updateUser(user:number,delta:number)
{
  const oxPairs:Array<string> = [];
  let maxIPD_o = -1;
  let maxIPD_x = -1;
  let maxIPD = 0;
  for(let o=0;o<progress.userCount;o++)
  {
    for(let x=o;x<progress.userCount;x++)
    {
      if (oxPairs.includes(`${o}_${x}`))
      {
        continue;
      }
      const IPD = instabilityPartialD(o,x);
      // if (o!=user) IPD *= (1-progress.userLearnRate[user]);
      // if (x==user) IPD *= 0.5;
      if (Math.abs(IPD) > Math.abs(maxIPD))
      {
        maxIPD = IPD;
        maxIPD_o = o;
        maxIPD_x = x;
      }
    }
  }
  if(maxIPD_o>=0)
  {
    const dAttitude = -1/maxIPD;
    changeAttitude(maxIPD_o,maxIPD_x,delta*dAttitude);
    oxPairs.push(`${maxIPD_o}_${maxIPD_x}`);
  }
}

function applyChange()
{
  for(const k in userGraphChange)
  {
    const v = userGraphChange[k];
    progress.userGraph[k] += v;
  }
  userGraphChange = {};
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
      const i = Gpx*Gpo*Gox+Gpp;
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
  // if (Gpo == 0) return 0;
  for(let x=0;x<progress.userCount;x++)
  {
    const Gox = rGet(o,x);
    const Gpx = rGet(p,x);
    if (Gpo*Gox*Gpx+Gpp>=0) continue;
    if (x==o)
    {
      if (p==x)
      {
        d-=3*Gpo*Gpo+1;
      }
      else
      {
        d-=2*Gox*Gpo;
      }
    }
    else
    {
      if (p==o)
      {
        //GpoGoxGpx-Gpo^3
        d-=Gox*Gpx+1
      }
      else
      {
        d-=Gox*Gpx;
      }
    }
    // if (Gox==0) continue;
    // const Gpx = rGet(p,x);
    // d+=Gox*(Gpo*Gox-Gpx);
    // d-=Gpx*Gox-Gpo;
  }
  // const GooSub = rGet(o,o)-1;
  // d-=Gpo*GooSub*GooSub;
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
  console.log(d);
  const views = Math.abs(d);
  const likes = d>0?d:(Math.random()*Math.abs(d)*0.5);
  emit('viewedMessage', views);
  emit('likedMessage', likes);
  if (views > 0.1)
  {
    emit('messageResponsed',user,getResponse(user, msg, d))
  }
  emit('messageGainedScore',Math.floor(views+likes));
}

export function updateUsers(delta:number)
{
  for(let i=0;i<progress.userCount;i++)
  {
    if(progress.userType[i]!=0) continue;
    updateUser(i,delta);
  }
  applyChange();
}

export function getRepulsion(i:number, j:number):boolean
{
    const rij=(a:number,b:number)=>rGet(a,b)<0.5;
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

export function createUser(type:number,learnRate:number=0.8)
{
    const id = progress.userCount;
    progress.userCount += 1;
    progress.userType.push(type);
    progress.userAttention.push({});
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