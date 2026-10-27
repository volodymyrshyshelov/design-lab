import { useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { BrowserRepository } from '../infrastructure/local-repository.ts';
import { PortalService } from '../services/portal-service.ts';
import type { CommandResult, RequestRecord, Role, Status } from '../domain/model.ts';
import { Button } from '../components/ui/button.tsx';
import { BlurFade } from '../components/magicui/blur-fade.tsx';
import { NumberTicker } from '../components/magicui/number-ticker.tsx';
import { initialData, views } from './views.ts';

type Concept = 'studio' | 'blueprint' | 'garden';
type Screen = 'overview' | 'requests' | 'new-request' | 'request-detail' | 'settings';
type VisualState = 'ready' | 'loading' | 'empty' | 'error' | 'offline';
interface LocationState { concept: Concept; screen: Screen; role: Role; gallery: boolean; id?: string }
function readLocation(role: Role): LocationState {
  const params = new URLSearchParams(window.location.hash.slice(1));
  return { concept: (['studio', 'blueprint', 'garden'] as const).find(item => item === params.get('concept')) ?? 'studio', screen: (['overview', 'requests', 'new-request', 'request-detail', 'settings'] as const).find(item => item === params.get('screen')) ?? 'overview', role: params.get('role') === 'reviewer' ? 'reviewer' : params.get('role') === 'member' ? 'member' : role, gallery: !params.has('concept') && !params.has('screen'), id: params.get('id') ?? undefined };
}
export function App(): ReactNode {
  const m = views();
  const [service] = useState(() => new PortalService(new BrowserRepository({ getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) }, initialData(), m.storageKey)));
  const state = useSyncExternalStore(service.subscribe, service.snapshot, service.snapshot);
  const [location, setLocation] = useState(() => readLocation(state.role));
  const [visualState, setVisualState] = useState<VisualState>('ready');
  const [online, setOnline] = useState(() => navigator.onLine);
  const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  const [note, setNote] = useState(''); const [query, setQuery] = useState('');
  const [error, setError] = useState(''); const [toast, setToast] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const blocked = !online || visualState === 'error' || visualState === 'offline';
  const current = state.requests.find(item => item.id === location.id) ?? (location.id ? undefined : state.requests[0]);
  const active = state.requests.filter(item => item.status !== 'closed');
  const filtered = state.requests.filter(item => (item.title + ' ' + item.description).toLocaleLowerCase('ru-RU').includes(query.toLocaleLowerCase('ru-RU')));
  const navigate = (screen: Screen, id?: string): void => { setLocation(value => ({ ...value, screen, id, gallery: false })); setError(''); setVisualState('ready'); setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'instant' }); };
  const result = (value: CommandResult, onSuccess?: (id: string) => void): void => {
    if (!value.ok) { setError(m.errors[value.error]); return; }
    setError(''); setToast(m.updated); onSuccess?.(value.id);
  };
  const transition = (item: RequestRecord, status: Status): void => { if (!blocked) result(service.transition(item.id, status, item.version)); };
  const switchRole = (role: Role): void => { result(service.switchRole(role), () => { setLocation(value => ({ ...value, role })); setNote(''); }); };
  useEffect(() => {
    if (state.role !== location.role) service.switchRole(location.role);
    const update = (): void => { if (window.location.hash && !/concept=|screen=/.test(window.location.hash)) return; const next = readLocation(service.snapshot().role); service.switchRole(next.role); setLocation(next); setError(''); };
    const connectivity = (): void => { setOnline(navigator.onLine); if (!navigator.onLine) setVisualState('offline'); else setVisualState(value => value === 'offline' ? 'ready' : value); };
    window.addEventListener('hashchange', update); window.addEventListener('online', connectivity); window.addEventListener('offline', connectivity);
    return () => { window.removeEventListener('hashchange', update); window.removeEventListener('online', connectivity); window.removeEventListener('offline', connectivity); };
  }, [service]);
  useEffect(() => {
    document.documentElement.dataset.activeConcept = location.gallery ? 'studio' : location.concept;
    document.title = m.projectTitle + ' · ' + m.lab;
    const params = new URLSearchParams({ concept: location.concept, screen: location.screen, role: state.role }); if (location.id) params.set('id', location.id);
    history.replaceState({}, '', location.gallery ? window.location.pathname : window.location.pathname + '#' + params.toString());
  }, [location, state.role, m.projectTitle, m.lab]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [location.gallery, location.concept]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 4000); return () => window.clearTimeout(timer); }, [toast]);
  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault(); if (blocked) return;
    result(service.create(title, description), id => { setToast(m.created); setTitle(''); setDescription(''); navigate('request-detail', id); });
  };
  const list = (records: RequestRecord[]): ReactNode => records.length ? <div className="request-list">{records.map(item => <button className="request-row plain" key={item.id} onClick={() => navigate('request-detail', item.id)}><span className="request-text"><strong>{item.title}</strong><small>{item.description}</small></span><span className={'status status-' + item.status}>{m.statuses[item.status]}</span></button>)}</div> : <div className="empty-inline"><p>{m.noMatches}</p><Button onClick={() => navigate('new-request')}>{m.add}</Button></div>;
  const navigation = (): ReactNode => <nav aria-label={m.navigation}>{(['overview', 'requests', 'new-request', 'settings'] as const).map(screen => <button className={'nav-link plain' + (location.screen === screen ? ' selected' : '')} key={screen} aria-current={location.screen === screen ? 'page' : undefined} onClick={() => navigate(screen)}>{m.nav[screen]}</button>)}</nav>;
  let body: ReactNode;
  if (visualState === 'loading') body = <div className="state-panel" role="status"><span className="loading-mark" /><h1>{m.loadingTitle}</h1><p>{m.loadingBody}</p><Button onClick={() => setVisualState('ready')}>{m.retry}</Button></div>;
  else if (visualState === 'empty') body = <div className="state-panel"><h1>{m.emptyTitle}</h1><p>{m.emptyBody}</p><Button onClick={() => navigate('new-request')}>{m.add}</Button></div>;
  else if (location.screen === 'overview') body = <>
    <header className="page-heading overview-heading"><div><h1>{m.heroTitle}</h1><p>{m.heroBody}</p></div><Button onClick={() => navigate('new-request')}>{m.add}</Button></header>
    <div className="overview-layout"><section className="work-panel"><div className="section-heading"><h2>{m.latest}</h2><button className="text-button plain" onClick={() => navigate('requests')}>{m.all}</button></div>{list(state.requests.slice(0, 3))}</section><aside className="summary-panel"><div><span>{m.active}</span><NumberTicker className="metric-value" value={active.length} /></div><div><span>{m.closed}</span><NumberTicker className="metric-value" value={state.requests.length - active.length} /></div><h2>{m.team}</h2><p>{m.teamBody}</p></aside></div>
  </>;
  else if (location.screen === 'requests') body = <><header className="page-heading"><div><h1>{m.nav.requests}</h1><p>{m.queueDescription}</p></div><Button onClick={() => navigate('new-request')}>{m.add}</Button></header><section className="work-panel"><label className="field search-field"><span>{m.search}</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder={m.searchPlaceholder} type="search" /></label>{list(filtered)}</section></>;
  else if (location.screen === 'new-request') body = <><header className="page-heading"><div><h1>{m.nav['new-request']}</h1><p>{m.newDescription}</p></div></header><form className="work-panel form-panel" onSubmit={submit}><label className="field"><span>{m.title}</span><input data-testid="request-title" value={title} minLength={4} maxLength={120} required onChange={event => setTitle(event.target.value)} aria-describedby="title-hint" /><small id="title-hint">{m.titleHint}</small></label><label className="field"><span>{m.description}</span><textarea data-testid="request-description" value={description} minLength={12} maxLength={2000} rows={6} required onChange={event => setDescription(event.target.value)} aria-describedby="description-hint" /><small id="description-hint">{m.descriptionHint}</small></label><Button type="submit" data-testid="submit-request" disabled={blocked}>{m.submit}</Button></form></>;
  else if (location.screen === 'request-detail') body = current ? <><header className="page-heading"><div><button className="text-button plain" onClick={() => navigate('requests')}>{m.back}</button><h1>{current.title}</h1><p>{m.owner}</p></div><span className={'status status-' + current.status} data-testid="record-status">{m.statuses[current.status]}</span></header><div className="detail-layout"><section className="work-panel"><h2>{m.description}</h2><p className="description-copy">{current.description}</p><div className="next-step"><p>{current.status === 'new' ? m.newNext : current.status === 'in-progress' ? m.progressNext : current.status === 'awaiting-confirmation' ? m.reviewNext : m.closedNext}</p>{state.role === 'reviewer' && current.status === 'new' && <Button data-testid="start-request" disabled={blocked} onClick={() => transition(current, 'in-progress')}>{m.start}</Button>}{state.role === 'reviewer' && current.status === 'in-progress' && <Button data-testid="finish-request" disabled={blocked} onClick={() => transition(current, 'awaiting-confirmation')}>{m.finish}</Button>}{state.role === 'member' && current.status === 'awaiting-confirmation' && <Button data-testid="confirm-request" disabled={blocked} onClick={() => transition(current, 'closed')}>{m.confirm}</Button>}</div><small className="record-version">{m.version}: {current.version}</small></section>{state.role === 'reviewer' && <form className="work-panel note-panel" onSubmit={event => { event.preventDefault(); if (!blocked) result(service.note(current.id, note, current.version), () => setNote('')); }}><h2>{m.privateNote}</h2><p>{m.privateHint}</p>{current.internalNote && <blockquote>{current.internalNote}</blockquote>}<label className="field"><span>{m.privateNote}</span><textarea data-testid="private-note" value={note} required maxLength={1000} placeholder={m.notePlaceholder} onChange={event => setNote(event.target.value)} rows={4} /></label><Button variant="secondary" type="submit" disabled={blocked}>{m.saveNote}</Button></form>}</div></> : <section className="work-panel state-panel"><h1>{m.noSelection}</h1><Button onClick={() => navigate('requests')}>{m.back}</Button></section>;
  else body = <><header className="page-heading"><div><h1>{m.nav.settings}</h1><p>{m.settingsDescription}</p></div></header><section className="work-panel form-panel"><label className="check-field"><input data-testid="notifications-toggle" type="checkbox" checked={state.notifications !== false} disabled={blocked} onChange={event => result(service.setNotifications(event.target.checked))} /><span>{m.notifications}</span></label><p>{m.settingsNotice}</p></section></>;
  return <>
    <a className="skip-link" href="#main-content">{m.skip}</a>
    <div className="lab-toolbar"><button className="lab-brand plain" data-testid="lab-gallery" onClick={() => setLocation(value => ({ ...value, gallery: true }))}>{m.lab}</button>{!location.gallery && <div className="lab-controls"><label><span>{m.concept}</span><select data-testid="concept-switch" value={location.concept} onChange={event => setLocation(value => ({ ...value, concept: event.target.value as Concept }))}>{m.concepts.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label><span>{m.role}</span><select data-testid="role-switch" value={state.role} onChange={event => switchRole(event.target.value as Role)}>{m.roleOptions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label><span>{m.screen}</span><select data-testid="screen-switch" value={location.screen} onChange={event => navigate(event.target.value as Screen)}>{m.screens.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label><span>{m.state}</span><select data-testid="state-switch" value={visualState} onChange={event => setVisualState(event.target.value as VisualState)}>{Object.entries(m.states).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label></div>}<span className="demo-badge">{m.prototype}</span></div>
    {location.gallery ? <main className="gallery" id="main-content"><BlurFade duration={0.3} offset={4}><h1>{m.galleryTitle}</h1><p className="gallery-intro">{m.galleryBody}</p></BlurFade><div className="concept-gallery">{m.concepts.map(item => <button className={'concept-card preview-' + item.id + ' plain'} key={item.id} data-testid={'lab-open-' + item.id} onClick={() => setLocation(value => ({ ...value, concept: item.id as Concept, screen: 'overview', gallery: false }))}><div className="direction-preview" aria-hidden="true"><div className="preview-nav"><i /><i /><i /></div><div className="preview-content"><strong>{m.heroTitle}</strong><div className="preview-record"><span>{m.nav.requests}</span><span>{m.statuses.new}</span></div><div className="preview-record"><span>{m.active}</span><b>{active.length}</b></div></div></div><div className="concept-caption"><h2>{item.label}</h2><p>{m.conceptDescriptions[item.id as Concept]}</p><span>{m.open}</span></div></button>)}</div><p className="demo-notice">{m.prototypeBody}</p></main> : <div className="workspace"><aside className="desktop-sidebar"><div className="project-brand">{m.projectTitle}</div>{navigation()}<p>{m.prototype}</p></aside><div className="workspace-main"><header className="project-header"><strong>{m.projectTitle}</strong><span>{m.roles[state.role]}</span><Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}><Dialog.Trigger asChild><button className="mobile-menu plain" data-testid="mobile-menu">{m.menu}</button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="menu-overlay" /><Dialog.Content className="mobile-dialog"><Dialog.Title>{m.projectTitle}</Dialog.Title><Dialog.Description className="sr-only">{m.navigation}</Dialog.Description><Dialog.Close asChild><button className="dialog-close plain">{m.close}</button></Dialog.Close>{navigation()}</Dialog.Content></Dialog.Portal></Dialog.Root></header><main id="main-content" className="screen-content" data-screen-id={location.screen}>{(blocked || error) && <div className="feedback" role="alert"><h2>{error ? m.errorTitle : !online || visualState === 'offline' ? m.offlineTitle : m.errorTitle}</h2><p>{error || (!online || visualState === 'offline' ? m.offlineBody : m.errorBody)}</p>{!error && <Button variant="secondary" onClick={() => setVisualState(online ? 'ready' : 'offline')}>{m.retry}</Button>}</div>}{body}</main><footer className="project-footer">{m.prototypeBody}</footer></div></div>}
    {toast && <div className="toast" role="status">{toast}<button className="plain" onClick={() => setToast('')} aria-label={m.close}>{m.close}</button></div>}
  </>;
}
