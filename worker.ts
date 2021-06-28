import {getMean, getContentType} from "./utils.ts";
import {delay} from "https://deno.land/std/async/mod.ts";
import {readableStreamFromReader} from "https://deno.land/std/io/mod.ts";

let latency:number=0;

self.onmessage=async (msg:any) => {
    const options=msg.data;
    self.postMessage("READY");
    runTest(options);
}

function sendProgress() {
    self.postMessage({name, latency});
}

async function runTest(options: any) {
    setInterval(() => sendProgress(), 200);
    let count=0;
    options.fileSize=options.file?(await Deno.stat(options.file)).size:undefined;
    while(1) {
        const timeTaken=await runHTTPTest(options);
        latency=getMean(latency, timeTaken, count);
        ++count;
        await delay(options.delay);
    }
}

async function runHTTPTest(options:any) {
    const fetchParams: RequestInit={
        method: options.method,
        redirect: 'follow'
    }
    if(options.json) {
        fetchParams.headers={};
        fetchParams.headers['Content-Type']='application/json';
        fetchParams.body=options.json;
    } else if(options.fd) {
        const fields=options.fd.split(";"), formData = new FormData();
        for(const field of fields) {
            const tokens=field.split('=');
            if(tokens.length == 2)
                formData.append(tokens[0], tokens[1]);
        }
        fetchParams.body=formData;
    } else if(options.file) {
        const f=await Deno.open(options.file);
        fetchParams.body=readableStreamFromReader(f);
        fetchParams.headers={};
        fetchParams.headers['Content-Type']=getContentType(options.file);
        fetchParams.headers['Content-Length']=options.fileSize;
    }
    const beforeTS=performance.now();
    const res=await fetch(options.url, fetchParams);
    await res.text();
    const diffTS=performance.now()-beforeTS;
    return diffTS;
}