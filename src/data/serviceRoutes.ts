import type { ServiceId } from '../recommendationTypes'
// Existing consumer web entry paths; these are not ChatKHU availability claims.
export const officialRoutes: Record<ServiceId,string> = { chatgpt:'https://chatgpt.com/', claude:'https://claude.ai/', gemini:'https://gemini.google.com/',catalog:'https://huggingface.co/models' }
