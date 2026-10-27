import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserRepository } from '../../src/infrastructure/local-repository.ts';
import { PortalService } from '../../src/services/portal-service.ts';
import type { PortalState, StoragePort } from '../../src/domain/model.ts';
import { projectStorageKey } from '../../src/domain/model.ts';

class MemoryStorage implements StoragePort {
  private values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}
function seed(): PortalState {
  return { schemaVersion: 1, role: 'member', requests: [{ id: 'seed-1', title: 'Synthetic item', description: 'Synthetic description', authorId: 'member', status: 'new', version: 1, internalNote: 'Internal only' }] };
}
function setup(storage: StoragePort = new MemoryStorage()): PortalService {
  return new PortalService(new BrowserRepository(storage, seed()));
}
test('created_record_survives_repository_reload_and_role_switch', () => {
  const storage = new MemoryStorage(); const service = setup(storage);
  const result = service.create('A new task', 'A meaningful description');
  assert.equal(result.ok, true); if (!result.ok) return;
  service.switchRole('reviewer');
  const reloaded = setup(storage);
  assert.equal(reloaded.snapshot().role, 'reviewer');
  assert.equal(reloaded.snapshot().requests.find(item => item.id === result.id)?.title, 'A new task');
});
test('shared_workflow_requires_authorized_actor_and_expected_version', () => {
  const service = setup();
  assert.deepEqual(service.transition('seed-1', 'in-progress', 1), { ok: false, error: 'forbidden' });
  service.switchRole('reviewer');
  assert.equal(service.transition('seed-1', 'in-progress', 1).ok, true);
  assert.deepEqual(service.transition('seed-1', 'awaiting-confirmation', 1), { ok: false, error: 'conflict' });
  assert.equal(service.transition('seed-1', 'awaiting-confirmation', 2).ok, true);
  assert.deepEqual(service.transition('seed-1', 'closed', 3), { ok: false, error: 'forbidden' });
  service.switchRole('member');
  assert.equal(service.transition('seed-1', 'closed', 3).ok, true);
});
test('member_projection_excludes_internal_note_and_other_members_records', () => {
  const data = seed();
  data.requests.push({ id: 'other-1', title: 'Another member task', description: 'Not visible to the current member', authorId: 'other-member', status: 'new', version: 1 });
  const service = new PortalService(new BrowserRepository(new MemoryStorage(), data));
  assert.equal(service.snapshot().requests.length, 1);
  assert.equal(service.snapshot().requests[0].internalNote, undefined);
  service.switchRole('reviewer');
  assert.equal(service.snapshot().requests.length, 2);
  assert.equal(service.snapshot().requests[0].internalNote, 'Internal only');
  assert.equal(service.note('seed-1', 'New internal note', 1).ok, true);
  service.switchRole('member');
  assert.equal(JSON.stringify(service.snapshot()).includes('New internal note'), false);
});
test('invalid_input_leaves_state_unchanged', () => {
  const service = setup(); const before = JSON.stringify(service.snapshot());
  assert.deepEqual(service.create(' ', 'too short'), { ok: false, error: 'validation' });
  assert.equal(JSON.stringify(service.snapshot()), before);
});
test('invalid_saved_state_falls_back_to_the_provided_synthetic_seed', () => {
  const storage = new MemoryStorage();
  storage.setItem('design-lab-starter-v1', JSON.stringify({ schemaVersion: 1, role: 'reviewer', requests: [{ id: 'broken' }] }));
  assert.equal(setup(storage).snapshot().requests[0].id, 'seed-1');
});
test('repeated_transition_is_rejected_without_mutating_the_record', () => {
  const service = setup(); service.switchRole('reviewer');
  service.transition('seed-1', 'in-progress', 1);
  assert.deepEqual(service.transition('seed-1', 'in-progress', 2), { ok: false, error: 'transition' });
  assert.equal(service.snapshot().requests[0].version, 2);
});
test('separate_project_ids_keep_browser_records_independent_on_one_origin', () => {
  const storage = new MemoryStorage();
  const first = new PortalService(new BrowserRepository(storage, seed(), projectStorageKey('first')));
  const second = new PortalService(new BrowserRepository(storage, seed(), projectStorageKey('second')));
  first.create('Only in first project', 'A description for the first project');
  second.switchRole('reviewer');
  const firstReloaded = new PortalService(new BrowserRepository(storage, seed(), projectStorageKey('first')));
  assert.equal(firstReloaded.snapshot().requests.length, 2);
  assert.equal(firstReloaded.snapshot().role, 'member');
  assert.equal(second.snapshot().requests.length, 1);
  assert.equal(second.snapshot().role, 'reviewer');
});
