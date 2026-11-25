// Reuse the approved event renderer with a reviewed operating-hours provider.
// Event copy, start/end claims, artwork, feeds and booking behavior remain owned by their sources.
import {applyNovemberHtml} from '../editorial/november-2026-programming.mjs';
import {eventMediaRecords} from '../editorial/event-media.mjs';
import {createGbpHoursModel, REVIEWED_USA_BRANCHES} from '../../assets/js/gbp-hours-model.js';
import {reviewedHoursData} from './reviewed-hours.mjs';

export function projectReviewedEventClock({pages, now, hoursData = reviewedHoursData} = {}) {
  const hoursModel = createGbpHoursModel(hoursData), data = eventMediaRecords();
  const files = new Map(), changes = [], transitions = [], visibleIds = new Set();
  for (const id of REVIEWED_USA_BRANCHES) for (const language of ['es', 'en']) {
    const file = language === 'es' ? id + '.html' : 'en/' + id + '/index.html';
    const source = pages.get(file);
    const projection = applyNovemberHtml(source, id, language, now, data, {hoursModel});
    if (projection.html !== source) {files.set(file, projection.html); changes.push({file, kind: 'reviewed-editorial-expiry'});}
    if (projection.nextTransitionAt) transitions.push(projection.nextTransitionAt);
    for (const record of projection.visible) visibleIds.add(record.id);
  }
  return {files, changes, metadata: {version: 1, eventEditorialExpiryReconciled: true,
    visibleIds: [...visibleIds], nextTransitionAt: transitions.sort()[0] ?? null,
    announcedEventTimesChanged: false}};
}
