(() => {
 'use strict';
 let audience;
 document.getElementById('btnSecondScreen').addEventListener('click', () => {
  if (audience && !audience.closed) { audience.focus(); return; }
  audience = window.open(new URL('audience.html', location.href).href, 'KaraokePartyAudience', 'popup,width=1100,height=700,resizable=yes,scrollbars=no');
  if (!audience) alert('Permita abrir janelas para este site e clique novamente em Segunda tela.');
 });
})();
