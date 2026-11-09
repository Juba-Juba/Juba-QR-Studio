'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const monkey=require('../monkey-provider');

test('official Monkey template IDs and all four formats are supported',()=>{
 assert.equal(monkey.BODY.length,22);assert.equal(monkey.EYES.length,15);assert.equal(monkey.BALLS.length,18);
 for(const f of ['svg','png','pdf','eps'])assert.equal(monkey.validOptions({data:'https://example.com',file:f}).file,f);
 assert.throws(()=>monkey.validOptions({data:'abc',config:{body:'invented'}}),/Unknown Monkey/);
 assert.throws(()=>monkey.validOptions({data:'abc',config:{logo:'http:\/\/127.0.0.1'}}),/Only Monkey/);
});
test('Monkey adapter proxies exact template config and validates binary image',async()=>{
 let captured;
 const mock=async (url,req)=>{captured={url,headers:req.headers,payload:JSON.parse(req.body)};return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>',{status:200,headers:{'content-type':'image/svg+xml'}});};
 const result=await monkey.requestImage({data:'https://example.com',file:'svg',config:{body:'rounded-pointed',eye:'frame14',eyeBall:'ball16',erf2:['fh']}},{fetcher:mock});
 assert.equal(result.success,true);assert.equal(result.source,'monkey-direct');assert.equal(captured.url,'https://api.qr-code-monkey.com/qr/custom');
 assert.equal(captured.payload.config.body,'rounded-pointed');assert.deepEqual(captured.payload.config.erf2,['fh']);
});
test('upstream errors are not misrepresented as original Monkey output',async()=>{
 let r=await monkey.requestImage({data:'hi'},{fetcher:async()=>new Response('gateway error',{status:503})});
 assert.equal(r.success,false);assert.equal(r.why,'upstream_http_503');
 r=await monkey.requestImage({data:'hi'},{fetcher:async()=>new Response('<html>access denied</html>',{status:200})});
 assert.equal(r.success,false);assert.equal(r.why,'upstream_invalid_image');
});