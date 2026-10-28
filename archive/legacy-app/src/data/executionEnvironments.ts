import type { ExecutionEnvironment } from '../types'

// Populate only from an actual ChatKHU model selector and scoped tool evidence.
// Consumer-service catalog entries are NOT evidence of ChatKHU availability.
// See docs/superagent-comparison-protocol.md for the evidence capture form.
export const chatkhuEnvironment: ExecutionEnvironment = {
  id: 'chatkhu', name: 'ChatKHU', url: null,
  note: '이번 비교 실험의 실행 환경입니다. 실제 선택 가능한 모델·버전·모드·도구·접속 경로 근거는 아직 제공되지 않았습니다. API를 연결하지 않습니다.',
  models: [],
}
