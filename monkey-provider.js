/** QRCode Monkey upstream adapter. Not affiliated with QRCode Monkey GmbH.
 * Direct endpoint is community-documented, not an officially guaranteed free API.
 * Official provider lists RapidAPI for commercial/professional API access.
 */
(function (root) {
 'use strict';
 const BASE = 'https://api.qr-code-monkey.com';
 const FORMATS = ['svg','png','pdf','eps'];
 const CTYPE = {svg:'image/svg+xml',png:'image/png',pdf:'application/pdf',eps:'application/postscript'};
 const BODY = ['square','mosaic','dot','circle','circle-zebra','circle-zebra-vertical','circular','edge-cut','edge-cut-smooth','japnese','leaf','pointed','pointed-edge-cut','pointed-in','pointed-in-smooth','pointed-smooth','round','rounded-in','rounded-in-smooth','rounded-pointed','star','diamond'];
 const EYES = ['frame0','frame1','frame2','frame3','frame4','frame5','frame6','frame7','frame8','frame10','frame11','frame12','frame13','frame14','frame16'];
 const BALLS = ['ball0','ball1','ball2','ball3','ball5','ball6','ball7','ball8','ball10','ball11','ball12','ball13','ball14','ball15','ball16','ball17','ball18','ball19'];
 const COLORS = ['bodyColor','bgColor','eye1Color','eye2Color','eye3Color','eyeBall1Color','eyeBall2Color','eyeBall3Color','gradientColor1','gradientColor2'];
 const FLIPS = ['erf1','erf2','erf3','brf1','brf2','brf3'];
 const configFields = new Set(['body','eye','eyeBall','gradientType','gradientOnEyes','logo','logoMode',...COLORS,...FLIPS]);
 function invalid(message){const e=new Error(message);e.statusCode=400;return e;}
 function validOptions(req){
  if(!req||typeof req!=='object'||Array.isArray(req))throw invalid('Request must be a JSON object');
  if(typeof req.data!=='string'||!req.data||new TextEncoder().encode(req.data).length>2500)throw invalid('data must be a nonempty UTF-8 string up to 2500 bytes');
  const size=req.size===undefined?1000:Number(req.size);
  if(!Number.isInteger(size)||size<200||size>3000)throw invalid('size must be between 200 and 3000');
  const file=String(req.file||'svg').toLowerCase();if(!FORMATS.includes(file))throw invalid('file must be svg, png, pdf, or eps');
  const cfg=req.config==null?{}:req.config;
  if(typeof cfg!=='object'||Array.isArray(cfg))throw invalid('config must be an object');
  const config={};
  for(const [name,value] of Object.entries(cfg)){
   if(!configFields.has(name))continue;
   if(name==='body'||name==='eye'||name==='eyeBall'){
    const choices=name==='body'?BODY:name==='eye'?EYES:BALLS;
    if(!choices.includes(value))throw invalid(`Unknown Monkey ${name} template: ${value}`);
   }else if(COLORS.includes(name)){
    if(typeof value!=='string'||!/^#[a-fA-F0-9]{6}$/.test(value))throw invalid(`Invalid color ${name}`);
   }else if(FLIPS.includes(name)){
    if(!Array.isArray(value)||value.length>2||value.some(x=>x!=='fh'&&x!=='fv'))throw invalid(`Invalid ${name}`);
   }else if(name==='gradientType'){
    if(!['linear','radial'].includes(value))throw invalid('gradientType must be linear or radial');
   }else if(name==='gradientOnEyes'){
    if(typeof value!=='boolean')throw invalid('gradientOnEyes must be boolean');
   }else if(name==='logoMode'){
    if(!['clean','default'].includes(value))throw invalid('logoMode must be clean or default');
   }else if(name==='logo'){
    if(value!=='' && (typeof value!=='string'||!/^#[a-zA-Z0-9_-]{1,40}$/.test(value)))throw invalid('Only Monkey built-in logo identifiers (#name) are supported by this proxy. Local uploaded logos use the local renderer.');
   }
   config[name]=value;
  }
  const provider=req.provider||'auto';if(!['auto','monkey','local'].includes(provider))throw invalid('provider must be auto, monkey, or local');
  return {data:req.data,size,file,config,provider,download:req.download===true||req.download==='true'};
 }
 function isBinary(bytes,file){
  if(file==='png')return bytes.length>80&&bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
  let s=new TextDecoder('utf-8').decode(bytes.slice(0,300)).trimStart().replace(/^<\?xml[^>]*\?>\s*/,'');
  if(file==='svg')return s.startsWith('<svg')||s.startsWith('<!--')&&s.includes('<svg');
  if(file==='pdf')return s.startsWith('%PDF-');
  if(file==='eps')return s.startsWith('%!PS-');
  return false;
 }
 async function requestImage(raw,{apiKey='',rapidapiUrl='',timeoutMs=5200,fetcher=fetch}={}){
  const opts=validOptions(raw);
  if(opts.provider==='local')return {success:false,why:'local_mode'};
  const base=(apiKey&&rapidapiUrl)?rapidapiUrl.replace(/\/$/,''):BASE;
  // Configured paid gateway must be a RapidAPI HTTPS host, never a client-supplied URL.
  if(apiKey&&rapidapiUrl&&!/^https:\/\/[a-z0-9-]+\.p\.rapidapi\.com$/i.test(base))throw invalid('Invalid server RapidAPI host configuration');
  const headers={'Content-Type':'application/json','Accept':'image/svg+xml,image/png,application/pdf,application/postscript'};
  if(apiKey&&rapidapiUrl){headers['X-RapidAPI-Key']=apiKey;headers['X-RapidAPI-Host']=new URL(base).hostname;}
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const result=await fetcher(`${base}/qr/custom`,{method:'POST',headers,body:JSON.stringify({data:opts.data,size:opts.size,file:opts.file,download:false,config:opts.config}),signal:controller.signal});
   if(!result.ok)return {success:false,why:'upstream_http_'+result.status,status:result.status};
   const bytes=new Uint8Array(await result.arrayBuffer());
   if(bytes.byteLength>12*1024*1024)return {success:false,why:'upstream_response_too_large'};
   if(!isBinary(bytes,opts.file))return {success:false,why:'upstream_invalid_image'};
   return {success:true,bytes,format:opts.file,contentType:CTYPE[opts.file],source:apiKey&&rapidapiUrl?'monkey-rapidapi':'monkey-direct'};
  }catch(e){return {success:false,why:e?.name==='AbortError'?'upstream_timeout':'upstream_network_error'};}
  finally{clearTimeout(timer);}
 }
 const api={BASE,FORMATS,CTYPE,BODY,EYES,BALLS,validOptions,requestImage};
 root.MonkeyProvider=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);