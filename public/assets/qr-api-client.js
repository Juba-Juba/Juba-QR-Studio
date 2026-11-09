/* Tiny zero-dependency browser module for apps using Juba QR Studio (SVG edge API). */
export const JUBA_QR_API='https://juba-qr-studio-api.elprincedokdok0-048.workers.dev';
export async function createJubaQR({data,config={},size=1000,file='svg'}={},base=JUBA_QR_API){
 const response=await fetch(`${base.replace(/\/$/,'')}/api/v1/qr`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data,config,size,file})});
 if(!response.ok){const error=await response.json().catch(()=>({message:'QR API failed'}));throw new Error(error.message||`HTTP ${response.status}`);}
 return response.blob();
}
