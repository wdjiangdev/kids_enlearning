import json,re,csv,sys,os
sys.path.insert(0,'/workspace/work/english-learning/scripts')
from normalize import ipa as norm_ipa
csv.field_size_limit(10**9)
X=json.load(open('/workspace/work/extra/books_extra.json'))
if os.path.exists('/workspace/work/extra/peppa.json'): X.append(json.load(open('/workspace/work/extra/peppa.json')))
YL=json.load(open('/workspace/work/yl/books.json'))
key=lambda en: en.lower().replace('’',"'").strip(' .!?')
byk={}
for b in YL:
  for u in b['units']:
    for w in u['words']:
      byk.setdefault(key(w['en']),w)
need=set(t.lower() for b in X for u in b['units'] for w in u['words'] for t in re.findall(r"[A-Za-z][A-Za-z'\-]*",w['en']))
need|={t[:-3]+'y' for t in need}|{t[:-1] for t in need}|{t[:-2] for t in need}|{t[:-4] for t in need}
ec={}
for r in csv.DictReader(open('/workspace/work/yl/ecdict.csv',encoding='utf-8')):
  k=r['word'].lower()
  if k in need and r['phonetic'] and k not in ec: ec[k]=r['phonetic']
def ipa(en):
  toks=re.findall(r"[A-Za-z][A-Za-z'\-]*",en)
  if not toks or len(toks)>4: return ''
  ps=[]
  for t in toks:
    t=t.lower(); p=ec.get(t); suf=''
    if not p and t.endswith('ies') and ec.get(t[:-3]+'y'): p=ec[t[:-3]+'y']; suf='z'
    elif not p and t.endswith('es') and ec.get(t[:-2]) and t[-3] in 'sxh': p=ec[t[:-2]]; suf='ɪz'; t=t[:-2]
    elif not p and t.endswith('s') and ec.get(t[:-1]): p=ec[t[:-1]]; t=t[:-1]; suf='s' if t[-1] in 'ptkf' else 'z'
    elif not p and t.endswith('ing') and ec.get(t[:-4]): p=ec[t[:-4]]; t=t[:-4]; suf='ɪŋ'
    if not p: return ''
    ps.append(norm_ipa(t,p,{t:p}).strip('/')+suf)
  return '/'+' '.join(ps)+'/'
MEDIA='/workspace/work/yl/media'
idx=json.load(open('web/data/index.json')); idx=[b for b in idx if b.get('cat')!='extra']
EMO={}
hit=tot=0
for b in X:
  units=[]
  for u in b['units']:
    ws=[]
    for i,w in enumerate(u['words']):
      tot+=1; en=w['en'].strip(); k0=key(en); m=byk.get(k0) or byk.get(k0[:-1] if k0.endswith('s') else k0+'s') or byk.get(k0[:-2] if k0.endswith('es') else '') or byk.get(k0[:-3]+'y' if k0.endswith('ies') else '')
      d={'id':m['id'] if m else f"{b['id']}-{u['no']}-{i}",'en':en,'zh':w['zh'],'ipa':(m['ipa'] if m and m['ipa'] and key(m['en'])==k0 else ipa(en))}
      if m:
        hit+=1
        if os.path.exists(f"{MEDIA}/img/{m['id']}.webp"): d['img']=1
        if os.path.exists(f"{MEDIA}/au/{m['id']}.mp3") and key(m['en'])==k0: d['au']=1
        if key(m['en'])!=k0: d['id']=f"{b['id']}-{u['no']}-{i}"; d['im']=m['id']
      if b['id'].startswith('ST'): d.pop('au',None); d['us']=1
      ws.append(d)
    ss=[{'en':p['en'],'zh':p['zh'],'p':1,**({'us':1} if b['id'].startswith('ST') else {})} for p in u.get('patterns',[])]
    title=u['title'] if b['id']=='PP1' else (f"Unit {u['no']} " if u['no'] else '')+u['title']
    units.append({'id':f"{b['id']}-U{u['no']}",'no':u['no'],'title':title,'words':ws,'sents':ss,'la':0})
  short={'ST1':'Show and Tell 1','ST2':'Show and Tell 2','PU1':'Power Up 1','PP1':'小猪佩奇 第1季'}[b['id']]
  pub={'ST1':'牛津 Oxford','ST2':'牛津 Oxford','PU1':'剑桥 Cambridge','PP1':'Peppa Pig · 动画'}[b['id']]
  json.dump({'id':b['id'],'name':short,'edition':pub,'cat':'extra','units':units},open(f"web/data/{b['id']}.json",'w'),ensure_ascii=False,separators=(',',':'))
  idx.append({'id':b['id'],'name':short,'edition':pub,'cat':'extra','units':[{'id':u['id'],'no':u['no'],'title':u['title'],'n':len(u['words']),'s':len(u['sents'])} for u in units]})
json.dump(idx,open('web/data/index.json','w'),ensure_ascii=False,separators=(',',':'))
noipa=[w['en'] for b in X for u in b['units'] for w in u['words'] if not ipa(w['en']) and not byk.get(key(w['en']))]
print('reuse',hit,'/',tot,'noipa',len(noipa),noipa[:40])
