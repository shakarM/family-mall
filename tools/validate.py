import json, sys, itertools
from shapely.geometry import Polygon
d=json.load(open('/tmp/plan.json'))
bad=0
for f in d['floors']:
    out=Polygon(f['outline']); voids=[Polygon(v) for v in f['voids']]
    us=[(u['id'],Polygon(u['poly']),u['kind']) for u in f['units']]
    for id,p,k in us:
        if not p.is_valid: print('INVALID',id); bad+=1
        if not out.buffer(0.01).contains(p): print('OUTSIDE outline',f['n'],id); bad+=1
        for v in voids:
            if p.intersects(v) and not id.startswith('esc'): print('IN VOID',f['n'],id); bad+=1
    mn=(99,None)
    for (a,pa,ka),(b,pb,kb) in itertools.combinations(us,2):
        if a.startswith('esc') and f['n']==2: continue
        if pa.intersects(pb): print('OVERLAP',f['n'],a,b); bad+=1
        d_=pa.distance(pb)
        if d_<mn[0]: mn=(d_,(a,b))
        if d_<0.9 and ka=='store' and kb=='store': print('TIGHT',f['n'],a,b,round(d_,2)); bad+=1
    print('floor',f['n'],'min gap between units',round(mn[0],2),mn[1])
print('problems:',bad)
