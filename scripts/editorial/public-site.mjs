// Shared build and scheduled projection, with independent editorial approvals.
import {createHash} from 'node:crypto';
import {projectAllAgendas} from './all-agendas.mjs';
import {projectApprovedSocialFeed} from './social-feed-approved.mjs';
import {projectApprovedSocialMotion} from './social-motion-approved.mjs';
import {projectApprovedUi} from './ui-approved.mjs';
import {projectApprovedSelector} from './selector-approved.mjs';
import {projectApprovedBooking} from './booking-approved.mjs';
import {projectEventMedia} from './event-media.mjs';

export function projectPublicSite(root,options) {
  const agenda=projectAllAgendas(root,options);
  const social=projectApprovedSocialFeed(root,agenda.files);
  if(!social.metadata)return agenda;
  const motion=projectApprovedSocialMotion(root,social.files);
  const booking=options?.booking===false?{files:motion.files}:projectApprovedBooking(root,motion.files);
  const ui=options?.ui===false?{files:booking.files}:projectApprovedUi(root,booking.files);
  const selector=options?.selector===false?{files:ui.files}:projectApprovedSelector(root,ui.files);
  const files=selector.files;
  // Preserve the reviewed cascade: the scoped November sheet follows shared UI.
  for (const [file,html] of files) if (html.includes('href="/assets/css/november-agenda.css')) {
    const sheet=html.match(/<link rel="stylesheet" href="\/assets\/css\/november-agenda\.css[^>]*>/)?.[0];
    if (sheet) files.set(file,html.replace(sheet,'').replace('</head>',sheet+'</head>'));
  }
  const eventMedia=options?.eventMedia===false?{metadata:null}:projectEventMedia(root,files,options?.now??new Date().toISOString());
  const strip=value=>value.replace(/ data-agenda-render-digest="[a-f0-9]+"/,'');
  files.set('houston.html',strip(files.get('houston.html')));
  const hash=value=>createHash('sha256').update(value).digest('hex');
  const renderDigest=hash(JSON.stringify([...files].map(([file,value])=>[file,hash(value)])));
  files.set('houston.html',files.get('houston.html').replace('class="sy-agenda"',
    'class="sy-agenda" data-agenda-render-digest="'+renderDigest+'"'));
  const transitions=[agenda.metadata?.nextTransitionAt,eventMedia.metadata?.nextTransitionAt].filter(Boolean).sort();
  return {...agenda,files,metadata:{...agenda.metadata,renderDigest,
    ...(eventMedia.metadata?{eventMediaDigest:eventMedia.metadata.digest,
      visibleIds:[...new Set([...(agenda.metadata.visibleIds||[]),...eventMedia.metadata.visibleIds])],nextTransitionAt:transitions[0]||null}: {})},
    ...(eventMedia.metadata?{eventMedia:eventMedia.metadata}:{}),socialFeed:social.metadata,socialMotion:motion.metadata,
    ...(ui.metadata?{ui:ui.metadata}:{}),...(selector.metadata?{selector:selector.metadata}:{}),...(booking.metadata?{booking:booking.metadata}:{})};
}
