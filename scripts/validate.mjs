import { readdirSync, readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const dir = 'src/data/sets'
const sets = new Set()
for (const file of readdirSync(dir).filter(f => f.endsWith('.json'))) {
  const set = JSON.parse(readFileSync(dir + '/' + file, 'utf8'))
  assert(set.id && set.title && !sets.has(set.id) && set.questions.length, file)
  sets.add(set.id)
  const ids = new Set()
  for (const q of set.questions) {
    assert(q.id && !ids.has(q.id) && q.prompt.split('{{blank}}').length === 2 && q.point, q.id)
    ids.add(q.id)
    assert(q.choices.length === 4 && new Set(q.choices.map(c => c.id)).size === 4, q.id)
    assert(q.choices.some(c => c.id === q.answer), q.id)
    assert(q.choices.every(c => c.id && c.text && (c.id === q.answer || c.reason)), q.id)
  }
  console.log(set.title, ids.size + '問')
}
assert(sets.size)
