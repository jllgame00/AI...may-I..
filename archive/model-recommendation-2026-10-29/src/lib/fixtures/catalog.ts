import { interpretTask } from '../aiGuide.ts'
import { referenceCandidatesForTask, interpretRequest } from '../recommend.ts'
import { recommendationSnapshot } from '../../data/recommendationSnapshot.ts'
import type { PromptRequest } from '../../types.ts'
import type { RecommendationSnapshot } from '../../recommendationTypes.ts'

// Full catalog evidence is retained independently of the consumer selection flow.
export function referenceComparison(request:PromptRequest,data:RecommendationSnapshot=recommendationSnapshot) {
  const analysis=interpretTask(request)
  return {...referenceCandidatesForTask(request.tasks?.[0] ?? interpretRequest(request.text).tasks[0] ?? 'analysis', {text:request.text}, analysis.requiredFeatures, data),analysis}
}
