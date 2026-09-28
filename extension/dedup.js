// Keep only fingerprints, never the image blobs. Failed reads remain retryable.
export class FingerprintCache {
  #entries=new Map();
  async get(key,loadBlob) {
    if(this.#entries.has(key))return this.#entries.get(key);
    const pending=(async()=>{
      const blob=await loadBlob();
      const digest=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());
      return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
    })();
    this.#entries.set(key,pending);
    try{return await pending;}
    catch(error){this.#entries.delete(key);throw error;}
  }
}

export const fingerprintKey=item=>item.original;
