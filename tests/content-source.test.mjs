import test from 'node:test';
import assert from 'node:assert/strict';
import {publishedSnapshot,contentRevision,canResumeDraft} from '../content-source.js';

test('browser drafts resume only against their original content snapshot',async()=>{
 const data={items:[{id:'mda',status:'published',title:'Reading: M.D.A.'}]};
 const revision=await contentRevision(data);
 assert.equal(canResumeDraft(revision,await contentRevision(structuredClone(data))),true);
 data.items[0].title='Updated research';
 assert.equal(canResumeDraft(revision,await contentRevision(data)),false);
 assert.equal(canResumeDraft(null,revision),false);
});

test('workspace comparison excludes unpublished entries without changing the workspace',()=>{
 const data={items:[{id:'public',status:'published'},{id:'private',status:'draft'}],site:{brand:'Studio'}};
 assert.deepEqual(publishedSnapshot(data),{items:[data.items[0]],site:data.site});
 assert.equal(data.items.length,2);
});
