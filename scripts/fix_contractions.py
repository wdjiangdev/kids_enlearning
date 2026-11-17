# 缩写词（she's = she is）：音标分开写。跑完 split_data 后再跑本脚本。
# 音频：VPS media/au/<id>.mp3 已换成 edge-tts en-GB-SoniaNeural「缩写 + 0.9s 停顿 + 全写」，原录音备份在 media/au_bak/。
import json,glob,os
IPA={748001:"/aɪm/ = /aɪ æm/",748010:"/ɪts/ = /ɪt ɪz/",789828:"/lets/ = /let ʌs/",789859:"/ðeə/ = /ðeɪ ɑː/",
789866:"/wɒts/ = /wɒt ɪz/",728650:"/ʃiːz/ = /ʃiː ɪz/",728651:"/hiːz/ = /hiː ɪz/",775301:"/weəz/ = /weər ɪz/",
775302:"/ˈɪznt/ = /ɪz nɒt/",775339:"/kɑːnt/ = /ˈkænɒt/",775345:"/dəʊnt/ = /duː nɒt/"}
d=os.path.join(os.path.dirname(__file__),'..','web','data'); n=0
for f in glob.glob(d+'/*.json'):
  s=open(f).read(); o=json.loads(s)
  def walk(x):
    global n
    if isinstance(x,dict):
      if x.get('id') in IPA and '=' in str(x.get('en','')): x['ipa']=IPA[x['id']]; x['au']=2; n+=1  # au=2：音频换过，前端加 ?v=2 绕开旧缓存
      for v in x.values(): walk(v)
    elif isinstance(x,list):
      for v in x: walk(v)
  walk(o); open(f,'w').write(json.dumps(o,ensure_ascii=False,separators=(',',':')))
print('fixed',n)
