/* ==========================================================================
   anniversary.js — Anniversary page only
   Starts the animated header for this page with its own colours.
   (Search, filters, sorting and the scene engine are in js/event-page.js.)

   particles.type :  confetti · petals · hearts · sparks · stars · mix
   particles.amount: 1 = normal, 0.5 = fewer, 1.5 = more
   ========================================================================== */
EventPage.init({
  // floating hearts
  particles: { type: 'hearts', colors: ['#ff6b81', '#d6336c', '#ff9fb2', '#ffffff', '#e0445a'], amount: 0.7 },
  // colours of the soft glowing lights
  bokeh: ['rgba(255,200,215,0.95)', 'rgba(255,170,190,0.85)', 'rgba(255,255,255,0.95)', 'rgba(255,220,200,0.9)'],
  // colours of the twinkling sparkles
  sparkles: ['#ffd1dc', '#ffffff', '#ff9fb2']
});
