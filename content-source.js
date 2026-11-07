// A workspace belongs to the public snapshot it was saved alongside.
export function publishedSnapshot(data) {
 return {...data,items:data.items.filter(item=>item.status==='published')};
}
export async function contentRevision(data) {
 const bytes=new TextEncoder().encode(JSON.stringify(data));
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}
export function canResumeDraft(savedBase,currentBase) {
 return typeof savedBase==='string'&&savedBase===currentBase;
}
