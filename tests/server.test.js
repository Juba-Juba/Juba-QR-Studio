'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {server}=require('../server');
const {BODIES,FRAMES,BALLS,requestOptions,generateSVG}=require('../qr-service');
const fs=require('node:fs');
let origin;
test.before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;});
test.after(async()=>{await new Promise(resolve=>server.close(resolve));});
test('home page and UI assets load without authentication',async()=>{
 let r=await fetch(origin+'/');assert.equal(r.status,200);const html=await r.text();assert.match(html,/Juba QR Studio/);assert.match(html,/CUSTOMIZE DESIGN/);assert.doesNotMatch(html,/<form[^>]+action="\/login"/);
 r=await fetch(origin+'/assets/app.js');assert.equal(r.status,200);assert.match(await r.text(),/BODY_SHAPES/);
 r=await fetch(origin+'/api-docs.html');assert.equal(r.status,200);
});
test('shape catalog contains all tiles represented in reference',async()=>{
 assert.equal(BODIES.length,22);assert.equal(FRAMES.length,15);assert.equal(BALLS.length,18);
 const r=await fetch(origin+'/api/v1/shapes');const j=await r.json();assert.equal(j.body.length,22);assert.equal(j.eye.length,15);assert.equal(j.eyeBall.length,18);
});
test('GET and POST return styled SVG, support compatibility aliases',async()=>{
 let r=await fetch(origin+'/api/v1/qr?data='+encodeURIComponent('https://example.com/a')+'&file=svg');assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/image\/svg/);assert.match(await r.text(),/<svg/);
 r=await fetch(origin+'/qr/custom',{method:'POST',headers:{'content-type':'application/json','origin':'https://example.com'},body:JSON.stringify({data:'https://example.com/nfc/abc',size:1000,file:'svg',config:{body:'rounded-pointed',eye:'frame14',eyeBall:'ball16',bodyColor:'#294D2B',gradientColor1:'#294D2B',gradientColor2:'#60A541'}})});
 assert.equal(r.status,200);assert.equal(r.headers.get('access-control-allow-origin'),'*');const content=await r.text();assert.match(content,/linearGradient/);assert.match(content,/#294D2B/);assert.match(content,/<svg/);
});
test('API validates input and never executes injected SVG attributes',async()=>{
 let r=await fetch(origin+'/api/v1/qr',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({data:'test',config:{bodyColor:'url(javascript:bad)'}})});assert.equal(r.status,400);
 r=await fetch(origin+'/api/v1/qr',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({data:'test',config:{logo:'https://internal.example/logo.png'}})});assert.equal(r.status,400);
 r=await fetch(origin+'/api/v1/qr',{method:'POST',headers:{'content-type':'application/json'},body:'not json'});assert.equal(r.status,400);
 r=await fetch(origin+'/api/v1/qr?data=x&size=999999');assert.equal(r.status,400);
});
test('PNG output is a real binary PNG when SVG rasterizer is installed',async()=>{
 const r=await fetch(origin+'/api/v1/qr?data=https%3A%2F%2Fexample.com&file=png&size=500');
 assert.ok([200,503].includes(r.status));
 if(r.status===200){const bytes=Buffer.from(await r.arrayBuffer());assert.ok(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));assert.ok(bytes.length>1000);}
});
test('official Monkey identifiers and independent finder flip transforms are available',async()=>{
 assert.ok(BODIES.includes('rounded-pointed'));
 assert.ok(BODIES.includes('circle-zebra-vertical'));
 assert.ok(FRAMES.includes('frame14'));
 assert.ok(BALLS.includes('ball16'));
 const opts=requestOptions({data:'https://example.com',config:{body:'rounded-pointed',eye:'frame14',eyeBall:'ball16',erf2:['fh'],brf3:['fv'],bodyColor:'#294D2B'}});
 const svg=generateSVG(opts);
 assert.match(svg,/scale\(-1 1\)/);
 assert.match(svg,/scale\(1 -1\)/);
 assert.throws(()=>requestOptions({data:'x',config:{erf1:['bad']}}),/erf1/);
});
