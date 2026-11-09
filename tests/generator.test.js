'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const ROOT=path.join(__dirname,'../public/assets');
function getEngine(){
 const context={window:{},TextEncoder,URL,btoa,unescape,console,document:{readyState:'loading',addEventListener(){}},localStorage:{getItem(){return null;}},setTimeout,clearTimeout,Blob};
 vm.createContext(context);
 vm.runInContext(fs.readFileSync(path.join(ROOT,'qr-encoder.js'),'utf8'),context);
 vm.runInContext(fs.readFileSync(path.join(ROOT,'qr-renderer.js'),'utf8'),context);
 const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
 const patched=app.replace(/\}\)\(\);\s*$/,`globalThis.__test={makeMatrix,buildSVG,payload,validateImportedDesign,get state(){return state},setState(s){Object.assign(state,s)}};})();`);
 vm.runInContext(patched,context);
 return context.__test;
}
test('generates a complete QR grid for a URL',()=>{
 const e=getEngine(),matrix=e.makeMatrix('https://example.com/q/stand-001');
 assert.ok(matrix.length>=21);assert.equal(matrix.length,matrix[0].length);
 assert.ok(matrix.some(row=>row.some(Boolean)));
 assert.match(e.buildSVG(matrix),/<svg[^>]*viewBox=/);
 assert.match(e.buildSVG(matrix),/fill-rule="evenodd"/);
});
test('uses UTF-8 bytes for Arabic and emoji characters',()=>{
 const e=getEngine(),ar=e.makeMatrix('مرحبًا بالعالم 🚀'),en=e.makeMatrix('hello');
 assert.ok(ar.length>=en.length);assert.ok(ar.length%4===1);
});
test('supports URL, SMS, NFC pages, and invalid URL validation',()=>{
 const e=getEngine();assert.equal(e.payload(),'https://example.com/');
 e.setState({type:'sms',values:{smsphone:'+201012345678',smsmessage:'Test'}});
 assert.equal(e.payload(),'SMSTO:+201012345678:Test');
 e.setState({type:'nfc',values:{nfcbase:'https://example.com/q/',nfckey:'stand-001'}});
 assert.equal(e.payload(),'https://example.com/q/stand-001');
 e.setState({type:'url',values:{url:'javascript:alert(1)'}});
 assert.throws(()=>e.payload(),/valid HTTP|رابط/);
});
test('presets reject malicious colors and image URLs',()=>{
 const e=getEngine();assert.throws(()=>e.validateImportedDesign({fg:'url(javascript:evil)'}));
 assert.throws(()=>e.validateImportedDesign({logo:{name:'test',data:'javascript:alert(1)'}}));
 const good=e.validateImportedDesign({fg:'#abcdef',frame:'frame6',logo:null});
 assert.equal(good.fg,'#ABCDEF');assert.equal(good.frame,'frame6');
});
test('renders different shapes, gradients and logos into portable SVG',()=>{
 const e=getEngine();e.setState({body:'dots',frame:'rounded',ball:'circle',fg:'#132D4F',fg2:'#25A9A0',colorMode:'gradient',logo:{name:'test',data:'data:image/png;base64,aGk='}});
 const output=e.buildSVG(e.makeMatrix('https://example.com'));
 assert.match(output,/linearGradient/);assert.match(output,/fill="url\(#qr-gradient\)"/);
 assert.match(output,/data:image\/png;base64,aGk=/);
});
