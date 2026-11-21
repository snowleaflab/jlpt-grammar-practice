import './styles.css'

type Choice = {id:string, text:string, reason?:string}
type Question = {id:string, prompt:string, point:string, choices:Choice[], answer:string}
type SetData = {id:string, title:string, questions:Question[]}
type Run = {set:string, order:string[], index:number, answers:Record<string,string>, layouts:Record<string,string[]>}
const sets = Object.values(import.meta.glob<SetData>('./data/sets/*.json', {eager:true, import:'default'}))
const root = document.querySelector<HTMLElement>('#app')!
const key = 'jlpt.practice.v1'
let run: Run | undefined
try { run = JSON.parse(sessionStorage.getItem(key) || 'null') || undefined } catch { /* Fresh session */ }
function save() {
  try { sessionStorage.setItem(key, JSON.stringify(run)) } catch { /* Memory-only session */ }
}
function el(tag:string, content='', cls='') {
  const n=document.createElement(tag)
  n.textContent=content
  n.className=cls
  return n
}
function button(label:string, action:()=>void, cls='') {
  const b=document.createElement('button')
  b.textContent=label
  b.className=cls
  b.onclick=action
  return b
}
function shuffle(ids:string[], previous?:string[]) {
  const out=[...ids]
  for(let i=out.length-1;i>0;i--) {
    const j=Math.floor(Math.random()*(i+1))
    ;[out[i],out[j]]=[out[j],out[i]]
  }
  if(out.length>1 && previous && out.every((id,i)=>id===previous[i])) {
    ;[out[0],out[1]]=[out[1],out[0]]
  }
  return out
}
function home() {
  root.replaceChildren(el('p','JLPT N2','over'),el('h1','問題集'),el('p','練習する問題群を選んでください。','muted'))
  for(const set of sets) {
    const card=el('section','','set')
    card.append(el('p','文法  /  四択','over'),el('h2',set.title),el('p',set.questions.length+' 問','count'),
      button('練習を始める',()=>{
        const layouts=run?.set===set.id ? run.layouts : {}
        run={set:set.id, order:shuffle(set.questions.map(q=>q.id)), index:0, answers:{}, layouts}
        save()
        location.hash='quiz'
      },'primary'))
    root.append(card)
  }
}
function render() {
  if(location.hash!=='#quiz' || !run) return home()
  const r=run
  const set=sets.find(s=>s.id===r.set)
  if(!set || !r.order?.length || !r.order.every(id=>set.questions.some(q=>q.id===id)) || !r.layouts || !r.answers || !Number.isInteger(r.index) || r.index<0 || r.index>r.order.length) return home()
  if(r.index===r.order.length) {
    const count=set.questions.filter(q=>r.answers[q.id]===q.answer).length
    root.replaceChildren(el('p',set.title,'over'),el('h1','練習結果'),el('h2',r.order.length+' 問中 '+count+' 問正解'),button('回答を見直す',()=>move(0),'primary'),button('問題集へ',()=>location.hash='','link'))
    return
  }
  function move(index:number) { r.index=index; save(); render(); window.scrollTo(0,0) }
  const q=set.questions.find(item=>item.id===r.order[r.index])!
  const layout=shuffle(q.choices.map(c=>c.id),r.layouts[q.id])
  r.layouts[q.id]=layout
  save()
  const title=el('div','','title')
  title.append(el('span',set.title),el('b','問 '+(r.index+1)+' / '+r.order.length))
  const bar=document.createElement('progress')
  bar.max=r.order.length
  bar.value=r.index+1
  bar.setAttribute('aria-label','問題の位置')
  const card=el('section','','sheet')
  const stem=el('h1','','stem')
  const [before,after]=q.prompt.split('{{blank}}')
  stem.append(before,el('span','（　　　）','blank'),after)
  const options=el('div','','options')
  const feedback=el('section','','feedback')
  feedback.setAttribute('aria-live','polite')
  const nav=el('nav')
  const next=button(r.index===r.order.length-1?'結果を見る':'次の問題へ',()=>move(r.index+1),'primary')
  const back=button('前の問題へ',()=>move(r.index-1),'link')
  back.disabled=r.index===0
  nav.append(back,next)
  let open=r.answers[q.id]!==q.answer ? r.answers[q.id] : undefined
  function update() {
    const picked=r.answers[q.id]
    options.replaceChildren()
    layout.forEach((id,i)=>{
      const c=q.choices.find(c=>c.id===id)!
      const correct=id===q.answer
      const b=button('',()=>{
        if(!r.answers[q.id]) {
          r.answers[q.id]=id
          open=correct?undefined:id
          save()
        } else if(!correct) open=open===id?undefined:id
        update()
        options.querySelectorAll('button')[i].focus({preventScroll:true})
      },'option'+(picked && correct?' correct':picked===id?' wrong':''))
      b.append(el('span',String(i+1),'num'),el('strong',c.text))
      if(picked) {
        const label=correct?'✓ 正解':(picked===id?'× あなたの回答 · ':'')+(open===id?'閉じる':'理由を見る')
        b.append(el('small',label))
        if(!correct) b.setAttribute('aria-expanded',String(open===id))
      }
      options.append(b)
      if(picked && open===id && !correct) options.append(el('p',c.reason,'reason'))
    })
    feedback.replaceChildren()
    feedback.hidden=!picked
    if(picked) feedback.append(el('h2','文のポイント'),el('p',q.prompt.replace('{{blank}}',q.choices.find(c=>c.id===q.answer)!.text),'complete'),el('p',q.point))
    next.disabled=!picked
  }
  card.append(el('p','最もよいものを一つ選びなさい。','muted'),stem,options,feedback,nav)
  root.replaceChildren(title,bar,card)
  update()
}
window.addEventListener('hashchange',render)
render()
