import raw from './provider-catalog.json' with {type:'json'}
import type { ProviderCatalog } from '../providerTypes'

export const providerCatalog=raw as ProviderCatalog
