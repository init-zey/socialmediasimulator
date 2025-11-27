const events:Record<string, Record<string, (...params:any[])=>void>> = {}
export function subscribe(event:string, action:(...params:any[])=>void):number
{
    if (!(event in events))
    {
        events[event] = {}
    }
    const key = Object.keys(events[event]).length-1;
    events[event][key] = action;
    return key;
}
export function desubscribe(event:string, key:number):void
{
    if (event in events)
    {
        delete events[event][key];
    }
}
export function emit(event:string, ...args:any[]):void
{
    if (event in events)
    {
        Object.values(events[event]).forEach(action => {
            action(...args);
        });
    }
}