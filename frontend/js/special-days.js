/* ==========================================================================
   special-days.js — Special Days page only
   Starts the animated header for this page with its own colours.
   (Search, filters, sorting and the scene engine are in js/event-page.js.)

   particles.type :  confetti · petals · hearts · sparks · stars · mix
   particles.amount: 1 = normal, 0.5 = fewer, 1.5 = more
   ========================================================================== */
EventPage.init({
  // twinkling stars
  particles: { type: 'stars', colors: ['#ffd36b', '#ffffff', '#ffb38a', '#9ad8ff', '#ff9fb2'], amount: 0.8 },
  // colours of the soft glowing lights
  bokeh: ['rgba(255,210,140,0.9)', 'rgba(255,170,120,0.8)', 'rgba(255,255,255,0.9)', 'rgba(160,200,255,0.8)'],
  // colours of the twinkling sparkles
  sparkles: ['#ffe9a8', '#ffffff', '#ffc9a3']
});
