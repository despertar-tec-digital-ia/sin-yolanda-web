// One build/scheduler projection, preserving the independent USA and GDL approvals.
import { createHash } from 'node:crypto';
import { projectPublicAgenda } from './public-agenda.mjs';
import { projectGdlAgenda } from './gdl-approved.mjs';

export function projectAllAgendas(root, options) {
  const usa = projectPublicAgenda(root, options), gdl = projectGdlAgenda(root, options);
  if (!gdl.metadata) return usa;
  const files = new Map([...usa.files, ...gdl.files]);
  const hash = value => createHash('sha256').update(value).digest('hex');
  if (files.has('houston.html')) files.set('houston.html', files.get('houston.html').replace(/ data-agenda-render-digest="[a-f0-9]+"/, ''));
  const renderDigest = hash(JSON.stringify([...files].map(([file, value]) => [file, hash(value)])));
  if (files.has('houston.html')) files.set('houston.html', files.get('houston.html').replace('class="sy-agenda"', 'class="sy-agenda" data-agenda-render-digest="' + renderDigest + '"'));
  const transitions = [usa.metadata?.nextTransitionAt, gdl.metadata.nextTransitionAt].filter(Boolean).sort();
  return { files, metadata: { ...usa.metadata, renderDigest, gdlApprovalDigest: gdl.metadata.approvalDigest,
    visibleIds: [...(usa.metadata?.visibleIds ?? []), ...gdl.metadata.visibleIds], nextTransitionAt: transitions[0] ?? null } };
}
