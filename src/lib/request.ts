import type { PromptRequest } from '../types'

// Old in-memory sessions may still carry removed controls. Discard them before
// comparison, caching or state updates so they cannot affect the current flow.
export function normalizeRequest(request: PromptRequest): PromptRequest {
  const { priority: _priority, usageRoute: _route, ...current } = request as PromptRequest & { priority?: unknown; usageRoute?: unknown }
  return current
}
