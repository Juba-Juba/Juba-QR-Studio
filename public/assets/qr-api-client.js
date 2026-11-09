/** Integration client for the public Juba QR Studio Cloudflare Worker.
 * provider: 'auto' (tries Monkey then local SVG), 'monkey' (strict upstream), 'local'.
 * A successful response X-QR-Renderer identifies the actual rendering source.
 */
export const JUBA_QR_API='https://juba-qr-studio-api.elprincedokdok0-048.workers.dev';
export async function createJubaQR({data,config={},size=1000,file='svg',provider='auto'}={},base=JUBA_QR_API){
 const response=await fetch(`${base.replace(/\/$/,'')}/api/v1/qr`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data,config,size,file,provider})});
 if(!response.ok){const error=await response.json().catch(()=>({message:'QR API failed'}));throw new Error(error.message||error.reason||`HTTP ${response.status}`);}
 return {blob:await response.blob(),source:response.headers.get('X-QR-Renderer')||'unknown',format:file};
}