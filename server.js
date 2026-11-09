/** No-password QR Code Studio + public no-key REST API. Deploy with rate limits. */
'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawn,spawnSync}=require('node:child_process');
const {InputError,requestOptions,generateSVG,BODIES,FRAMES,BALLS}=require('./qr-service');
const root=path.resolve(__dirname,'public');
const port=Number(process.env.PORT||4173);
const host=process.env.HOST||'127.0.0.1';
const rateLimit=Math.max(5,Math.min(300,Number(process.env.RATE_LIMIT_PER_MINUTE||60)));
const requestLimit=1024*1024;
const allowedOrigins=(process.env.CORS_ORIGINS||'*').split(',').map(x=>x.trim()).filter(Boolean);
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml; charset=utf-8','.ico':'image/x-icon'};
const hits=new Map();
function send(res,status,data,type='text/plain; charset=utf-8'){
 res.statusCode=status;res.setHeader('Content-Type',type);res.end(data);
}
function json(res,status,obj){send(res,status,JSON.stringify(obj),MIME['.json']);}
function cors(req,res){const origin=req.headers.origin;
 if(allowedOrigins.includes('*'))res.setHeader('Access-Control-Allow-Origin','*');
 else if(origin&&allowedOrigins.includes(origin)){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
 res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Max-Age','86400');
}
function limited(req,res){const ip=req.socket.remoteAddress||'unknown',now=Date.now();
 if(hits.size>20000)for(const [k,v] of hits)if(v.expire<now)hits.delete(k);
 const t=hits.get(ip)||{expire:now+60000,count:0};if(t.expire<now){t.expire=now+60000;t.count=0;}t.count++;hits.set(ip,t);
 if(t.count>rateLimit){res.setHeader('Retry-After',String(Math.ceil((t.expire-now)/1000)));json(res,429,{error:'rate_limit',message:'Too many QR requests'});return true;}
 return false;
}
function readJSON(req){return new Promise((resolve,reject)=>{
 let bytes=0,chunks=[],rejected=false;req.on('data',b=>{if(rejected)return;bytes+=b.length;if(bytes>requestLimit){rejected=true;reject(new InputError('JSON payload exceeds 1MB'));return;}chunks.push(b);});
 req.on('end',()=>{try{const s=Buffer.concat(chunks).toString('utf8');const value=JSON.parse(s);if(!value||typeof value!=='object'||Array.isArray(value))throw new InputError('Request body must be a JSON object');resolve(value);}catch(e){reject(e instanceof InputError?e:new InputError('Malformed JSON'));}});
 req.on('error',reject);});}
function findRenderCommand(size){
 const configured=process.env.SVG_RENDERER;
 if(configured==='none')return null;
 const list=configured?[configured]:process.platform==='win32'?['inkscape','rsvg-convert']:['rsvg-convert','inkscape'];
 for(const cmd of list){try{const r=spawnSync(cmd,['--version'],{timeout:1800,stdio:'ignore'});if(r.status===0)return cmd;}catch{}}
 return null;
}
let rasterizer;
function pngFromSVG(svg,size){
 if(rasterizer===undefined)rasterizer=findRenderCommand(size);
 if(!rasterizer)return Promise.reject(Object.assign(new Error('PNG renderer is unavailable: install librsvg2-bin or Inkscape, or use SVG API'),{statusCode:503}));
 const isRsvg=path.basename(rasterizer).startsWith('rsvg');
 const cmd=isRsvg?['-f','png','-w',String(size),'-h',String(size)]:['--pipe','--export-type=png','--export-filename=-','--export-width='+size];
 return new Promise((resolve,reject)=>{
 const child=spawn(rasterizer,cmd,{stdio:['pipe','pipe','pipe'],windowsHide:true});const parts=[];let total=0,err='';
 const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Object.assign(new Error('PNG conversion timeout'),{statusCode:503}));},20000);
 child.stdout.on('data',b=>{total+=b.length;if(total>18*1024*1024){child.kill('SIGKILL');return;}parts.push(b);});
 child.stderr.on('data',b=>{err+=b.toString().slice(0,2000);});
 child.on('error',e=>{clearTimeout(timer);reject(e);});
 child.on('close',code=>{clearTimeout(timer);const buf=Buffer.concat(parts);if(code===0&&buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))resolve(buf);else reject(Object.assign(new Error('PNG renderer failed: '+err.slice(0,200)),{statusCode:503}));});
 child.stdin.on('error',()=>{});child.stdin.end(svg);
 });
}
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','SAMEORIGIN');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
 res.setHeader('Cache-Control','no-store');
 let url;try{url=new URL(req.url,'http://localhost');}catch{return json(res,400,{error:'bad_url'});}
 const pathname=url.pathname,method=req.method||'GET',api=pathname.startsWith('/api/')||pathname==='/qr/custom';
 if(api){cors(req,res);
  if(method==='OPTIONS'){res.statusCode=204;res.end();return;}
  if(pathname==='/api/v1/health'&&method==='GET')return json(res,200,{ok:true,name:'Juba QR Studio',version:'2.0.0'});
  if(pathname==='/api/v1/shapes'&&method==='GET')return json(res,200,{body:BODIES,eye:FRAMES,eyeBall:BALLS,formats:['svg','png'],limits:{size:{min:200,max:3000},dataBytes:2500}});
  if(pathname==='/api/v1/qr'||pathname==='/qr/custom'){
   if(method!=='GET'&&method!=='POST')return json(res,405,{error:'method_not_allowed'});
   if(limited(req,res))return;
   try{let args;
    if(method==='GET'){
     args=Object.fromEntries(url.searchParams);
     if(args.config!==undefined){try{args.config=JSON.parse(args.config);}catch{throw new InputError('config must be valid JSON');}}
    }else{
     if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))throw new InputError('Content-Type must be application/json');
     args=await readJSON(req);
    }
    const opts=requestOptions(args),svg=generateSVG(opts);
    const data=opts.file==='svg'?Buffer.from(svg,'utf8'):await pngFromSVG(svg,opts.size);
    res.setHeader('Content-Type',opts.file==='svg'?'image/svg+xml; charset=utf-8':'image/png');
    res.setHeader('Content-Disposition',`${opts.download?'attachment':'inline'}; filename="juba-qr-studio.${opts.file}"`);
    res.setHeader('Content-Length',data.length);res.statusCode=200;res.end(data);return;
   }catch(e){return json(res,e.statusCode||500,{error:e.statusCode===400?'invalid_request':'render_failed',message:e.statusCode?e.message:'Unexpected QR renderer error'});}
  }
  return json(res,404,{error:'not_found'});
 }
 if(method!=='GET'&&method!=='HEAD')return send(res,405,'Method not allowed');
 const name=pathname==='/'?'/index.html':pathname;
 let full;try{full=path.resolve(root,'.'+decodeURIComponent(name));}catch{return send(res,400,'Invalid path');}
 if(!full.startsWith(root+path.sep)||!Object.hasOwn(MIME,path.extname(full)))return send(res,404,'Not found');
 try{const data=await fs.promises.readFile(full);res.setHeader('Content-Type',MIME[path.extname(full)]);res.setHeader('Content-Length',data.length);res.statusCode=200;return res.end(method==='HEAD'?undefined:data);}catch{return send(res,404,'Not found');}
});
if(require.main===module){server.listen(port,host,()=>console.log(`Juba QR Studio running at http://${host}:${port} (no password)`));}
module.exports={server,pngFromSVG};
