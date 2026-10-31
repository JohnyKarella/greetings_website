/* ==========================================================================
   wedding.js — Wedding page only
   Starts the animated header for this page with its own colours.
   (Search, filters, sorting and the scene engine are in js/event-page.js.)

   particles.type :  confetti · petals · hearts · sparks · stars · mix
   particles.amount: 1 = normal, 0.5 = fewer, 1.5 = more
   ========================================================================== */
EventPage.init({
  // drifting rose petals
  particles: { type: 'petals', colors: ['#f7c6cf', '#fbe3e6', '#f2a7b5', '#ffffff', '#f6d9b8'], amount: 0.8 },
  // colours of the soft glowing lights
  bokeh: ['rgba(255,244,214,0.95)', 'rgba(255,224,230,0.9)', 'rgba(255,255,255,0.95)', 'rgba(246,220,180,0.9)'],
  // colours of the twinkling sparkles
  sparkles: ['#fff3cf', '#ffffff', '#f3d9a4']
});
