import { recommendationSnapshot } from '../src/data/recommendationSnapshot.ts'
import { saveEstimation } from './estimate-core.ts'
const result=await saveEstimation(recommendationSnapshot)
console.log(JSON.stringify({computedAt:result.computedAt,datasetHash:result.datasetHash,comparisons:result.attempts.length,passed:result.attempts.filter(r=>r.passed).length,retained:result.published.filter(r=>r.stale).length,lastExternalCollectionAt:result.lastExternalCollectionAt}))
