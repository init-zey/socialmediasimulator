import { emit } from "./event";

export interface Message {id:number, i:number, j:number, v:number, t:number}

export interface Progress{
  userGraph: Record<string, number>;
  userSize: Record<number, number>;
  userMemory: Record<number, Array<number>>;
  messages: Array<Message>;
  userCount: number;
  time: number;
}

export let progress:Progress = {
    userGraph: {},
    userSize: {},
    userMemory: {},
    messages: [],
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

export function rGet(a:number,b:number)
{
  if(a>b){
    return rGet(b,a);
  }
  const k = a.toString(32)+'_'+b.toString(32);
  if (!(k in progress.userGraph)) {
    return 0;
  }
  return progress.userGraph[k];
}

export function rSet(a:number,b:number,v:number)
{
  if(a>b) {
    rSet(b,a,v);
    return;
  }
  const k = a.toString(32)+'_'+b.toString(32);
  progress.userGraph[k] = v;
}

function balance(po:number, px:number, ox:number):{newPx:number, newPo:number}
{
  // const newPx = (Math.abs(px) + ox * Math.abs(po)) / (Math.abs(px) + Math.abs(po));
  // return {
  //   newPx: newPx,
  //   newPo: ox * newPx
  // }
  let newPx = px;
  let newPo = po;
  if (po!=0&&ox!=0) newPx = 1/po/ox;
  if (px!=0&&ox!=0) newPo = 1/px/ox;
  return {newPx, newPo};
}

function changeAttitude(user:number, target:number, value:number):number
{
  const d = value - rGet(user, target);
  rSet(user, target, value);
  return d;
}

export function processPushTask(task:Record<number,Array<number>>)
{
  for(const user in task){
    const userId = parseInt(user);
    const diffrence:Record<number, number>={};
    for(const msgId in task[user])
    {
      const msg = progress.messages[msgId];
      const {dpx, dpo} = pushMsgToUser(msg, userId);
      diffrence[msg.i]=dpo;
      diffrence[msg.j]=dpx;
    }
    for(const other in diffrence)
    {
      if (other == user) continue;
      const diff = diffrence[other];
      if (Math.abs(diff) >= 0.5) createMessage(userId, parseInt(other), diff);
    }
  }
}

export function createMessage(i:number, j:number, v:number)
{
  const msg = {id:progress.messages.length,i,j,v,t:progress.time};
  progress.messages.push(msg);
  emit('addedMessage', msg);
}

export function pushMsgToUser(msg:Message, user:number):{dpx:number,dpo:number}
{
  if(!(user in progress.userMemory))
  {
    progress.userMemory[user] = [];
  }
  progress.userMemory[user].push(msg.id);
  console.log(progress.userMemory);
  const {newPx, newPo} = balance(rGet(user, msg.i), rGet(user, msg.j), msg.v);
  return {
    dpx:changeAttitude(user, msg.j, newPx),
    dpo:changeAttitude(user, msg.i, newPo)
  };
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

export function createUser()
{
    const id = progress.userCount;
    progress.userCount += 1;
    emit("createdUser",id);
}

export default {}