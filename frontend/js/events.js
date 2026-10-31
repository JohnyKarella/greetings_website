/* ==========================================================================
   events.js — All Events page only
   Starts the animated header for this page with its own colours.
   (Search, filters, sorting and the scene engine are in js/event-page.js.)

   particles.type :  confetti · petals · hearts · sparks · stars · mix
   particles.amount: 1 = normal, 0.5 = fewer, 1.5 = more
   ========================================================================== */
EventPage.init({
  // confetti, hearts and stars together
  particles: { type: 'mix', colors: ['#ff6b5b', '#ffb938', '#2ec4b6', '#7c5ce6', '#ec5a8c', '#ffffff'] },
  // colours of the soft glowing lights
  bokeh: ['rgba(255,236,170,0.95)', 'rgba(255,190,215,0.9)', 'rgba(255,255,255,0.95)', 'rgba(190,225,255,0.85)', 'rgba(210,195,255,0.85)'],
  // colours of the twinkling sparkles
  sparkles: ['#fff6c9', '#ffffff', '#ffd76a', '#c9e6ff']
});
