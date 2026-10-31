/* ==========================================================================
   birthday.js — Birthday page only
   Starts the animated header for this page with its own colours.
   (Search, filters, sorting and the scene engine are in js/event-page.js.)

   particles.type :  confetti · petals · hearts · sparks · stars · mix
   particles.amount: 1 = normal, 0.5 = fewer, 1.5 = more
   ========================================================================== */
EventPage.init({
  // falling 3D confetti
  particles: { type: 'confetti', colors: ['#ff6b8a', '#ffc93c', '#7c5ce6', '#2ec4b6', '#ff9f5a', '#ffffff', '#f7a8c4'] },
  // colours of the soft glowing lights
  bokeh: ['rgba(255,236,170,0.95)', 'rgba(255,190,215,0.9)', 'rgba(255,255,255,0.95)', 'rgba(210,195,255,0.85)', 'rgba(255,205,160,0.9)'],
  // colours of the twinkling sparkles
  sparkles: ['#fff6c9', '#ffffff', '#ffd76a', '#ffc2d6']
});
