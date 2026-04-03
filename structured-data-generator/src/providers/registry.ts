import type { FormatProvider, DomainAdapter, FormatId, DomainType } from './types.js';

const providers = new Map<FormatId, FormatProvider>();
const domainAdapters = new Map<DomainType, DomainAdapter>();

export function registerProvider(provider: FormatProvider): void {
  providers.set(provider.formatId, provider);
}

export function registerDomain(adapter: DomainAdapter): void {
  domainAdapters.set(adapter.domain, adapter);
}

export function getProvider(formatId: FormatId): FormatProvider {
  const p = providers.get(formatId);
  if (!p) throw new Error(`Unknown format: ${formatId}. Available: ${[...providers.keys()].join(', ')}`);
  return p;
}

export function getDomainAdapter(provider: FormatProvider): DomainAdapter {
  const a = domainAdapters.get(provider.domain);
  if (!a) throw new Error(`No domain adapter for: ${provider.domain}`);
  return a;
}

export function getDomainAdapterByType(domain: DomainType): DomainAdapter {
  const a = domainAdapters.get(domain);
  if (!a) throw new Error(`No domain adapter for: ${domain}`);
  return a;
}

export function getProvidersForDomain(domain: DomainType): FormatProvider[] {
  return [...providers.values()].filter((p) => p.domain === domain);
}

export function getRandomProviderForDomain(domain: DomainType): FormatProvider {
  const list = getProvidersForDomain(domain);
  if (!list.length) throw new Error(`No providers for domain: ${domain}`);
  return list[Math.floor(Math.random() * list.length)];
}

export function listFormats(): FormatId[] {
  return [...providers.keys()];
}

export function listDomains(): DomainType[] {
  return [...domainAdapters.keys()];
}
