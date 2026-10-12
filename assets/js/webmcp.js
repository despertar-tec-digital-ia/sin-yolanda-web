// Progressive enhancement: current document API, with early navigator API compatibility.
// Only public, read-only information. Booking/availability always remain with the venue.
(async function () {
  'use strict';
  const context = document.modelContext || navigator.modelContext;
  if (!context || typeof context.registerTool !== 'function') return;
  const origin = 'https://sin-yolanda.com';
  const load = async signal => {
    const response = await fetch('/discovery.json', { signal, credentials: 'omit' });
    if (!response.ok) throw new Error('Public venue information is temporarily unavailable.');
    const data = await response.json();
    if (data.version !== 1 || data.url !== origin + '/') throw new Error('Invalid public information source.');
    return data;
  };
  const annotations = { readOnlyHint: true, consequentialHint: false, untrustedContentHint: false };
  const tools = [
    {
      name: 'list_sin_yolanda_locations',
      description: 'List Sin Yolanda venues with their own published address, phone, menu and reservation links. Does not check live availability or make a booking.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations,
      execute: async (_, { signal } = {}) => JSON.stringify({ locations: (await load(signal)).locations }),
    },
    {
      name: 'get_sin_yolanda_location',
      description: 'Read the public information of one Sin Yolanda location. Never generalize another venue\'s hours, menu, prices or booking policy.',
      inputSchema: { type: 'object', properties: { location: { type: 'string', enum: ['houston', 'san-antonio', 'the-woodlands', 'san-ignacio', 'el-paso'] } }, required: ['location'], additionalProperties: false }, annotations,
      execute: async ({ location }, { signal } = {}) => {
        const result = (await load(signal)).locations.find(item => item.id === location);
        if (!result) throw new Error('Unknown location. Use the location directory.');
        return JSON.stringify(result);
      },
    },
    {
      name: 'get_sin_yolanda_catering',
      description: 'Read the published Houston catering menus, contact and English/Spanish pages. Menu and availability must be agreed for each event. Does not send requests or book events.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations,
      execute: async (_, { signal } = {}) => JSON.stringify((await load(signal)).catering),
    },
  ];
  for (const tool of tools) {
    try { await context.registerTool(tool); }
    catch (error) { console.warn('Sin Yolanda public tool could not register:', tool.name); }
  }
})();
