(function () {
  'use strict';

  var DESIGN_WIDTH = 1920;
  var DESIGN_HEIGHT = 1080;
  var MIN_KIOSK_WIDTH = 1900;
  var MIN_KIOSK_HEIGHT = 1000;
  var experience = document.getElementById('experience');

  if (!experience) return;

  function queryFlag(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function physicalScreenSize() {
    var ratio = window.devicePixelRatio || 1;
    return {
      width: Math.round((window.screen && window.screen.width || window.innerWidth) * ratio),
      height: Math.round((window.screen && window.screen.height || window.innerHeight) * ratio)
    };
  }

  function shouldUseKioskMode() {
    var forced = queryFlag('kiosk');
    if (forced === '1') return true;
    if (forced === '0') return false;

    var screenSize = physicalScreenSize();
    var landscape = screenSize.width >= screenSize.height;
    var aspect = screenSize.width / Math.max(1, screenSize.height);
    return landscape &&
      screenSize.width >= MIN_KIOSK_WIDTH &&
      screenSize.height >= MIN_KIOSK_HEIGHT &&
      aspect >= 1.5 && aspect <= 2.2;
  }

  function mountStage() {
    if (experience.closest('.kiosk-stage')) {
      return {
        viewport: experience.closest('.kiosk-viewport'),
        shell: experience.closest('.kiosk-shell'),
        stage: experience.closest('.kiosk-stage')
      };
    }

    var viewport = document.createElement('div');
    var shell = document.createElement('div');
    var stage = document.createElement('div');
    viewport.className = 'kiosk-viewport';
    shell.className = 'kiosk-shell';
    stage.className = 'kiosk-stage';

    experience.parentNode.insertBefore(viewport, experience);
    viewport.appendChild(shell);
    shell.appendChild(stage);
    stage.appendChild(experience);

    return { viewport: viewport, shell: shell, stage: stage };
  }

  var wrappers = mountStage();
  var diagnostics = document.createElement('output');
  diagnostics.className = 'kiosk-diagnostics';
  diagnostics.setAttribute('aria-hidden', 'true');
  document.body.appendChild(diagnostics);

  if (queryFlag('diagnostics') === '1') {
    document.body.classList.add('show-kiosk-diagnostics');
  }

  var mode = shouldUseKioskMode() ? 'kiosk' : 'responsive';
  var frame = 0;

  function viewportSize() {
    var viewport = window.visualViewport;
    return {
      width: Math.max(1, Math.round(viewport ? viewport.width : window.innerWidth)),
      height: Math.max(1, Math.round(viewport ? viewport.height : window.innerHeight))
    };
  }

  function notifyLayoutChange() {
    window.dispatchEvent(new CustomEvent('boothdisplaychange', {
      detail: { mode: mode }
    }));
  }

  function renderDiagnostics(size, scale) {
    var physical = physicalScreenSize();
    diagnostics.textContent = [
      'Watt\'s Inside V2 display adapter',
      'mode: ' + mode,
      'viewport: ' + size.width + ' × ' + size.height + ' CSS px',
      'screen: ' + physical.width + ' × ' + physical.height + ' physical px',
      'design: ' + DESIGN_WIDTH + ' × ' + DESIGN_HEIGHT,
      'scale: ' + scale.toFixed(4),
      'override: ?kiosk=1 | ?kiosk=0 | ?diagnostics=1'
    ].join('\n');
  }

  function update() {
    frame = 0;
    mode = shouldUseKioskMode() ? 'kiosk' : 'responsive';
    document.body.classList.toggle('kiosk-mode', mode === 'kiosk');
    document.body.classList.toggle('responsive-mode', mode !== 'kiosk');

    var size = viewportSize();
    var scale = 1;

    if (mode === 'kiosk') {
      scale = Math.min(size.width / DESIGN_WIDTH, size.height / DESIGN_HEIGHT);
      var shellWidth = Math.round(DESIGN_WIDTH * scale * 1000) / 1000;
      var shellHeight = Math.round(DESIGN_HEIGHT * scale * 1000) / 1000;
      document.documentElement.style.setProperty('--kiosk-scale', String(scale));
      document.documentElement.style.setProperty('--kiosk-shell-width', shellWidth + 'px');
      document.documentElement.style.setProperty('--kiosk-shell-height', shellHeight + 'px');
      wrappers.stage.setAttribute('aria-label', 'Scaled 1920 by 1080 booth experience');
    } else {
      document.documentElement.style.removeProperty('--kiosk-scale');
      document.documentElement.style.removeProperty('--kiosk-shell-width');
      document.documentElement.style.removeProperty('--kiosk-shell-height');
      wrappers.stage.removeAttribute('aria-label');
    }

    renderDiagnostics(size, scale);
    window.requestAnimationFrame(notifyLayoutChange);
  }

  function scheduleUpdate() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(update);
  }

  window.addEventListener('resize', scheduleUpdate, { passive: true });
  window.addEventListener('orientationchange', scheduleUpdate, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleUpdate, { passive: true });
  }

  window.boothDisplay = {
    update: scheduleUpdate,
    mode: function () { return mode; },
    designSize: { width: DESIGN_WIDTH, height: DESIGN_HEIGHT }
  };

  update();
})();
