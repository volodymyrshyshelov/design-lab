import { ru } from '../messages/ru.ts';
import manifest from '../../lab.manifest.json';
import type { PortalState } from '../domain/model.ts';
import { projectStorageKey } from '../domain/model.ts';

export function views(): typeof ru & { projectTitle: string; storageKey: string; concepts: typeof manifest.concepts; screens: typeof manifest.screens; roleOptions: typeof manifest.roles } {
  return { ...ru, projectTitle: manifest.title, storageKey: projectStorageKey(manifest.projectId), concepts: manifest.concepts, screens: manifest.screens, roleOptions: manifest.roles };
}
export function initialData(): PortalState {
  return { schemaVersion: 1, role: 'member', notifications: true, requests: ru.seed.map(item => ({ ...item, authorId: 'member', version: 1 })) };
}
