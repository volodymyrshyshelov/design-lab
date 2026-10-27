import type { PortalRepository, PortalState, RequestRecord, StoragePort } from '../domain/model.ts';

function isRecord(value: unknown): value is RequestRecord {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return ['id', 'title', 'description', 'authorId'].every(key => typeof item[key] === 'string')
    && ['new', 'in-progress', 'awaiting-confirmation', 'closed'].includes(String(item.status))
    && typeof item.version === 'number' && Number.isInteger(item.version) && item.version > 0
    && (item.internalNote === undefined || typeof item.internalNote === 'string');
}
function isState(value: unknown): value is PortalState {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return item.schemaVersion === 1 && ['member', 'reviewer'].includes(String(item.role))
    && (item.notifications === undefined || typeof item.notifications === 'boolean')
    && Array.isArray(item.requests) && item.requests.every(isRecord);
}
export class BrowserRepository implements PortalRepository {
  private storage: StoragePort;
  private seed: PortalState;
  private key: string;
  constructor(storage: StoragePort, seed: PortalState, key = 'design-lab-starter-v1') {
    this.storage = storage; this.seed = seed; this.key = key;
  }
  load(): PortalState {
    try {
      const raw = this.storage.getItem(this.key);
      if (raw) { const value: unknown = JSON.parse(raw); if (isState(value)) return value; }
    } catch (error) { console.warn('Prototype storage read failed', error instanceof Error ? error.name : 'unknown'); }
    return structuredClone(this.seed);
  }
  save(state: PortalState): boolean {
    try { this.storage.setItem(this.key, JSON.stringify(state)); return true; }
    catch (error) { console.warn('Prototype storage write failed', error instanceof Error ? error.name : 'unknown'); return false; }
  }
}
