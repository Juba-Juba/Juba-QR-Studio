/* Bundles MIT-licensed Kazuhiko Arase QR encoder for offline browser use. */
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'qr-vendor');
const names = ['QRMode','QRErrorCorrectLevel','QRMaskPattern','QRMath','QRPolynomial','QRRSBlock','QRBitBuffer','QR8bitByte','QRUtil','index'];
const blocks = names.map(name => {
  let source = fs.readFileSync(path.join(dir, `${name}.js`),'utf8');
  if(name === 'QR8bitByte') {
    source = source.replace('this.data = data;', `// Convert Unicode input to UTF-8 before putting bytes in QR segments.\n\tthis.data = Array.from(new TextEncoder().encode(data), b => String.fromCharCode(b)).join('');`);
  }
  return `"${name}":function(require,module,exports){\n${source}\n}`;
}).join(',\n');
const bundle = `/* Offline QR encoder: Kazuhiko Arase, MIT license (see THIRD_PARTY_NOTICES.md) */\n(function(root){\n"use strict";\nconst factories={${blocks}};\nconst cache={};\nfunction load(name){let clean=name.replace(/^\\.\\//,'').replace(/\\.js$/,'');if(cache[clean])return cache[clean].exports;if(!factories[clean])throw Error('Unknown QR module: '+name);let m={exports:{}};cache[clean]=m;factories[clean](load,m,m.exports);return m.exports;}\nroot.QRCore={QRCode:load('index'),ErrorCorrectLevel:load('QRErrorCorrectLevel')};\nif(typeof module==='object'&&module.exports)module.exports=root.QRCore;\n})(typeof window!=='undefined'?window:globalThis);\n`;
fs.writeFileSync(path.join(__dirname,'../public/assets/qr-encoder.js'),bundle);
console.log('QR encoder bundle generated:',Buffer.byteLength(bundle),'bytes');
