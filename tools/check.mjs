import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=async file=>readFile(path.join(root,file),'utf8');
const manifest=JSON.parse(await read('extension/manifest.json'));
assert.equal(manifest.manifest_version,3);
assert.ok(!manifest.host_permissions?.length,'host access must be optional');
assert.deepEqual(manifest.optional_host_permissions,['https://*/*']);
assert.deepEqual(manifest.permissions,['activeTab','scripting','downloads']);
assert.equal(JSON.parse(await read('package.json')).version,manifest.version);
for(const file of await readdir(path.join(root,'extension'))){
  if(file.endsWith('.js')){
    const result=spawnSync(process.execPath,['--check',path.join(root,'extension',file)],{encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
  }
}
async function inspectFile(file){
  const content=await read(file);
  assert.ok(!/[A-Za-z]:[\\/]Users[\\/]|\/Users\/[^/]+\//.test(content),`personal path in ${file}`);
  assert.ok(!/-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/.test(content),`private key in ${file}`);
}
const publicRoots=['extension','tests','tools','docs','.github'];
async function inspect(directory){
  for(const entry of await readdir(path.join(root,directory),{withFileTypes:true})){
    const file=path.posix.join(directory,entry.name);
    if(entry.isDirectory()){await inspect(file);continue;}
    if(!/\.(?:js|mjs|json|md|py|yml|yaml|sh|html|css|txt|svg)$/.test(file))continue;
    await inspectFile(file);
  }
}
for(const directory of publicRoots)await inspect(directory);
for(const file of ['README.md','README.en.md','LICENSE','CONTRIBUTING.md','SECURITY.md','CHANGELOG.md','AGENTS.md','package.json','package-lock.json']){assert.ok((await read(file)).trim());await inspectFile(file);}
console.log('Public source checks passed: manifest, module syntax, required docs, personal paths and private keys.');
