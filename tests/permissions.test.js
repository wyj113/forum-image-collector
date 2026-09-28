import test from 'node:test';
import assert from 'node:assert/strict';
let permissions={};try{permissions=await import('../extension/permissions.js');}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}
test('access requests use exact HTTPS origins and reject unsafe URLs',async()=>{
  assert.equal(typeof permissions.requestAccess,'function');
  let requested;
  const api={permissions:{request:async value=>{requested=value;return true;}}};
  assert.equal(await permissions.requestAccess(['https://photos.example/a.jpg','https://photos.example/b.jpg?token=demo'],api),true);
  assert.deepEqual(requested,{origins:['https://photos.example/*']});
  for(const url of ['http://photos.example/a.jpg','https://user:secret@photos.example/a.jpg','file:///image.jpg','https://*.example/a.jpg'])assert.throws(()=>permissions.originPattern(url));
});
test('missing origin access prevents reads and reports the required site',async()=>{
  assert.equal(typeof permissions.requireAccess,'function');
  await assert.rejects(permissions.requireAccess('https://photos.example/a.jpg',{permissions:{contains:async()=>false}}),/photos.example/);
  await permissions.requireAccess('https://photos.example/a.jpg',{permissions:{contains:async()=>true}});
});
