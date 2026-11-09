/* Shared vector QR renderer for browser and Node. No network access. */
(function(root){
"use strict";
function roundedPath(x,y,w,h,r){r=Math.max(0,Math.min(w/2,h/2,r));return `M${x+r} ${y}H${x+w-r}Q${x+w} ${y} ${x+w} ${y+r}V${y+h-r}Q${x+w} ${y+h} ${x+w-r} ${y+h}H${x+r}Q${x} ${y+h} ${x} ${y+h-r}V${y+r}Q${x} ${y} ${x+r} ${y}Z`;}
function svgRect(x,y,w,h,fill,rx=0){return `<rect x="${x}" y="${y}" width="${w}" height="${h}"${rx?` rx="${rx}"`:''} fill="${fill}"/>`;}
function svgCircle(cx,cy,r,fill){return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;}
// Shape identifiers follow QRCode Monkey public API, with independently-drawn vector geometry.
// The reference service's proprietary vectors aren't published; the geometry here is original.
const MONKEY_BODIES=['square','mosaic','dot','circle','circle-zebra','circle-zebra-vertical','circular','edge-cut','edge-cut-smooth','japnese','leaf','pointed','pointed-edge-cut','pointed-in','pointed-in-smooth','pointed-smooth','round','rounded-in','rounded-in-smooth','rounded-pointed','star','diamond'];
const MONKEY_FRAMES=['frame0','frame1','frame2','frame3','frame4','frame5','frame6','frame7','frame8','frame10','frame11','frame12','frame13','frame14','frame16'];
const MONKEY_BALLS=['ball0','ball1','ball2','ball3','ball5','ball6','ball7','ball8','ball10','ball11','ball12','ball13','ball14','ball15','ball16','ball17','ball18','ball19'];
function polygon(points,fill){return `<polygon points="${points.map(p=>p.join(',')).join(' ')}" fill="${fill}"/>`;}
function shapePath(x,y,n,fill){return `<path d="${n}" fill="${fill}"/>`;}
function cornerRadiusPath(x,y,neighbors,rad){
  // Round exposed corners; connected modules share an unbroken flat edge.
  const u=!!neighbors?.u,d=!!neighbors?.d,l=!!neighbors?.l,r=!!neighbors?.r;
  const tl=(u||l)?0:rad,tr=(u||r)?0:rad,br=(d||r)?0:rad,bl=(d||l)?0:rad;
  return `M${x+tl} ${y}H${x+1-tr}Q${x+1} ${y} ${x+1} ${y+tr}V${y+1-br}Q${x+1} ${y+1} ${x+1-br} ${y+1}H${x+bl}Q${x} ${y+1} ${x} ${y+1-bl}V${y+tl}Q${x} ${y} ${x+tl} ${y}Z`;
}
function cutPoints(x,y,neighbors,cut=.27,inside=false){
 const n=neighbors||{},a=(!n.u&&!n.l)?cut:0,b=(!n.u&&!n.r)?cut:0,c=(!n.d&&!n.r)?cut:0,d=(!n.d&&!n.l)?cut:0;
 return inside?[[x,y+a],[x+a,y+a],[x+a,y],[x+1-b,y],[x+1-b,y+b],[x+1,y+b],[x+1,y+1-c],[x+1-c,y+1-c],[x+1-c,y+1],[x+d,y+1],[x+d,y+1-d],[x,y+1-d]]:
 [[x+a,y],[x+1-b,y],[x+1,y+b],[x+1,y+1-c],[x+1-c,y+1],[x+d,y+1],[x,y+1-d],[x,y+a]];
}
function moduleSVG(x,y,shape,fill,r=0,c=0,neighbors={}){
 const u=!!neighbors.u,d=!!neighbors.d,l=!!neighbors.l,rr=!!neighbors.r;
 switch(shape){
 case 'dot':return svgCircle(x+.5,y+.5,.23,fill);
 case 'circle':return svgCircle(x+.5,y+.5,.47,fill);
 case 'circle-zebra':{
   let x0=x+(l?0:.08), x1=x+1-(rr?0:.08);
   return svgRect(x0,y+.11,x1-x0,.32,fill,.15)+svgRect(x0,y+.57,x1-x0,.32,fill,.15);
 }
 case 'circle-zebra-vertical':{
   let y0=y+(u?0:.08),y1=y+1-(d?0:.08);
   return svgRect(x+.11,y0,.32,y1-y0,fill,.15)+svgRect(x+.57,y0,.32,y1-y0,fill,.15);
 }
 case 'circular':return svgCircle(x+.5,y+.5,.47,fill)+(l?svgRect(x,y+.35,.5,.3,fill):'')+(rr?svgRect(x+.5,y+.35,.5,.3,fill):'')+(u?svgRect(x+.35,y,.3,.5,fill):'')+(d?svgRect(x+.35,y+.5,.3,.5,fill):'');
 case 'round':return shapePath(x,y,cornerRadiusPath(x,y,neighbors,.42),fill);
 case 'edge-cut':return polygon(cutPoints(x,y,neighbors,.24),fill);
 case 'edge-cut-smooth':return shapePath(x,y,cornerRadiusPath(x,y,neighbors,.25),fill);
 case 'pointed':return polygon(cutPoints(x,y,neighbors,.36),fill);
 case 'pointed-edge-cut':return polygon(cutPoints(x,y,neighbors,.34),fill);
 case 'pointed-in':return polygon(cutPoints(x,y,neighbors,.25,true),fill);
 case 'pointed-in-smooth':return shapePath(x,y,cornerRadiusPath(x,y,neighbors,.16),fill);
 case 'pointed-smooth':return shapePath(x,y,cornerRadiusPath(x,y,neighbors,.32),fill);
 case 'rounded-in':return polygon(cutPoints(x,y,neighbors,.15,true),fill);
 case 'rounded-in-smooth':return shapePath(x,y,cornerRadiusPath(x,y,neighbors,.32),fill);
 case 'rounded-pointed':{
   // The selected angular-rounded style: joint-preserving core + tapered exposed corners.
   let points=cutPoints(x,y,neighbors,.26);
   let out=polygon(points,fill);
   if(!u&&!l)out+=polygon([[x+.26,y],[x,y+.35],[x+.34,y+.3]],fill);
   if(!u&&!rr)out+=polygon([[x+.74,y],[x+1,y+.32],[x+.71,y+.31]],fill);
   if(!d&&!rr)out+=polygon([[x+1,y+.66],[x+.74,y+1],[x+.72,y+.72]],fill);
   if(!d&&!l)out+=polygon([[x+.27,y+1],[x,y+.68],[x+.29,y+.7]],fill);
   return out;
 }
 case 'mosaic':return (r+c)%3===0?polygon(cutPoints(x,y,neighbors,.27),fill):shapePath(x,y,cornerRadiusPath(x,y,neighbors,.17),fill);
 case 'japnese':return polygon(cutPoints(x,y,neighbors,(r+c)%3===0?.36:.12),fill);
 case 'leaf':return `<path d="M${x+(l?0:.12)} ${y+(u?0:.08)}C${x+.7} ${y-.12} ${x+1.08} ${y+.25} ${x+(rr?1:.93)} ${y+(d?1:.87)}C${x+.56} ${y+1.06} ${x-.09} ${y+.7} ${x+(l?0:.12)} ${y+(u?0:.08)}Z" fill="${fill}"/>`;
 case 'star':{let p=[];for(let k=0;k<8;k++){const a=k*Math.PI/4-Math.PI/2,rad=k%2?.29:.49;p.push([x+.5+rad*Math.cos(a),y+.5+rad*Math.sin(a)]);}return polygon(p,fill);}
 case 'diamond':return polygon([[x+.5,y+.02],[x+.98,y+.5],[x+.5,y+.98],[x+.02,y+.5]],fill);
 default:return svgRect(x,y,1,1,fill);
 }
}
function frameSVG(x,y,style,fill){
 // 7x7 finder frame, center 5x5 is negative space. Each Monkey ID has its own outline.
 const ring=(ro=0,ri=0)=>`<path d="${roundedPath(x,y,7,7,ro)} ${roundedPath(x+1,y+1,5,5,ri)}" fill="${fill}" fill-rule="evenodd"/>`;
 if(style==='frame12'||style==='frame13')return `<path d="M${x+3.5} ${y}a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0 -7Z M${x+3.5} ${y+1}a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0 -5Z" fill="${fill}" fill-rule="evenodd"/>`;
 if(['frame5','frame8','frame10','frame11','frame16'].includes(style)){
  const dashed=style==='frame5'||style==='frame11'||style==='frame16';let s='';for(let i=0;i<7;i++)for(let j=0;j<7;j++){
   if(i&&i<6&&j&&j<6)continue;
   if(dashed&&((i*7+j)%((style==='frame11')?5:3)===1))continue;
   if(style==='frame10')s+=svgRect(x+j+.08,y+i+.08,.84,.84,fill,.16);
   else if(style==='frame5')s+=svgCircle(x+j+.5,y+i+.5,.42,fill);
   else s+=svgRect(x+j+.06,y+i+.06,.88,.88,fill,.06);
  }return s;
 }
 if(style==='frame14'){
  const outer=[[x+.42,y],[x+6.58,y+.17],[x+7,y+6.71],[x+.33,y+7],[x,y+.42]];
  const inner=[[x+1.25,y+1.16],[x+5.78,y+1.24],[x+5.91,y+5.8],[x+1.17,y+5.9],[x+1.14,y+1.17]];
  return `<path d="M${outer.map(p=>p.join(' ')).join('L')}Z M${inner.map(p=>p.join(' ')).join('L')}Z" fill="${fill}" fill-rule="evenodd"/>`;
 }
 if(style==='frame7')return `<path d="M${x+1.05} ${y}H${x+5.95}L${x+7} ${y+1.05}V${y+5.95}L${x+5.95} ${y+7}H${x+1.05}L${x} ${y+5.95}V${y+1.05}Z M${x+1.5} ${y+1.5}H${x+5.5}V${y+5.5}H${x+1.5}Z" fill="${fill}" fill-rule="evenodd"/>`;
 const rs={frame0:0,frame1:.95,frame2:.95,frame3:.95,frame4:.95,frame6:1.3,frame7:.4,frame13:3,frame14:.1};return ring(rs[style]??.45,Math.max(0,(rs[style]||.2)-.85));
}
function ballSVG(x,y,style,fill){const X=x+2,Y=y+2;switch(style){
 case 'ball0':return svgRect(X,Y,3,3,fill);
 case 'ball1':return shapePath(X,Y,`M${X+.8} ${Y}H${X+3}V${Y+3}H${X}V${Y+.8}Q${X} ${Y} ${X+.8} ${Y}Z`,fill);
 case 'ball2':return shapePath(X,Y,`M${X} ${Y}H${X+2.2}Q${X+3} ${Y} ${X+3} ${Y+.8}V${Y+3}H${X}Z`,fill);
 case 'ball3':return shapePath(X,Y,`M${X} ${Y}H${X+3}V${Y+3}H${X+.8}Q${X} ${Y+3} ${X} ${Y+2.2}Z`,fill);
 case 'ball5':return [0,1,2].flatMap(r=>[0,1,2].map(c=>svgCircle(X+c+.5,Y+r+.5,.42,fill))).join('');
 case 'ball6':return polygon([[X,Y],[X+2.36,Y],[X+3,Y+.64],[X+3,Y+3],[X,Y+3]],fill);
 case 'ball7':return shapePath(X,Y,`M${X+.1} ${Y+.1}H${X+2.88}V${Y+2.9}H${X+.1}Z`,fill);
 case 'ball8':return svgRect(X+.08,Y+.08,2.84,2.84,fill,.12);
 case 'ball10':return Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return svgCircle(X+1.5+Math.cos(a)*.86,Y+1.5+Math.sin(a)*.86,.65,fill);}).join('')+svgCircle(X+1.5,Y+1.5,.6,fill);
 case 'ball11':return shapePath(X,Y,`M${X+.55} ${Y+.12}H${X+2.5}Q${X+3} ${Y+.12} ${X+3} ${Y+.63}V${Y+2.2}L${X+2.28} ${Y+2.9}H${X+.55}Q${X} ${Y+2.9} ${X} ${Y+2.32}V${Y+.64}Q${X} ${Y+.12} ${X+.55} ${Y+.12}Z`,fill);
 case 'ball12':return [0,1,2].map(i=>svgRect(X+i+.04,Y,.85,3,fill,.42)).join('');
 case 'ball13':return [0,1,2].map(i=>svgRect(X,Y+i+.04,3,.85,fill,.42)).join('');
 case 'ball14':return svgCircle(X+1.5,Y+1.5,1.5,fill);
 case 'ball15':return svgRect(X,Y,3,3,fill,.77);
 case 'ball16':return polygon([[X+.05,Y+.14],[X+2.94,Y+.25],[X+2.77,Y+2.85],[X+.23,Y+2.92]],fill);
 case 'ball17':return polygon([[X,Y],[X+1.95,Y],[X+3,Y+1.05],[X+3,Y+3],[X,Y+3]],fill);
 case 'ball18':return shapePath(X,Y,`M${X} ${Y}Q${X+1.5} ${Y+.6} ${X+3} ${Y}Q${X+2.45} ${Y+1.5} ${X+3} ${Y+3}Q${X+1.5} ${Y+2.5} ${X} ${Y+3}Q${X+.48} ${Y+1.5} ${X} ${Y}Z`,fill);
 case 'ball19':return `<path d="M${X+.3} ${Y}h.9l.3 .7.3-.7h.9v1.2l-.7 .3.7 .3V${Y+3}h-.9l-.3-.7-.3 .7h-.9v-1.2l.7-.3-.7-.3Z" fill="${fill}"/>`;
 default:return svgRect(X,Y,3,3,fill);
}}
function flipGroup(svg,x,y,flips){const fx=flips?.includes('fh')?-1:1,fy=flips?.includes('fv')?-1:1;
 return fx===1&&fy===1?svg:`<g transform="translate(${fx<0?2*x+7:0} ${fy<0?2*y+7:0}) scale(${fx} ${fy})">${svg}</g>`;
}
function finder(r,c,n){return (r<7&&c<7)||(r<7&&c>=n-7)||(r>=n-7&&c<7);}
function buildSVG(matrix,settings,size=1000,withLogo=true){const n=matrix.length,m=4,unit=n+8;const bodyFill=settings.colorMode==='gradient'?'url(#qr-gradient)':settings.fg;let def='';if(settings.colorMode==='gradient')def=`<defs>${settings.gradientType==='radial'?`<radialGradient id="qr-gradient" cx="40%" cy="40%" r="76%">`:`<linearGradient id="qr-gradient" x1="0%" y1="0%" x2="100%" y2="100%">`}<stop offset="0%" stop-color="${settings.fg}"/><stop offset="100%" stop-color="${settings.fg2}"/>${settings.gradientType==='radial'?'</radialGradient>':'</linearGradient>'}</defs>`;
 const pieces=[`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 ${unit} ${unit}" role="img" aria-label="QR Code">`,def];
 if(!settings.transparent)pieces.push(svgRect(0,0,unit,unit,settings.bg));
 let rects='';for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(matrix[r][c]&&!finder(r,c,n))rects+=moduleSVG(c+m,r+m,settings.body,bodyFill,r,c,{u:r>0&&matrix[r-1][c]&&!finder(r-1,c,n),d:r<n-1&&matrix[r+1][c]&&!finder(r+1,c,n),l:c>0&&matrix[r][c-1]&&!finder(r,c-1,n),r:c<n-1&&matrix[r][c+1]&&!finder(r,c+1,n)});
 pieces.push(`<g>${rects}</g>`);
 [[m,m],[m+n-7,m],[m,m+n-7]].forEach(([x,y],i)=>{
 const f=settings.colorMode==='gradient'&&settings.gradientEyes?'url(#qr-gradient)':settings.customEyes?settings.eyeFrames[i]:settings.fg;
 const b=settings.colorMode==='gradient'&&settings.gradientEyes?'url(#qr-gradient)':settings.customEyes?settings.eyeBalls[i]:settings.fg;
 pieces.push(flipGroup(frameSVG(x,y,settings.frame,f),x,y,settings.eyeFlips?.[i]));pieces.push(flipGroup(ballSVG(x,y,settings.ball,b),x,y,settings.ballFlips?.[i]));
 });
 if(withLogo&&settings.logo&&settings.logo.data){const len=n*(settings.logoSize/100),x=m+(n-len)/2,y=x;const pad=settings.logoClean?.46:0;
 if(settings.logoClean)pieces.push(`<rect x="${(x-pad).toFixed(3)}" y="${(y-pad).toFixed(3)}" width="${(len+2*pad).toFixed(3)}" height="${(len+2*pad).toFixed(3)}" rx=".5" fill="${settings.transparent?'#FFFFFF':settings.bg}"/>`);
 pieces.push(`<image x="${x.toFixed(3)}" y="${y.toFixed(3)}" width="${len.toFixed(3)}" height="${len.toFixed(3)}" preserveAspectRatio="xMidYMid meet" href="${settings.logo.data}" />`);
 }
 pieces.push('</svg>');return pieces.join('');
}

const api={buildSVG,moduleSVG,frameSVG,ballSVG,MONKEY_BODIES,MONKEY_FRAMES,MONKEY_BALLS};
root.QRRenderer=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
