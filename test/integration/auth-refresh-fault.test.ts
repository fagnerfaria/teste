import {describe,it,expect,afterEach,vi} from 'vitest';
import {obsidianMockFactory} from '../fakes/obsidian';
vi.mock('obsidian',()=>obsidianMockFactory());
import {bootReady,signIn,MEMORY,syncStateOf,type Handles} from './_helpers';

describe('unavailable OAuth refresh in scheduled and manual sync',()=>{
 let h:Handles|undefined;
 afterEach(async()=>{vi.restoreAllMocks();if(h)await h.teardown();h=undefined;});
 it('surfaces a failed OAuth refresh as a visible sync error instead of leaving green ready',async()=>{
   h=await bootReady();
   await signIn(h);
   await h.plugin.selectVault(MEMORY);
   const plugin=h.plugin as unknown as {
     auth:{getValidToken:()=>Promise<string|null>}
   };
   vi.spyOn(plugin.auth,'getValidToken').mockRejectedValue(new Error('SyntheticOAuthRefreshUnavailable'));
   const result=await h.plugin.syncNow();
   expect(result).toMatchObject({ok:false});
   expect(result.message).toContain('SyntheticOAuthRefreshUnavailable');
   expect(syncStateOf(h)).toBe('error');
 });
});