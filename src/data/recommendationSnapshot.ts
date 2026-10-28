import { baselineSnapshot } from './baselineSnapshot.ts'
import rawRefresh from './refresh-snapshot.json' with {type:'json'}
import { mergeRefreshSnapshot } from '../lib/refreshSnapshot.ts'
import type { PublicRefresh } from '../lib/refreshSnapshot.ts'

// Source adapters validate whole responses before these patches can be published.
const refresh=rawRefresh as PublicRefresh
export const recommendationSnapshot=mergeRefreshSnapshot(baselineSnapshot,refresh)
export { refresh }
