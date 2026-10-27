import type { CommandResult, PortalRepository, PortalState, RequestRecord, Role, Status } from '../domain/model.ts';

export class PortalService {
  private repository: PortalRepository;
  private state: PortalState;
  private view: PortalState;
  private listeners = new Set<() => void>();
  constructor(repository: PortalRepository) {
    this.repository = repository; this.state = repository.load(); this.view = this.project();
  }
  snapshot = (): PortalState => this.view;
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  private project(): PortalState {
    return { ...this.state, requests: this.state.requests.filter(item => this.state.role === 'reviewer' || item.authorId === 'member').map(item => {
      if (this.state.role === 'reviewer') return { ...item };
      const { internalNote: _internalNote, ...visible } = item; return visible;
    }) };
  }
  private commit(next: PortalState, id: string): CommandResult {
    if (!this.repository.save(next)) return { ok: false, error: 'storage' };
    this.state = next; this.view = this.project(); this.listeners.forEach(listener => listener()); return { ok: true, id };
  }
  switchRole(role: Role): CommandResult { return this.commit({ ...this.state, role }, role); }
  setNotifications(notifications: boolean): CommandResult { return this.commit({ ...this.state, notifications }, 'preferences'); }
  create(title: string, description: string): CommandResult {
    if (title.trim().length < 4 || title.trim().length > 120 || description.trim().length < 12 || description.trim().length > 2000) return { ok: false, error: 'validation' };
    const id = 'request-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    const item: RequestRecord = { id, title: title.trim(), description: description.trim(), authorId: 'member', status: 'new', version: 1 };
    return this.commit({ ...this.state, requests: [item, ...this.state.requests] }, id);
  }
  transition(id: string, status: Status, version: number): CommandResult {
    const item = this.state.requests.find(record => record.id === id);
    if (!item) return { ok: false, error: 'missing' };
    const permitted = this.state.role === 'reviewer' ? ['in-progress', 'awaiting-confirmation'].includes(status) : status === 'closed' && item.authorId === 'member';
    if (!permitted) return { ok: false, error: 'forbidden' };
    if (item.version !== version) return { ok: false, error: 'conflict' };
    const nextStatus: Partial<Record<Status, Status>> = { new: 'in-progress', 'in-progress': 'awaiting-confirmation', 'awaiting-confirmation': 'closed' };
    if (nextStatus[item.status] !== status) return { ok: false, error: 'transition' };
    return this.commit({ ...this.state, requests: this.state.requests.map(record => record.id === id ? { ...record, status, version: record.version + 1 } : record) }, id);
  }
  note(id: string, text: string, version: number): CommandResult {
    if (this.state.role !== 'reviewer') return { ok: false, error: 'forbidden' };
    const item = this.state.requests.find(record => record.id === id);
    if (!item) return { ok: false, error: 'missing' };
    if (item.version !== version) return { ok: false, error: 'conflict' };
    if (!text.trim() || text.trim().length > 1000) return { ok: false, error: 'validation' };
    return this.commit({ ...this.state, requests: this.state.requests.map(record => record.id === id ? { ...record, internalNote: text.trim(), version: record.version + 1 } : record) }, id);
  }
}
