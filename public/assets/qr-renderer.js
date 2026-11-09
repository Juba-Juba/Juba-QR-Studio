/* Shared vector QR renderer for browser and Node. No network access. */
(function(root){
"use strict";
function roundedPath(x,y,w,h,r){r=Math.max(0,Math.min(w/2,h/2,r));return `M${x+r} ${y}H${x+w-r}Q${x+w} ${y} ${x+w} ${y+r}V${y+h-r}Q${x+w} ${y+h} ${x+w-r} ${y+h}H${x+r}Q${x} ${y+h} ${x} ${y+h-r}V${y+r}Q${x} ${y} ${x+r} ${y}Z`;}
function svgRect(x,y,w,h,fill,rx=0){return `<rect x="${x}" y="${y}" width="${w}" height="${h}"${rx?` rx="${rx}"`:''} fill="${fill}"/>`;}
function svgCircle(cx,cy,r,fill){return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;}
function moduleSVG(x,y,shape,fill,r=0,c=0){switch(shape){
 case 'circles':return svgCircle(x+.5,y+.5,.46,fill);
 case 'slant':return `<path d="M${x+.08} ${y+.12}h.78l-.15 .76h-.78Z" fill="${fill}"/>`;
 case 'cross':return `<path d="M${x+.35} ${y+.03}h.3v.32h.32v.3h-.32v.32h-.3v-.32h-.32v-.3h.32Z" fill="${fill}"/>`;
 case 'arrow':return `<path d="M${x+.02} ${y+.25}h.48v-.22l.48 .47-.48 .47v-.22h-.48Z" fill="${fill}"/>`;
 case 'sparkles':return `<path d="M${x+.5} ${y}L${x+.66} ${y+.34} ${x+1} ${y+.5} ${x+.66} ${y+.66} ${x+.5} ${y+1} ${x+.34} ${y+.66} ${x} ${y+.5} ${x+.34} ${y+.34}Z" fill="${fill}"/>`;
 case 'rhombus':return `<path d="M${x+.1} ${y+.09}L${x+.88} ${y+.16} ${x+.98} ${y+.77} ${x+.37} ${y+.96} ${x+.03} ${y+.49}Z" fill="${fill}"/>`;
 case 'dots':return svgCircle(x+.5,y+.5,.41,fill);
 case 'rounded':return svgRect(x+.07,y+.07,.86,.86,fill,.23);
 case 'extra-rounded':return svgRect(x+.06,y+.06,.88,.88,fill,.4);
 case 'small-square':return svgRect(x+.19,y+.19,.62,.62,fill,.05);
 case 'diamond':return `<path d="M${x+.5} ${y+.06}L${x+.94} ${y+.5} ${x+.5} ${y+.94} ${x+.06} ${y+.5}Z" fill="${fill}"/>`;
 case 'classy':return `<path d="M${x+.08} ${y+.07}H${x+.93}V${y+.75}Q${x+.93} ${y+.93} ${x+.75} ${y+.93}H${x+.08}Z" fill="${fill}"/>`;
 case 'classy-rounded':return `<path d="M${x+.45} ${y+.07}H${x+.93}V${y+.66}Q${x+.93} ${y+.93} ${x+.64} ${y+.93}H${x+.07}V${y+.45}Q${x+.07} ${y+.07} ${x+.45} ${y+.07}Z" fill="${fill}"/>`;
 case 'horizontal':return svgRect(x+.02,y+.3,.96,.4,fill,.19);
 case 'vertical':return svgRect(x+.3,y+.02,.4,.96,fill,.19);
 case 'leaf':return `<path d="M${x+.08} ${y+.08}Q${x+.95} ${y+.02} ${x+.93} ${y+.88}Q${x+.07} ${y+.97} ${x+.08} ${y+.08}Z" fill="${fill}"/>`;
 case 'star':{let points=[];for(let k=0;k<10;k++){const a=k*Math.PI/5-Math.PI/2,rad=k%2?.28:.48;points.push(`${x+.5+Math.cos(a)*rad},${y+.5+Math.sin(a)*rad}`);}return `<polygon points="${points.join(' ')}" fill="${fill}"/>`;}
 case 'blob':return `<path d="M${x+.48} ${y+.08}C${x+.82} ${y+.04} ${x+1.03} ${y+.37} ${x+.9} ${y+.71}C${x+.81} ${y+.99} ${x+.36} ${y+1.02} ${x+.15} ${y+.81}C${x-.04} ${y+.58} ${x+.09} ${y+.14} ${x+.48} ${y+.08}Z" fill="${fill}"/>`;
 case 'mosaic':return (r+c)%2?svgRect(x+.08,y+.08,.84,.84,fill,.15):svgCircle(x+.5,y+.5,.43,fill);
 case 'stripe':return `<rect x="${x+.03}" y="${y+.08}" width=".94" height=".27" fill="${fill}"/><rect x="${x+.03}" y="${y+.59}" width=".94" height=".3" fill="${fill}"/>`;
 case 'pixel':return `<path d="M${x+.12} ${y+.12}h.75v.29h-.23v.24h.23v.23h-.75v-.27h.26v-.26h-.26Z" fill="${fill}"/>`;
 default:return svgRect(x,y,1,1,fill);
 }}
function frameSVG(x,y,style,fill){
 if(style==='frame-dots'||style==='frame-pixels'||style==='frame-dashed'){let a='';for(let i=0;i<7;i++){for(let j=0;j<7;j++){if(i!==0&&i!==6&&j!==0&&j!==6)continue;if(style==='frame-dots'&&(i+j)%2===1)continue;if(style==='frame-dashed'&&(i+j)%3===1)continue;a+=style==='frame-dots'?svgCircle(x+j+.5,y+i+.5,.43,fill):svgRect(x+j+.07,y+i+.07,.86,.86,fill,style==='frame-dashed'?.15:0);}}return a;}
 if(style==='circle')return `<path d="M${x+3.5} ${y}a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0 -7Z M${x+3.5} ${y+1}a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0 -5Z" fill="${fill}" fill-rule="evenodd"/>`;
 if(style==='double')return `<path d="${roundedPath(x,y,7,7,.1)} ${roundedPath(x+.8,y+.8,5.4,5.4,.1)}" fill="${fill}" fill-rule="evenodd"/>`+`<path d="${roundedPath(x+1.18,y+1.18,4.64,4.64,.1)} ${roundedPath(x+1.45,y+1.45,4.1,4.1,.1)}" fill="${fill}" fill-rule="evenodd"/>`;
 if(style==='open')return [svgRect(x,y,2,1,fill),svgRect(x+5,y,2,1,fill),svgRect(x,y+1,1,1,fill),svgRect(x+6,y+1,1,1,fill),svgRect(x,y+5,1,2,fill),svgRect(x+1,y+6,5,1,fill),svgRect(x+6,y+5,1,2,fill),svgRect(x+1,y,5,.77,fill)].join('');
 const radius={square:0,rounded:.75,'extra-rounded':1.65,leaf:2.8,'left-cut':1.8,'right-cut':1.1,soft:.42,squircle:2.3,pill:3.15}[style]??0;
 if(style==='leaf')return `<path d="${roundedPath(x,y,7,7,2.5)} ${roundedPath(x+1,y+1,5,5,1.35)}" fill="${fill}" fill-rule="evenodd"/>`;
 if(style==='right-cut')return `<path d="M${x} ${y}L${x+7} ${y}L${x+7} ${y+7}L${x} ${y+7}Z M${x+1.2} ${y+1.1}L${x+6} ${y+1}L${x+5.92} ${y+5.93}L${x+1.02} ${y+6}Z" fill="${fill}" fill-rule="evenodd"/>`;
 if(style==='left-cut')return `<path d="${roundedPath(x,y,7,7,1.8)} ${roundedPath(x+1,y+1,5,5,.65)}" fill="${fill}" fill-rule="evenodd"/>`;
 if(style==='right-cut')return `<path d="${roundedPath(x,y,7,7,1.05)} ${roundedPath(x+1,y+1,5,5,.2)}" fill="${fill}" fill-rule="evenodd"/>`;
 return `<path d="${roundedPath(x,y,7,7,radius)} ${roundedPath(x+1,y+1,5,5,Math.max(0,radius-1))}" fill="${fill}" fill-rule="evenodd"/>`;
}
function ballSVG(x,y,style,fill){const X=x+2,Y=y+2;switch(style){
 case 'extra-rounded':return svgRect(X,Y,3,3,fill,1.1);
 case 'pill':return svgRect(X,Y,3,3,fill,1.35);
 case 'ball-clipped':return `<path d="M${X} ${Y}h2.3l.7 .7v2.3h-3Z" fill="${fill}"/>`;
 case 'ball-pixel':return `<path d="M${X+.09} ${Y+.04}h2.8v.34h.12v2.45h-.3v.12h-2.6v-.27h-.12v-2.1h.12Z" fill="${fill}"/>`;
 case 'ball-blocks':return svgRect(X+.1,Y+.1,2.8,2.8,fill,.25);
 case 'ball-edges':return `<path d="M${X+.12} ${Y+.16}h2.76v2.68H${X+.4}Z" fill="${fill}"/>`;
 case 'ball-squircle':return `<path d="M${X+.4} ${Y+.1}Q${X+1.5} ${Y+.45} ${X+2.6} ${Y+.1}Q${X+2.4} ${Y+1.5} ${X+2.6} ${Y+2.9}Q${X+1.5} ${Y+2.55} ${X+.4} ${Y+2.9}Q${X+.6} ${Y+1.5} ${X+.4} ${Y+.1}Z" fill="${fill}"/>`;
 case 'circle':return svgCircle(X+1.5,Y+1.5,1.5,fill);
 case 'rounded':return svgRect(X,Y,3,3,fill,.75);
 case 'small-square':return svgRect(X+.38,Y+.38,2.24,2.24,fill,.14);
 case 'diamond':return `<path d="M${X+1.5} ${Y}L${X+3} ${Y+1.5} ${X+1.5} ${Y+3} ${X} ${Y+1.5}Z" fill="${fill}"/>`;
 case 'star':{let p=[];for(let k=0;k<10;k++){const a=k*Math.PI/5-Math.PI/2,rad=k%2?.9:1.5;p.push(`${X+1.5+rad*Math.cos(a)},${Y+1.5+rad*Math.sin(a)}`);}return `<polygon points="${p.join(' ')}" fill="${fill}"/>`;}
 case 'dots':return [0,1,2].flatMap(row=>[0,1,2].map(col=>svgCircle(X+col+.5,Y+row+.5,.42,fill))).join('');
 case 'horizontal':return [0,1,2].map(row=>svgRect(X,Y+row+.12,3,.66,fill,.22)).join('');
 case 'vertical':return [0,1,2].map(col=>svgRect(X+col+.12,Y,.66,3,fill,.22)).join('');
 case 'flower':return Array.from({length:6},(_,i)=>{const a=i*Math.PI/3;return svgCircle(X+1.5+Math.cos(a)*.9,Y+1.5+Math.sin(a)*.9,.62,fill);}).join('')+svgCircle(X+1.5,Y+1.5,.62,fill);
 case 'leaf':return `<path d="M${X+.2} ${Y+.2}C${X+2.8} ${Y-.3} ${X+3.3} ${Y+2.6} ${X+2.7} ${Y+2.8}C${X+.2} ${Y+3.4} ${X-.1} ${Y+1.3} ${X+.2} ${Y+.2}Z" fill="${fill}"/>`;
 case 'heart':return `<path d="M${X+1.5} ${Y+2.9}C${X+.6} ${Y+2.1} ${X-.1} ${Y+1.5} ${X+.25} ${Y+.6}C${X+.6} ${Y-.25} ${X+1.35} ${Y+.3} ${X+1.5} ${Y+.55}C${X+1.85} ${Y+.08} ${X+2.75} ${Y+.05} ${X+2.9} ${Y+.95}C${X+3.1} ${Y+1.7} ${X+2.1} ${Y+2.5} ${X+1.5} ${Y+2.9}Z" fill="${fill}"/>`;
 default:return svgRect(X,Y,3,3,fill);
}}
function finder(r,c,n){return (r<7&&c<7)||(r<7&&c>=n-7)||(r>=n-7&&c<7);}
function buildSVG(matrix,settings,size=1000,withLogo=true){const n=matrix.length,m=4,unit=n+8;const bodyFill=settings.colorMode==='gradient'?'url(#qr-gradient)':settings.fg;let def='';if(settings.colorMode==='gradient')def=`<defs>${settings.gradientType==='radial'?`<radialGradient id="qr-gradient" cx="40%" cy="40%" r="76%">`:`<linearGradient id="qr-gradient" x1="0%" y1="0%" x2="100%" y2="100%">`}<stop offset="0%" stop-color="${settings.fg}"/><stop offset="100%" stop-color="${settings.fg2}"/>${settings.gradientType==='radial'?'</radialGradient>':'</linearGradient>'}</defs>`;
 const pieces=[`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 ${unit} ${unit}" role="img" aria-label="QR Code">`,def];
 if(!settings.transparent)pieces.push(svgRect(0,0,unit,unit,settings.bg));
 let rects='';for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(matrix[r][c]&&!finder(r,c,n))rects+=moduleSVG(c+m,r+m,settings.body,bodyFill,r,c);
 pieces.push(`<g>${rects}</g>`);
 [[m,m],[m+n-7,m],[m,m+n-7]].forEach(([x,y],i)=>{
 const f=settings.colorMode==='gradient'&&settings.gradientEyes?'url(#qr-gradient)':settings.customEyes?settings.eyeFrames[i]:settings.fg;
 const b=settings.colorMode==='gradient'&&settings.gradientEyes?'url(#qr-gradient)':settings.customEyes?settings.eyeBalls[i]:settings.fg;
 pieces.push(frameSVG(x,y,settings.frame,f));pieces.push(ballSVG(x,y,settings.ball,b));
 });
 if(withLogo&&settings.logo&&settings.logo.data){const len=n*(settings.logoSize/100),x=m+(n-len)/2,y=x;const pad=settings.logoClean?.46:0;
 if(settings.logoClean)pieces.push(`<rect x="${(x-pad).toFixed(3)}" y="${(y-pad).toFixed(3)}" width="${(len+2*pad).toFixed(3)}" height="${(len+2*pad).toFixed(3)}" rx=".5" fill="${settings.transparent?'#FFFFFF':settings.bg}"/>`);
 pieces.push(`<image x="${x.toFixed(3)}" y="${y.toFixed(3)}" width="${len.toFixed(3)}" height="${len.toFixed(3)}" preserveAspectRatio="xMidYMid meet" href="${settings.logo.data}" />`);
 }
 pieces.push('</svg>');return pieces.join('');
}

const api={buildSVG,moduleSVG,frameSVG,ballSVG};
root.QRRenderer=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
