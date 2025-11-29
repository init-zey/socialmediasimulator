import { emit } from "./event";
import { getUserName } from "./text";

export interface Message {id:number, a:number, i:number, j:number, v:number, t:number}

export interface Progress{
  userMemory: Record<number, Array<number>>;
  subjectiveUserGraph: Record<number, Record<string, number>>;
  messages: Array<Message>;
  userCount: number;
  userType: Array<number>;
  userLearnRate: Array<number>;
  userFlowTags: Array<Array<number>>;
  time: number;
  score: number;
}

export let debugMode = false;

export let progress:Progress = {
  userMemory: {},
  subjectiveUserGraph: {},
  messages: [],
  userType: [],
  userLearnRate: [],
  userCount: 0,
  userFlowTags: [],
  time: 0,
  score: 0
}

export function resetProgress()
{
  progress = {
    userMemory: {},
    subjectiveUserGraph: {},
    messages: [],
    userType: [],
    userLearnRate: [],
    userCount: 0,
    userFlowTags: [],
    time: 0,
    score: 0
  };
  emit("resetProgress");
}

export function setProgress(newProgress:Progress)
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

export function getSubjectUserGraph(user:number):Record<string,number>
{
  if (!(user in progress.subjectiveUserGraph))
  {
    progress.subjectiveUserGraph[user] = {};
  }
  return progress.subjectiveUserGraph[user];
}

export function rGetIn(a:number,b:number,graph:Record<string,number>):number
{
  if(a>b){
    return rGetIn(b,a,graph);
  }
  const k = a.toString(32)+'_'+b.toString(32);
  if (!(k in graph)) {
    return 0;
  }
  return graph[k];
}

export function rSetIn(a:number,b:number,v:number,graph:Record<string,number>)
{
  if(a>b) {
    rSetIn(b,a,v,graph);
    return;
  }
  const k = a.toString(32)+'_'+b.toString(32);
  graph[k] = v;
}

export function processPushTask(tasks:Array<number>,flow:number)
{
  for(let user=0;user<progress.userCount;user++)
  {
    if (progress.userType[user]!=0) continue;
    const flowTags = progress.userFlowTags[user];
    if (flow!=0&&(flowTags==undefined||!flowTags.includes(flow))) continue;
    for(let i=0;i<tasks.length;i++){
      pushMsgToUser(progress.messages[tasks[i]], user, tasks.length-i);
    }
  }
}

export function createMessage(a:number, i:number, j:number, v:number)
{
  const msg = {id:progress.messages.length,a,i,j,v,t:progress.time};
  progress.messages.push(msg);
  emit('addedMessage', msg);
}

function changeAttitude(user:number, a:number, b:number, d:number):number
{
  const graph = getSubjectUserGraph(user);
  const value=rGetIn(a,b,graph)+d;
  rSetIn(a,b,value,graph);
  return d;
}

function updateUser(user:number)
{
  console.log(`update ${user}`);
  const oxPairs:Array<string> = [];

  const G = getSubjectUserGraph(user);
  for(let t=0;t<3;t++)
  {
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
        let IPD = instabilityPartialD(o,x,G);
        if (o!=user) IPD *= (1-progress.userLearnRate[user]) * 0.5;
        if (x==user) IPD *= 0.5;
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
      const dAttitude = -Math.atan(maxIPD)/3.14;
      console.log(`Dmax|dG(${maxIPD_o},${maxIPD_x})=${maxIPD},dAttitude=${dAttitude}`);
      changeAttitude(user,maxIPD_o,maxIPD_x,dAttitude*(maxIPD_o==user?1:0.1));
      if (Math.abs(dAttitude)>0.4)
      {
        createMessage(user,maxIPD_o,maxIPD_x,dAttitude);
      }
      oxPairs.push(`${maxIPD_o}_${maxIPD_x}`);
    }
    else
    {
      return;
    }
  }
}

function instability(p:number)
{
  const G = getSubjectUserGraph(p);
  let s = 0;
  for(let x=0;x<progress.userCount;x++)
  {
    const Gpx = rGetIn(p,x,G);
    for(let o=x;o<progress.userCount;o++)
    {
      const Gpo = rGetIn(p,o,G);
      const Gox = rGetIn(o,x,G);
      const i = Gpo*Gox-Gpx;
      s+=i*i;
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

function instabilityPartialD(p:number,o:number,G:Record<string,number>)
{
  let d = 0;
  const Gpo = rGetIn(p,o,G);
  for(let x=0;x<progress.userCount;x++)
  {
    const Gox = rGetIn(o,x,G);
    const Gpx = rGetIn(p,x,G);
    d+=Gox*(Gpo*Gox-Gpx);
    d-=Gpx*Gox-Gpo;
  }
  const GooSub = rGetIn(o,o,G)-1;
  d-=Gpo*GooSub*GooSub;
  return d;
}

export function pushMsgToUser(msg:Message, user:number, exposure:number)
{
  if (user==msg.a) return;
  if(!(user in progress.userMemory))
  {
    progress.userMemory[user] = [];
  }
  progress.userMemory[user].push(msg.id);
  const graph = getSubjectUserGraph(user);
  const oldInstability = instability(user);
  const ox = rGetIn(msg.i,msg.j,graph);
  const lambda = progress.userLearnRate[user];
  rSetIn(msg.i,msg.j,ox+lambda*rGetIn(user,msg.a,graph)*(msg.v-ox),graph);
  const newInstability = instability(user);
  const d = oldInstability - newInstability;
  const views = Math.abs(d) * exposure;
  const likes = d>0?d:(Math.random()*Math.abs(d)*0.5) * exposure;
  emit('viewedMessage', msg.id, views);
  emit('likedMessage', msg.id, likes);
  emit('messageKnownExposure', msg.id, exposure);
  if (views > 1)
  {
    let responseContent = "";
    if (d > 0)
    {
      responseContent = "支持"
    }
    else
    {
      responseContent = "不支持";
    }
    emit('messageResponsed', msg.id, {author:user,content:responseContent})
  }
  emit('messageGainedScore', msg.id, Math.floor(views+likes));
}

export function updateUsers()
{
  for(let i=0;i<progress.userCount;i++)
  {
    if(progress.userType[i]!=0) continue;
    updateUser(i);
  }
}

export function getRepulsion(i:number, j:number):boolean
{
    const rij=(a:number,b:number)=>Math.abs(rGetIn(a,b,getSubjectUserGraph(a)))<0.5;
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

export function createUser(type:number,learnRate:number=0.5)
{
    const id = progress.userCount;
    progress.userCount += 1;
    progress.userType.push(type);
    progress.userLearnRate.push(learnRate);
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