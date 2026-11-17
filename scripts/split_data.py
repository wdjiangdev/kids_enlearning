import json,os,sys
SRC=sys.argv[1]; MEDIA=sys.argv[2]; OUT='web/data'
B=json.load(open(SRC)); idx=[]
for b in B:
  units=[]
  for u in b['units']:
    ws=[]
    for w in u['words']:
      d={'id':w['id'],'en':w['en'],'zh':w['zh'],'ipa':w['ipa']}
      if os.path.exists(f"{MEDIA}/img/{w['id']}.webp"): d['img']=1
      if os.path.exists(f"{MEDIA}/au/{w['id']}.mp3"): d['au']=1
      ws.append(d)
    la=os.path.exists(f"{MEDIA}/lesson/{u['id']}.mp3")
    units.append({'id':u['id'],'no':u['no'],'title':u['title'],'words':ws,'sents':u['sents'],'la':1 if la else 0})
  json.dump({'id':b['id'],'name':b['name'],'edition':b['edition'],'units':units},open(f"{OUT}/{b['id']}.json",'w'),ensure_ascii=False,separators=(',',':'))
  idx.append({'id':b['id'],'name':b['name'],'edition':b['edition'],'units':[{'id':u['id'],'no':u['no'],'title':u['title'],'n':len(u['words']),'s':len(u['sents'])} for u in units]})
json.dump(idx,open(f'{OUT}/index.json','w'),ensure_ascii=False,separators=(',',':'))
print('ok',sum(len(u['units']) for u in idx))
