import test from 'node:test';
import assert from 'node:assert/strict';
import {cp,mkdtemp,appendFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

test('public source checks reject a personal path added to the root README',async()=>{
  const root=fileURLToPath(new URL('../',import.meta.url));
  const temporary=await mkdtemp(path.join(tmpdir(),'collector-check-'));
  try{
    await cp(root,temporary,{recursive:true,filter:source=>!path.relative(root,source).split(path.sep).some(part=>['.git','node_modules','dist','preview','__pycache__'].includes(part))});
    const personalPath=['','Users','synthetic-person','private'].join('/');
    await appendFile(path.join(temporary,'README.md'),'\n'+personalPath+'\n');
    const result=spawnSync(process.execPath,['tools/check.mjs'],{cwd:temporary,encoding:'utf8'});
    assert.notEqual(result.status,0,'root documentation must be included in the privacy check');
    assert.match(result.stderr,/personal path in README\.md/);
  }finally{await rm(temporary,{recursive:true,force:true});}
});
