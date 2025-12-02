import { emit, subscribe } from "./event"

export interface Mission {
    maxProgress: number,
    reward:()=>void,
    title:string,
    desc:string
}

export const missions:Record<string,Mission> = {
    'start1': {
        maxProgress: 1,
        reward:()=>{
            emit('addMission', 'start2');
        },
        title: "选择任意关系",
        desc: "通过单击连续选择两个用户。"
    },
    'start2': {
        maxProgress: 20,
        reward:()=>{
            emit('addMission', 'start3');
        },
        title: "获取点数",
        desc: "重复刚才的操作，搜索并推送极端言论，初次获得20个点数。"
    },
    'start3': {
        maxProgress: 1,
        reward:()=>{
            emit('addStoreItem', {
                name:'接入平台',
                desc:'当你做好准备，就使用这个。',
                effectdesc:'初始化游戏。',
                cost:0,
                effect: 'start',
                count:1
            });
            emit('addMission', 'start4');
        },
        title: "自动平衡",
        desc: "点击右下角的按钮，让时间开始流逝。"
    },
    'start4': {
        maxProgress: 1,
        reward:()=>{
            
        },
        title: "接入平台",
        desc: "在左下角打开平台策略面板，使用“接入平台”。"
    }
}