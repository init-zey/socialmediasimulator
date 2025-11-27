import { emit } from "./event";

export interface Message {id:number, i:number, j:number, v:number, t:number}

export interface Progress{
  userMemory: Record<number, Array<number>>;
  subjectiveUserGraph: Record<number, Record<string, number>>;
  messages: Array<Message>;
  userCount: number;
  userType: Array<number>;
  time: number;
}

export let progress:Progress = {
    userMemory: {},
    subjectiveUserGraph: {},
    messages: [],
    userType: [],
    userCount: 0,
    time: 0
}

export function setProgress(newProgress:Progress)
{
  emit("resetProgress");
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

export function processPushTask(tasks:Record<number,Array<number>>)
{
  for(const user in tasks){
    const userId = parseInt(user);
    for(const msgId in tasks[user])
    {
      const msg = progress.messages[msgId];
      pushMsgToUser(msg, userId);
    }
  }
}

export function createMessage(i:number, j:number, v:number)
{
  const msg = {id:progress.messages.length,i,j,v,t:progress.time};
  progress.messages.push(msg);
  emit('addedMessage', msg);
}

function changeAttitude(user:number, target:number, value:number):number
{
  const graph = getSubjectUserGraph(user);
  const d=value;
  rSetIn(user,target,rGetIn(user,target,graph)+value,graph);
  if (d>0.5) createMessage(user, target, value);
  return d;
}

function updateUser(user:number)
{
  console.log(`update ${user}`);
  let maxIPD = 0;
  let maxIPD_o = -1;
  for(let o=0;o<progress.userCount;o++)
  {
    const IPD = instabilityPartialD(user, o);
    console.log(`IPD(${user},${o})=${IPD}`);
    if (Math.abs(IPD) > Math.abs(maxIPD))
    {
      maxIPD = IPD;
      maxIPD_o = o;
    }
  }
  console.log(`maxIPD=${maxIPD},maxIPD_o=${maxIPD_o}`);
  if(maxIPD_o>=0)
  {
    if (maxIPD < 0.1) maxIPD = 0.1;
    if (maxIPD > 10) maxIPD = 10;
    changeAttitude(user, maxIPD_o, -2/maxIPD);
  }
}

// function instabilitydGpo(p:number,targetO:number, dGpo:number)
// {
//   const G = getSubjectUserGraph(p);
//   let s = 0;
//   for(let x=0;x<progress.userCount;x++)
//   {
//     const Gpx = rGetIn(p,x,G);
//     for(let o=0;o<progress.userCount;o++)
//     {
//       let Gpo = rGetIn(p,o,G);
//       if (o==targetO) Gpo+=dGpo;
//       const Gox = rGetIn(o,x,G);
//       const i = Gpo*Gox-Gpx;
//       s+=i*i/dGpo;
//     }
//   }
//   return s;
// }

// function instabilityPartialD(p:number,o:number)
// {
//   const dGpo = 0.01;
//   const pdir = instabilitydGpo(p,o,dGpo);
//   const ndir = instabilitydGpo(p,o,-dGpo);
//   return (pdir + ndir) * 0.5;
// }

function instabilityPartialD(p:number,o:number)
{
  const G = getSubjectUserGraph(p);
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

export function pushMsgToUser(msg:Message, user:number)
{
  if(!(user in progress.userMemory))
  {
    progress.userMemory[user] = [];
  }
  progress.userMemory[user].push(msg.id);
  const graph = getSubjectUserGraph(user);
  rSetIn(msg.i,msg.j,rGetIn(msg.i,msg.j,graph)+msg.v,graph);
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

export function createUser(type:number)
{
    const id = progress.userCount;
    progress.userCount += 1;
    progress.userType.push(type);
    emit("createdUser",id);
}

export function removeUser()
{
  progress.userCount -= 1;
  progress.userType.pop();
  emit("removedUser");
}

export default {}