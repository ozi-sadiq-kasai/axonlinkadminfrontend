import {afterEach,expect,it,vi} from 'vitest';
import {getDashboard,getClassificationRequests} from '../authentication/authApi';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it('dashboard browser deadline exceeds proxy deadline while other requests retain default',async()=>{
 const timers=vi.spyOn(globalThis,'setTimeout');
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,status:200,headers:{get:()=> 'application/json'},json:async()=>({requests:[]})}));
 await getDashboard();expect(timers.mock.calls.some(call=>call[1]===(import.meta.env.DEV?40000:25000))).toBe(true);
 timers.mockClear();await getClassificationRequests('REJECTED');expect(timers.mock.calls.some(call=>call[1]===15000)).toBe(true);expect(fetch.mock.calls.at(-1)[0]).toContain('status=REJECTED');
});
