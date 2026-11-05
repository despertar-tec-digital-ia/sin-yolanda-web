// Shared build and scheduled projection, with independent editorial approvals.
import {createHash} from 'node:crypto';
import {projectAllAgendas} from './all-agendas.mjs';
import {projectApprovedSocialFeed} from './social-feed-approved.mjs';
import {projectApprovedSocialMotion} from './social-motion-approved.mjs';

export function projectPublicSite(root,options) {
  const agenda=projectAllAgendas(root,options);
  const social=projectApprovedSocialFeed(root,agenda.files);
  if(!social.metadata)return agenda;
  const motion=projectApprovedSocialMotion(root,social.files);
  const files=motion.files;
  const strip=value=>value.replace(/ data-agenda-render-digest="[a-f0-9]+"/,'');
  files.set('houston.html',strip(files.get('houston.html')));
  const hash=value=>createHash('sha256').update(value).digest('hex');
  const renderDigest=hash(JSON.stringify([...files].map(([file,value])=>[file,hash(value)])));
  files.set('houston.html',files.get('houston.html').replace('class="sy-agenda"',
    'class="sy-agenda" data-agenda-render-digest="'+renderDigest+'"'));
  return {...agenda,files,metadata:{...agenda.metadata,renderDigest},socialFeed:social.metadata,socialMotion:motion.metadata};
}
