/* ==========================================================================
   festivals.js — Festivals page only
   Starts the animated header for this page with its own colours.
   (Search, filters, sorting and the scene engine are in js/event-page.js.)

   particles.type :  confetti · petals · hearts · sparks · stars · mix
   particles.amount: 1 = normal, 0.5 = fewer, 1.5 = more
   ========================================================================== */
EventPage.init({
  // rising sparks and fireworks
  particles: { type: 'sparks', colors: ['#ffd36b', '#ffb938', '#ff7a3d', '#fff3c4', '#ff9ec4', '#9ad8ff'], amount: 1.1 },
  // colours of the soft glowing lights
  bokeh: ['rgba(255,196,80,0.95)', 'rgba(255,150,60,0.9)', 'rgba(255,230,160,0.95)', 'rgba(255,120,80,0.8)'],
  // colours of the twinkling sparkles
  sparkles: ['#ffe08a', '#fff6d6', '#ffb938']
});
