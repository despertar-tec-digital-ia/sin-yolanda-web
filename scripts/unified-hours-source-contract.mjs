import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const contract = JSON.parse(readFileSync(new URL('./unified-hours-source-patches.json', import.meta.url)));

// Restore the exact authorized hours/cache delta before checking older release hashes.
// Full-file matches deliberately reject unknown edits rather than hiding them.
export function restoreUnifiedHours(file, source) {
  for (const patch of [...(contract.files[file]?.patches ?? [])].reverse()) {
    assert.equal(source.split(patch.after).length - 1, 1, 'Unified hours patch changed or became ambiguous: ' + file);
    source = source.replace(patch.after, patch.before);
  }
  return source;
}

// The agenda renderer retains its independent approval. Only this branch-hours
// label follows the subsequently authorized Saturday schedule.
export function projectGdlHours(source) {
  return source.replace('Horario de la sucursal: 7:00 p. m.–3:00 a. m. del día siguiente.',
    'Horario de la sucursal: 10:00 a. m.–2:00 a. m. del día siguiente.');
}
