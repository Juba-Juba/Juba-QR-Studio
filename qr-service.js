/** Pure QR generation engine used by the public REST endpoints. */
'use strict';
const QRCore = require('./public/assets/qr-encoder');
const QRRenderer = require('./public/assets/qr-renderer');
const BODIES=['square','mosaic','dots','circles','horizontal','vertical','rounded','classy','classy-rounded','leaf','blob','star','pixel','stripe','diamond','extra-rounded','small-square','slant','cross','rhombus','sparkles','arrow'];
const FRAMES=['square','rounded','extra-rounded','left-cut','frame-dots','leaf','squircle','frame-pixels','soft','frame-dashed','double','circle','pill','right-cut','open'];
const BALLS=['square','rounded','extra-rounded','small-square','dots','ball-clipped','ball-pixel','ball-blocks','flower','leaf','vertical','horizontal','circle','pill','ball-edges','diamond','ball-squircle','star'];
class InputError extends Error {constructor(message){super(message);this.statusCode=400;}}
function validColor(v,k){if(typeof v!=='string'||!/^#[0-9A-F]{6}$/i.test(v))throw new InputError(`${k} must be a #RRGGBB color`);return v.toUpperCase();}
function choice(value,arr,key){if(!arr.includes(value))throw new InputError(`${key} must be one of: ${arr.join(', ')}`);return value;}
function shape(s,arr,kind){if(s==null||s==='')return arr[0]; if(kind==='eye'&&/^frame\d+$/.test(s))s=arr[Number(s.slice(5))];if(kind==='eyeBall'&&/^ball\d+$/.test(s))s=arr[Number(s.slice(4))]; if(kind==='body'&&s==='circle')s='circles';if(kind==='body'&&s==='rounded-pointed')s='rhombus';return choice(s,arr,kind);}
function settings(raw={}){
 if(raw==null)raw={};if(typeof raw!=='object'||Array.isArray(raw))throw new InputError('config must be a JSON object');
 const get=(k,f)=>raw[k]===undefined?f:raw[k];
 const fg=validColor(get('bodyColor',get('fg','#202E25')),'bodyColor');
 const bg=validColor(get('bgColor',get('bg','#FFFFFF')),'bgColor');
 const hasGradient=raw.gradientColor1!==undefined||raw.gradientColor2!==undefined||raw.colorMode==='gradient';
 const fg1=validColor(get('gradientColor1',fg),'gradientColor1');
 const fg2=validColor(get('gradientColor2',get('fg2','#5EAD49')),'gradientColor2');
 const safeBool=(v,k)=>{if(typeof v!=='boolean')throw new InputError(`${k} must be a boolean`);return v;};
 const gradientEyes=safeBool(get('gradientOnEyes',get('gradientEyes',false)),'gradientOnEyes');
 const transparent=safeBool(get('transparent',false),'transparent');
 const logoMode=get('logoMode',null);if(logoMode!==null&&!['clean','default'].includes(logoMode))throw new InputError('logoMode must be clean or default');const logoClean=logoMode!==null?logoMode==='clean':safeBool(get('logoClean',true),'logoClean');
 const logoSize=Number(get('logoSize',19));if(!Number.isFinite(logoSize)||logoSize<5||logoSize>28)throw new InputError('logoSize must be 5 to 28 percent');
 const e1=[1,2,3].map(i=>validColor(get(`eye${i}Color`,fg),`eye${i}Color`));
 const e2=[1,2,3].map(i=>validColor(get(`eyeBall${i}Color`,fg),`eyeBall${i}Color`));
 let logo=null;
 if(raw.logo!=null&&raw.logo!==''){
  const obj=typeof raw.logo==='string'?{data:raw.logo,name:'Uploaded logo'}:raw.logo;
  if(!obj||typeof obj.data!=='string'||!/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(obj.data)||obj.data.length>800000)throw new InputError('logo must be a PNG/JPEG/WebP data URL under 600 KB; external URLs are not accepted');
  logo={data:obj.data,name:String(obj.name||'Logo').slice(0,100)};
 }
 return {body:shape(get('body','square'),BODIES,'body'),frame:shape(get('eye',get('frame','square')),FRAMES,'eye'),ball:shape(get('eyeBall',get('ball','square')),BALLS,'eyeBall'),fg:hasGradient?fg1:fg,fg2,bg,colorMode:hasGradient?'gradient':'single',gradientType:choice(get('gradientType','linear'),['linear','radial'],'gradientType'),gradientEyes,customEyes:true,eyeFrames:e1,eyeBalls:e2,transparent,logo,logoClean,logoSize};
}
function requestOptions(req={}){
 const data=req.data;
 if(typeof data!=='string'||data.length<1||Buffer.byteLength(data,'utf8')>2500)throw new InputError('data must be a nonempty UTF-8 string of at most 2500 bytes');
 const size=req.size===undefined?1000:Number(req.size);if(!Number.isInteger(size)||size<200||size>3000)throw new InputError('size must be an integer between 200 and 3000');
 const file=choice(String(req.file||'svg').toLowerCase(),['svg','png'],'file');
 const level=choice(String(req.level||'H').toUpperCase(),['L','M','Q','H'],'level');
 const cfg=settings(req.config||{});
 return {data,size,file,level,config:cfg,download:req.download===true||req.download==='true'};
}
function generateSVG(options){
 const qr = new QRCore.QRCode(-1,QRCore.ErrorCorrectLevel[options.level]);
 qr.addData(options.data);
 try{qr.make();}catch{throw new InputError('QR content is too long for the selected correction level');}
 const count=qr.getModuleCount();const matrix=Array.from({length:count},(_,r)=>Array.from({length:count},(_,c)=>!!qr.isDark(r,c)));
 return QRRenderer.buildSVG(matrix,options.config,options.size);
}
module.exports={BODIES,FRAMES,BALLS,InputError,settings,requestOptions,generateSVG};
