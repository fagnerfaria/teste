import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import test from 'node:test';
const root=new URL('../',import.meta.url);
test('redistributable source documents are served locally with verifiable attribution and complete text',async()=>{
 const manifest=JSON.parse(await readFile(new URL('public/content/manifest.json',root),'utf8'));
 assert.equal(manifest.version,1);
 for(const [source,minimum] of [['ubl',40],['aprenda-community',450]]){
  const docs=manifest.documents.filter(d=>d.sourceId===source);
  assert.ok(docs.length>=minimum,`${source}: ${docs.length} documents`);
  assert.match(manifest.sources[source].revision,/^[a-f0-9]{40}$/);
  assert.ok(manifest.sources[source].licenseText.length>500);
  for(const doc of docs){
   assert.match(doc.url,/^\/content\/(ubl|aprenda-community)\//);
   assert.ok(!doc.url.includes('..'));
   const body=await readFile(new URL('public'+doc.url,root),'utf8');
   assert.ok(body.length>0);
   assert.equal(createHash('sha256').update(body).digest('hex'),doc.sha256);
   assert.match(doc.original,/^https:\/\/github.com\//);
  }
 }
 assert.equal(manifest.documents.some(d=>['freecodecamp','30-dias-python'].includes(d.sourceId)),false);
});
