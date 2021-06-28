import {parse} from "https://deno.land/std/flags/mod.ts";
import {getMean} from "./utils.ts";
import {brightWhite as wf,
        brightBlack as bf,
        bgGreen as gb,
        bgRed as rb,
        bgWhite as wb,
        bgBrightYellow as yb} from "https://deno.land/std/fmt/colors.ts";
import {delay} from "https://deno.land/std/async/mod.ts";
import {exists} from "https://deno.land/std/fs/mod.ts";

const configData:Record<string,any>={
    a: {
        name: "",
        url: ""
    },
    b: {
        name: "",
        url: ""
    },
    concurrency: 10,
    progressUpdateInterval: 500,
    method: "GET",
    delay: 25,
    json: undefined,
    urlEncoded: undefined,
    file: undefined,
    fd: undefined
};

const resultData:Record<string,any>={
    a: {
        count: 0,
        result: 0,
        errors: 0
    },
    b: {
        count: 0,
        result: 0,
        errors: 0
    }
}

const enc=new TextEncoder();
//const PROGRESS_DELIM="  "+yb(wf("« ═ »"))+"  ";
const PROGRESS_DELIM="   ";
let readyWorkers=0;

async function buildSUTData() {
    const args=parse(Deno.args);
    if(args._.length<2) {
        printError("Usage: deno run app.ts name1=URL1 name2=URL2 [-c <concurrency>] [-m <method>] [-j <json body] [-f <file to upload>]");
        Deno.exit(1);
    }
    const at=typeof args._[0] === "string" ? args._[0].split("="): [];
    if(at.length==2) {
        configData.a.name=at[0];
        configData.a.url=at[1];
    }
    const bt=typeof args._[1] === "string" ? args._[1].split("="): [];
    if(bt.length==2) {
        configData.b.name=bt[0];
        configData.b.url=bt[1];
    }

    if(!configData.a.name || !configData.b.name) {
        printError("Name must be specified");
        Deno.exit(1);
    }

    if(configData.a.name.length>5 || configData.b.name.length>5) {
        printError("Name can be upto 5 characters");
        Deno.exit(1);
    }

    if(args.c && Number(args.c))
        configData.concurrency=Number(args.c);

    if(args.j) {
        try {
            JSON.parse(args.j);
        } catch(err) {
            printError("JSON is not valid");
            Deno.exit(1);
        }
        configData.json=args.j;
        configData.method="POST";
    }

    if(args.f) {
        if(!await exists(args.f)) {
            printError(`File ${args.f} doesn't exist`);
            Deno.exit(1);
        }
        try {
            await Deno.stat(args.f);
            configData.file=args.f;
            configData.method="POST";
        } catch(err) {
            printError(`File ${args.f} is inaccessible (error ${err.message})`);
            Deno.exit(1);
        }
    }

    if(args.u) {
        configData.urlEncoded=args.u;
        configData.method="POST";
    }

    if(args.d) {
        configData.fd=args.d;
        configData.method="POST";
    }
}

function printHeader() {
    console.log("");
    console.log(yb(bf(`${configData.concurrency} concurrent connections, method ${configData.method}`)));
    console.log("");
}

function printReading(name:string, data:Record<string,number>) {
    let o:string=" ";
    o+=name.toUpperCase()+" ";
    o+="lat="+data.result+"ms";
    o+=" for reqs="+data.count;
    o+=" ";
    return o;    
}

function printGreen(name:string, data:Record<string,number>) {
    return gb(wf(printReading(name, data)));
}

function printRed(name:string, data:Record<string,number>) {
    return rb(wf(printReading(name, data)));
}

function printError(message:string) {
    console.error(rb(wf("ERROR: "))+message);
}

function printProgress() {
    let o:string='\r';
    o+=yb(bf((Date.now()-startTS)+" ms"))+"  ";
    if(resultData.a.result < resultData.b.result) {
        o+=printGreen(configData.a.name, resultData.a);
        o+=PROGRESS_DELIM;
        o+=printRed(configData.b.name, resultData.b);
    } else {
        o+=printGreen(configData.b.name, resultData.b);
        o+=PROGRESS_DELIM;
        o+=printRed(configData.a.name, resultData.a);
    }
    Deno.stdout.write(enc.encode(o));
}

function handleUpdate(type:string, data:any) {
    if(typeof data === 'string' && data === 'READY') {
        readyWorkers++;
        return;
    }
    const d=resultData[type];
    d.result=getMean(d.result, data.latency, d.count);
    ++d.count;
}

function handleError(type:string, message:string) {
    if(message.includes('Connection reset by peer (os error 54)') ||
       message.includes('connection closed before message completed')) {
        ++resultData[type].errors;
        return;
    }
    printError(message);
    Deno.exit(1);
}

function startWorkers() {
    for(let i=0; i<configData.concurrency; i++) {
        const aw=new Worker(new URL("./worker.ts", import.meta.url).href, {type: "module", name: 'a'+i, deno: true});
        const bw=new Worker(new URL("./worker.ts", import.meta.url).href, {type: "module", name: 'b'+i, deno: true});
        const wd:Record<string,any>={  
            method: configData.method, 
            url: configData.a.url, 
            delay: configData.delay};
        if(configData.json)
            wd.json=configData.json;
        if(configData.urlEncoded)
            wd.urlEncoded=configData.urlEncoded;
        if(configData.file)
            wd.file=configData.file;
        if(configData.fd)
            wd.fd=configData.fd;
        aw.postMessage(wd);
        bw.postMessage(Object.assign({}, wd, {url: configData.b.url}));
        aw.onmessage=e=>handleUpdate('a', e.data);
        bw.onmessage=e=>handleUpdate('b', e.data);
        aw.onerror=e=>handleError('a', e.message);
        bw.onerror=e=>handleError('b', e.message);
    }
}

await buildSUTData();
console.log(wb(bf(`Initializing ${configData.concurrency} workers ....`)));
startWorkers();
while(1) {
    await delay(500);
    if(readyWorkers === configData.concurrency*2)
        break;
}
console.log(wb(bf(`Initialized ${configData.concurrency} workers ....`)));
const startTS=Date.now();
printHeader();
setInterval(() => printProgress(), configData.progressUpdateInterval);
