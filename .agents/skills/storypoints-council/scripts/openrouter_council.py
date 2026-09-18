#!/usr/bin/env python3
import argparse,csv,json,os,sys,urllib.request,random,re
from datetime import datetime,timezone
from io import StringIO
from pathlib import Path

def evidence(folder):
 out=[]
 for p in sorted(Path(folder).rglob('*')):
  if p.is_file() and p.stat().st_size < 2_000_000:
   try: out.append(f'FILE: {p.name}\n'+p.read_text(errors='replace'))
   except Exception: pass
 return '\n\n'.join(out)
def load_config(path):
 cfg={}
 p=Path(path)
 if not p.is_file():
  raise FileNotFoundError(f'Config file not found: {p}')
 for n,raw in enumerate(p.read_text(errors='replace').splitlines(),1):
  line=raw.strip()
  if not line or line.startswith('#'): continue
  if '=' not in line: raise ValueError(f'Invalid config line {n}: expected KEY=VALUE')
  key,val=line.split('=',1); key=key.strip(); val=val.strip()
  if not re.fullmatch(r'[A-Z][A-Z0-9_]*',key): raise ValueError(f'Invalid config key on line {n}: {key}')
  cfg[key]=val
 return cfg

def scalar(value):
 value=(value or '').strip()
 if len(value)>=2 and value[0]==value[-1] and value[0] in "'\"": return value[1:-1].strip()
 return value

def model_list(value):
 # Accept either comma-separated bare IDs or individually quoted IDs, e.g.
 # 'anthropic/a','google/b', 'openai/c'
 return [scalar(x) for x in (value or '').split(',') if scalar(x)]

def boolean(value,key,default):
 value=scalar(value).lower()
 if not value: return default
 if value=='true': return True
 if value=='false': return False
 raise ValueError(f'{key} must be true or false.')

def on_off(value,key,default='off'):
 value=scalar(value).lower() or default
 if value in {'on','off'}: return value=='on'
 raise ValueError(f'{key} must be On or Off.')

def task_fields(task):
 try:
  value=json.loads(task)
  if isinstance(value,dict):
   return value
 except (json.JSONDecodeError,TypeError):
  pass
 try:
  rows=list(csv.DictReader(StringIO(task)))
  if len(rows)==1: return rows[0]
 except (csv.Error,TypeError):
  pass
 return {}

def final_fields(final):
 fields={}
 for line in final.strip().splitlines():
  if ': ' in line:
   key,value=line.split(': ',1); fields[key]=value
 required=('Story Points','Confidence','Closest historical analogs','Rationale')
 if any(not fields.get(key) for key in required):
  raise ValueError('Chairman response is missing one or more required output fields.')
 if fields['Story Points'] not in {'1','2','3','5','8','13','21'}:
  raise ValueError('Chairman response contains an invalid story-point value.')
 if fields['Confidence'] not in {'High','Medium','Low'}:
  raise ValueError('Chairman response contains an invalid confidence value.')
 return fields

def output_path(config_path,output_folder):
 folder=Path(output_folder).expanduser()
 if not folder.is_absolute(): folder=Path(config_path).resolve().parent/folder
 folder.mkdir(parents=True,exist_ok=True)
 return folder

def append_report(config_path,output_folder,task,final,run_at=None):
 folder=output_path(config_path,output_folder)
 report=folder/'estimation-output.csv'; metadata=task_fields(task); result=final_fields(final)
 run_at=run_at or datetime.now(timezone.utc)
 columns=('timestamp','task_id','title','task_description','estimated_story_points','confidence','closest_historical_analogs','rationale')
 row={
  'timestamp':run_at.isoformat(),
  'task_id':metadata.get('test_id') or metadata.get('task_id') or metadata.get('id') or '',
  'title':metadata.get('title') or '',
  'task_description':metadata.get('description') or metadata.get('task_description') or '',
  'estimated_story_points':result['Story Points'],
  'confidence':result['Confidence'],
  'closest_historical_analogs':result['Closest historical analogs'],
  'rationale':result['Rationale'],
 }
 write_header=not report.exists() or report.stat().st_size==0
 with report.open('a',newline='',encoding='utf-8') as handle:
  writer=csv.DictWriter(handle,fieldnames=columns)
  if write_header: writer.writeheader()
  writer.writerow(row)

def write_debate(config_path,output_folder,task,models,first,reviews,chairman,final,run_at=None):
 folder=output_path(config_path,output_folder); metadata=task_fields(task); result=final_fields(final)
 run_at=run_at or datetime.now(timezone.utc)
 task_id=metadata.get('test_id') or metadata.get('task_id') or metadata.get('id') or 'UNKNOWN'
 safe_task_id=re.sub(r'[^A-Za-z0-9._-]+','_',str(task_id)).strip('._') or 'UNKNOWN'
 timestamp=run_at.strftime('%Y%m%dT%H%M%SZ')
 path=folder/f'{safe_task_id}_council_{timestamp}.json'
 artifact={
  'timestamp':run_at.isoformat(),
  'task_id':task_id,
  'title':metadata.get('title') or '',
  'estimations':[{'model':model,'status':'succeeded' if model in first else 'failed','output':first.get(model)} for model in models],
  'peer_reviews':[{'model':model,'status':'succeeded' if model in reviews else 'failed','output':reviews.get(model)} for model in models],
  'final_result':{
   'chairman_model':chairman,
   'story_points':result['Story Points'],
   'confidence':result['Confidence'],
   'closest_historical_analogs':result['Closest historical analogs'],
   'rationale':result['Rationale'],
  },
 }
 path.write_text(json.dumps(artifact,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
 return path

def methodology():
 p=Path(__file__).resolve().parent.parent/'references'/'openrouter-estimation-methodology.md'
 return p.read_text(errors='replace')

def call(model,prompt,key):
 data=json.dumps({'model':model,'messages':[{'role':'user','content':prompt}]}).encode()
 req=urllib.request.Request('https://openrouter.ai/api/v1/chat/completions',data=data,headers={'Authorization':f'Bearer {key}','Content-Type':'application/json','HTTP-Referer':'https://localhost/storypoints-council','X-Title':'Story Points Council'})
 with urllib.request.urlopen(req,timeout=180) as r: return json.load(r)['choices'][0]['message']['content']
def main():
 default_config=Path(__file__).resolve().parent.parent/'storypoints-council.openrouter.conf'
 ap=argparse.ArgumentParser(); ap.add_argument('--history',required=True); ap.add_argument('--task',required=True); ap.add_argument('--config',default=default_config); ap.add_argument('--models'); gate=ap.add_mutually_exclusive_group(); gate.add_argument('--clarifications-complete',action='store_true'); gate.add_argument('--continue-without-clarifications',action='store_true'); a=ap.parse_args()
 try: cfg=load_config(a.config)
 except Exception as e: sys.exit(f'Configuration error: {e}')
 key=scalar(cfg.get('OPENROUTER_API_KEY'))
 if not key or key=='HERE GOES MY APIKEY': sys.exit('Configuration error: set OPENROUTER_API_KEY in the config file.')
 models=model_list(a.models) if a.models else model_list(cfg.get('STORYPOINT_COUNCIL_MODELS'))
 if len(models)<2: sys.exit('Need at least two OpenRouter council models.')
 output_folder=scalar(cfg.get('OUTPUT_FOLDER'))
 if not output_folder: sys.exit('Configuration error: set OUTPUT_FOLDER in the config file.')
 try:
  boolean(cfg.get('REQUEST_OPENROUTER_APPROVAL'),'REQUEST_OPENROUTER_APPROVAL',True)
  debate_output=on_off(cfg.get('COUNCIL_DEBATE_OUTPUT'),'COUNCIL_DEBATE_OUTPUT')
  clarification_gate=on_off(cfg.get('ASK_CLARIFICATION_QUESTIONS_FOR_ESTIMATION'),'ASK_CLARIFICATION_QUESTIONS_FOR_ESTIMATION')
 except ValueError as e: sys.exit(f'Configuration error: {e}')
 if clarification_gate and not (a.clarifications_complete or a.continue_without_clarifications):
  sys.exit('Clarification preflight required. Rerun with --clarifications-complete after questions are answered or none are generated, or with --continue-without-clarifications only after the user explicitly confirms the unchanged task should proceed.')
 task=Path(a.task).read_text(errors='replace') if Path(a.task).is_file() else a.task; hist=evidence(a.history)
 contract=methodology() + '\n\nIMPORTANT COUNCIL RESPONSE RULE: Give concise conclusions and evidence only; do not expose hidden chain-of-thought.'
 first={}
 for m in models:
  try: first[m]=call(m,f'{contract}\nNEW TASK:\n{task}\nHISTORY:\n{hist}\nReturn proposed points, confidence, up to 3 analog IDs with points, and concise rationale.',key)
  except Exception as e: print(f'WARN {m}: {e}',file=sys.stderr)
 if len(first)<2: sys.exit('Fewer than two estimators succeeded.')
 labels={m:chr(65+i) for i,m in enumerate(first)}; reviews={}
 for reviewer in first:
  peers=[(labels[m],v) for m,v in first.items() if m!=reviewer]; random.shuffle(peers)
  text='\n\n'.join(f'Proposal {l}:\n{v}' for l,v in peers)
  try: reviews[reviewer]=call(reviewer,f'{contract}\nBlindly review and rank these proposals by consistency with historical anchors. Flag missed scope/uncertainty/dependencies/integration/testing/risk and productivity-driven deflation.\n{text}',key)
  except Exception as e: print(f'WARN review {reviewer}: {e}',file=sys.stderr)
 chairman=scalar(cfg.get('STORYPOINT_CHAIRMAN_MODEL')) or models[0]
 packet='\n\n'.join(f'Proposal {labels[m]}:\n{v}\nReview by reviewer {labels[m]}:\n{reviews.get(m,"Unavailable")}' for m,v in first.items())
 final=call(chairman,f'''{contract}\nYou are chairman. Synthesize; do not mechanically average or majority-vote. A minority may win if it found decisive overlooked complexity. Confidence combines historical evidence quality and convergence. Output EXACTLY four lines:\nStory Points: <1|2|3|5|8|13|21>\nConfidence: <High|Medium|Low>\nClosest historical analogs: <up to 3 real IDs with points, or None>\nRationale: <concise auditable synthesis>\nNEW TASK:\n{task}\nHISTORY:\n{hist}\nCOUNCIL:\n{packet}''',key)
 try:
  run_at=datetime.now(timezone.utc)
  append_report(a.config,output_folder,task,final,run_at)
  if debate_output: write_debate(a.config,output_folder,task,models,first,reviews,chairman,final,run_at)
 except Exception as e: sys.exit(f'Report error: {e}')
 print(json.dumps({'models':list(first),'chairman':chairman,'first':first,'reviews':reviews},indent=2),file=sys.stderr); print(final.strip())
if __name__=='__main__': main()
