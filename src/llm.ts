import OpenAI from "openai"

const client = new OpenAI({
    apiKey: "sk-uFDUPAriuBg6l84rhrFxcRect2V0gpH59KVXj8dxG6wblr5p",
    baseURL: "http://localhost:8080/llmapi",
    dangerouslyAllowBrowser: true
})

function delay(ms:number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function chat(msg:string)
{
    // await delay(100);
    // return msg;
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const completion = await client.chat.completions.create({
                model: "kimi-k2-turbo-preview",
                messages: [
                    {"role": "system", "content": msg},
                ],
                temperature: 0.6,
            })
            return completion.choices[0].message.content??"";
        }
        catch (e)
        {
            await delay(5000);
            console.error(e);
        }
    }
    return "";
}