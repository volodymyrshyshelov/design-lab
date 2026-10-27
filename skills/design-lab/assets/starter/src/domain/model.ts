export type Role = 'member' | 'reviewer';
export type Status = 'new' | 'in-progress' | 'awaiting-confirmation' | 'closed';
export interface RequestRecord {
  id: string;
  title: string;
  description: string;
  authorId: string;
  status: Status;
  version: number;
  internalNote?: string;
}
export interface PortalState {
  schemaVersion: 1;
  role: Role;
  notifications?: boolean;
  requests: RequestRecord[];
}
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export interface PortalRepository {
  load(): PortalState;
  save(state: PortalState): boolean;
}
export type ErrorCode = 'validation' | 'forbidden' | 'conflict' | 'transition' | 'missing' | 'storage';
export type CommandResult = { ok: true; id: string } | { ok: false; error: ErrorCode };
export function projectStorageKey(projectId: string): string { return 'design-lab:' + projectId + ':v1'; }
