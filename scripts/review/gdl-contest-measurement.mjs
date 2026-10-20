// Local projection of the existing single click owner; no second listener or free-form data.
import assert from 'node:assert/strict';
import {contractStart,contractEnd,readEmbeddedContract} from '../measurement-contract.mjs';
import {contestPath,contestRecord,registrationWhatsapp,registrationPhone} from './gdl-contest-config.mjs';

export function extendContestContract(input) {
  const contract=structuredClone(input);
  assert.equal(contract.events[contestRecord]?.branch,'san-ignacio');
  contract.routes[contestPath.replace(/\/$/,'')]='san-ignacio';
  Object.assign(contract.events[contestRecord],{detailRoute:contestPath.replace(/\/$/,''),registrationWhatsapp,registrationPhone});
  return contract;
}

export function projectContestGa4Bundle(source) {
  const marker=/window\.SY_GA4_CONTRACT = ([^\n]+);\n/g;
  const matches=[...source.matchAll(marker)];
  assert.equal(matches.length,1,'Review the compiled consent contract before adding a route');
  const contract=extendContestContract(JSON.parse(matches[0][1]));
  return source.replace(marker,()=> 'window.SY_GA4_CONTRACT = '+JSON.stringify(contract)+';\n');
}

export function projectContestMeasurement(source) {
  const contract=extendContestContract(readEmbeddedContract(source));
  const start=source.indexOf(contractStart),end=source.indexOf(contractEnd);
  source=source.slice(0,start+contractStart.length)+'\n'+JSON.stringify(contract)+'\n'+source.slice(end);
  const before='const key = destinationKey(url), destination = [event.post, ...(event.additionalPosts || [])].some(post => key === destinationKey(post)) ? "instagram_post" : event.tickets && key === destinationKey(event.tickets) ? "tickets" : null;\n      return destination ? decision("programming_action_click", destination, destination === "tickets" ? "tickets" : "post", branch, { event_id: id }) : null;';
  const after='const key = destinationKey(url), destination = [event.post, ...(event.additionalPosts || [])].some(post => key === destinationKey(post)) ? "instagram_post" : event.tickets && key === destinationKey(event.tickets) ? "tickets" : event.registrationWhatsapp && key === destinationKey(event.registrationWhatsapp) ? "whatsapp" : event.registrationPhone && url.href === event.registrationPhone ? "phone" : event.detailRoute && hosts.has(url.hostname) && route(url.pathname) === event.detailRoute ? "agenda_section" : null;\n      const action = destination === "tickets" ? "tickets" : destination === "instagram_post" ? "post" : destination === "agenda_section" ? "agenda_section" : "programming_action_click";\n      return destination ? decision("programming_action_click", destination, action, branch, { event_id: id }) : null;';
  if (source.includes(after)) {
    assert.equal(source.split(after).length-1,1,'The promoted measurement owner must remain singular');
    return source;
  }
  assert.equal(source.split(before).length-1,1,'Review the current measurement owner before extending its destinations');
  return source.replace(before,after);
}
