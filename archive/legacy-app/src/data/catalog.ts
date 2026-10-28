import type { CatalogService, CatalogServiceId } from '../types'
const registrations: [CatalogServiceId, string, string, string[], string, string[]][] = [
  ['chatgpt', 'ChatGPT', 'OpenAI', ['챗GPT'], 'https://chatgpt.com/', ['범용 작업']],
  ['claude', 'Claude', 'Anthropic', ['클로드'], 'https://claude.ai/', ['범용 작업']],
  ['gemini', 'Gemini', 'Google', ['제미나이'], 'https://gemini.google.com/', ['범용 작업']],
  ['kimi', 'Kimi', 'Moonshot AI', ['키미'], 'https://www.kimi.com/', ['문서 탐색']],
  ['grok', 'Grok', 'xAI', ['그록'], 'https://grok.com/', ['범용 작업']],
  ['deepseek', 'DeepSeek', 'DeepSeek', ['딥시크'], 'https://www.deepseek.com/', ['범용 작업']],
  ['qwen', 'Qwen', 'Alibaba', ['통의천문', '알리바바'], 'https://qwen.ai/', ['범용 작업']],
  ['perplexity', 'Perplexity', 'Perplexity AI', ['퍼플렉시티'], 'https://www.perplexity.ai/', ['정보 탐색']],
  ['mistral', 'Mistral Vibe', 'Mistral AI', ['Le Chat', '르샤', '미스트랄'], 'https://mistral.ai/', ['범용 작업']],
  ['copilot', 'Microsoft Copilot', 'Microsoft', ['코파일럿', '마이크로소프트'], 'https://copilot.microsoft.com/', ['범용 작업']],
  ['notebooklm', 'NotebookLM', 'Google', ['노트북LM'], 'https://notebooklm.google.com/', ['자료 탐색']],
  ['firefly', 'Adobe Firefly', 'Adobe', ['파이어플라이', '어도비'], 'https://firefly.adobe.com/', ['이미지 탐색']],
  ['runway', 'Runway', 'Runway', ['런웨이'], 'https://runwayml.com/', ['영상 탐색']],
]
export const researchCoverage = { candidates: 13, firstBatch: 7, partialInBatch: 7, fullyChecked: 0 }
export const catalogServices: CatalogService[] = registrations.map<CatalogService>(([id, name, provider, aliases, url, tags]) => ({
  id, name, provider, aliases, url, tags, letter: name[0], subtitle: '등록과 추천 가능 여부를 구분합니다',
  routes: ['chatgpt', 'claude', 'gemini'].includes(id) ? '개인 웹 채팅 · 앱/API 조건은 별도 확인' : '공식 홈페이지 안내 · 세부 이용 경로 미확인',
  researchStatus: ['chatgpt', 'claude', 'gemini'].includes(id) ? '일부 정보 확인' : '후보 등록',
  unknowns: ['chatgpt', 'claude', 'gemini'].includes(id) ? '계정·지역별 제한, 정확한 평가 모델 연결, 실제 처리 품질 미확인' : '확대 조사 원본 미확보: 플랜·비용·기능·접근 조건의 상세 근거 미확인',
})).sort((a,b) => a.name.localeCompare(b.name, 'en'))
export function searchCatalog(query: string, status = '', route = ''): CatalogService[] {
  const term = query.trim().toLocaleLowerCase()
  return catalogServices.filter(s => [s.name, s.provider, ...s.aliases].some(v => v.toLocaleLowerCase().includes(term)) && (!status || s.researchStatus === status) && (!route || s.routes.includes(route)))
}
export const catalogById = Object.fromEntries(catalogServices.map(s => [s.id, s])) as Record<CatalogServiceId, CatalogService>
