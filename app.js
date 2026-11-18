(function () {
  'use strict';

  var state = {
    system: 'full',
    program: 'atap',
    scenario: 'sunny',
    night: false,
    lang: 'en',
    soc: 71,
    backupSeconds: 0
  };

  var serialPort = null;
  var serialWriter = null;
  var lastCommand = '';
  var audioContext = null;
  var idleTimer = null;

  var el = function (id) { return document.getElementById(id); };
  var experience = el('experience');

  var copy = {
    en: {
      solarPV: 'Solar PV', grid: 'TNB Grid', day: 'Day', night: 'Night', lamp: 'Lamp', connected: 'Connected',
      panelKicker: 'BOOTH 08 EXPERIENCE', panelIntro: 'Follow the power from sunlight to storage, grid and home.',
      choose: 'CHOOSE YOUR SYSTEM', tryScenario: 'TRY A SCENARIO', selected: 'SELECTED', powerCutLabel: 'POWER CUT',
      ongrid: 'On-grid', ongridSub: 'Solar only', hybrid: 'Hybrid', hybridSub: 'Battery-ready', full: 'Full backup', fullSub: 'Battery + ATS',
      inverter: 'HYBRID INVERTER', distribution: 'DISTRIBUTION<br>BOARD', light: 'LIGHT', fan: 'FAN',
      solar: 'SOLAR', battery: 'BATTERY', home: 'HOME', flowEyebrow: 'LIVE POWER FLOW', homePowered: 'HOME SUPPLY', solarGoes: 'SOLAR FLOW',
      notInstalled: 'Not installed', ready: 'Battery-ready', standby: 'STANDBY', charging: 'CHARGING', supplying: 'SUPPLYING', fullState: 'FULL', sourceA: 'SOURCE A', sourceB: 'SOURCE B',
      atsBackup: 'Solis Backup', sourceANormal: 'SOURCE A · NORMAL', sourceBBackup: 'SOURCE B · BACKUP', gridOff: 'GRID OFF',
      backupUnavailable: 'Requires Full backup',
      scenarios: {
        sunny: ['Sunny Day', 'Solar > load · export', '☀'], rain: ['Rainy Day', 'Low solar · mostly TNB', '☁'],
        evening: ['Evening Peak', 'Battery + TNB together', '◒'], late: ['Late Night', 'Battery low · TNB only', '☾'],
        cut: ['Power Cut', 'TNB supply stops', 'ϟ'], backup: ['Backup Power', 'ATS switches to backup', '▣']
      },
      details: {
        sunny: ['SOLAR {PROGRAM} · SUNNY DAY', 'Solar powers the home', 'Solar runs the home, charges the battery, then exports any surplus.', 'SOLAR > LOAD · EXPORT'],
        rain: ['SOLAR {PROGRAM} · RAINY DAY', 'Solar + grid supply', 'Solar covers part of the load while TNB Grid supplies the balance.', 'MOSTLY FROM TNB'],
        evening: ['SOLAR {PROGRAM} · EVENING PEAK', 'Battery supports the peak', 'Stored energy supports the evening load while TNB Grid fills the gap.', 'BATTERY + TNB TOGETHER'],
        late: ['SOLAR {PROGRAM} · LATE NIGHT', 'Grid powers the home', 'TNB Grid supplies the home while the battery holds its reserve.', 'POWERED BY TNB'],
        cut: ['SOLAR {PROGRAM} · POWER CUT', 'Grid supply interrupted', 'The grid is unavailable and the on-grid output is safely isolated.', 'ON-GRID PORT STOPS'],
        backup: ['SOLAR {PROGRAM} · BACKUP POWER', 'Backup power active', 'The ATS selects Source B; solar and battery keep essential loads running.', 'ESSENTIAL LOADS ON']
      }
    },
    zh: {
      solarPV: '太阳能光伏', grid: '国家电网', day: '白天', night: '夜间', lamp: '灯具', connected: '已连接',
      panelKicker: '08号展位互动体验', panelIntro: '观察电力如何从阳光流向储能、电网与家庭。',
      choose: '选择您的系统', tryScenario: '选择一个情境', selected: '已选择', powerCutLabel: '停电',
      ongrid: '并网系统', ongridSub: '仅太阳能', hybrid: '混合逆变器', hybridSub: '可加装电池', full: '完整后备系统', fullSub: '电池 + ATS',
      inverter: '混合型逆变器', distribution: '配电箱', light: '灯光', fan: '风扇',
      solar: '太阳能', battery: '电池', home: '家庭', flowEyebrow: '实时电力流向', homePowered: '家庭供电', solarGoes: '太阳能流向',
      notInstalled: '尚未安装', ready: '可加装电池', standby: '待机', charging: '充电中', supplying: '供电中', fullState: '已充满', sourceA: '电源 A', sourceB: '电源 B',
      atsBackup: 'Solis 后备电源', sourceANormal: '电源 A · 正常', sourceBBackup: '电源 B · 后备', gridOff: '电网中断',
      backupUnavailable: '需选择完整后备系统',
      scenarios: {
        sunny: ['晴天', '太阳能充足 · 可输出', '☀'], rain: ['雨天', '太阳能较低 · 电网补充', '☁'],
        evening: ['傍晚高峰', '电池与电网共同供电', '◒'], late: ['深夜', '电池保留 · 电网供电', '☾'],
        cut: ['停电', '电网供电中断', 'ϟ'], backup: ['后备供电', 'ATS切换至后备电源', '▣']
      },
      details: {
        sunny: ['太阳能 {PROGRAM} · 晴天', '太阳能 > 负载', '阳光优先为家庭供电，多余电量为电池充电，然后输出至国家电网。', '太阳能充足 · 输出电网'],
        rain: ['太阳能 {PROGRAM} · 雨天', '低太阳能日', '太阳能承担部分负载，其余大部分由国家电网补充。今天没有余电输出。', '主要来自国家电网'],
        evening: ['太阳能 {PROGRAM} · 傍晚高峰', '电池 + 电网', '白天储存的太阳能支持傍晚用电，国家电网补足差额。', '电池与电网共同供电'],
        late: ['太阳能 {PROGRAM} · 深夜', '电网接管', '电池保持最低储备电量，由国家电网通过正常线路为家庭供电。', '国家电网供电'],
        cut: ['太阳能 {PROGRAM} · 停电', '停电！', '国家电网中断。防孤岛保护会停止并网端口，家庭等待启动后备电源。', '并网端口已停止'],
        backup: ['太阳能 {PROGRAM} · 后备供电', '后备电源启动', 'ATS切换至电源B，太阳能和Pylontech电池继续为灯光与风扇供电。', '必要负载运行中']
      }
    }
  };

  var scenarioColors = {
    sunny: '#ff9f24', rain: '#7089a9', evening: '#34bec8', late: '#28cd74', cut: '#ff4053', backup: '#2588f5'
  };

  var scenarioOrder = {
    day: ['sunny', 'rain', 'cut', 'backup'],
    night: ['evening', 'late', 'cut', 'backup']
  };

  function t() { return copy[state.lang]; }

  function scenarioIconMarkup(name) {
    var icons = {
      sunny: '<svg class="scenario-glyph scenario-sun" viewBox="0 0 24 24" aria-hidden="true"><circle class="icon-core" cx="12" cy="12" r="4"></circle><g class="icon-rays"><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"></path></g></svg>',
      rain: '<svg class="scenario-glyph scenario-rain" viewBox="0 0 24 24" aria-hidden="true"><path class="icon-cloud" d="M6.3 15.3h11.2a3.5 3.5 0 0 0 .3-7 5.8 5.8 0 0 0-10.9-1.2 4.2 4.2 0 0 0-.6 8.2Z"></path><g class="rain-drops"><path d="m8 18-1 2M12 18l-1 2M16 18l-1 2"></path></g></svg>',
      cut: '<svg class="scenario-glyph scenario-cut" viewBox="0 0 24 24" aria-hidden="true"><path class="cut-bolt" d="m13.5 2-6 10h5l-2 10 6-12h-5l2-8Z"></path></svg>',
      backup: '<svg class="scenario-glyph scenario-backup" viewBox="0 0 24 24" aria-hidden="true"><rect class="battery-outline" x="5" y="5" width="14" height="16" rx="2"></rect><path d="M9 2h6"></path><rect class="battery-fill" x="7.5" y="13" width="9" height="5.5" rx="1"></rect><path class="battery-bolt" d="m13 8-3 4h2.4l-1 3.5 3.6-4.8h-2.4L13 8Z"></path></svg>',
      evening: '<svg class="scenario-glyph scenario-evening" viewBox="0 0 24 24" aria-hidden="true"><g class="evening-sun-group"><path class="evening-sun" d="M8 15a4 4 0 0 1 8 0"></path><path class="evening-rays" d="M12 4v4M5.6 8.2l2.1 2.1M18.4 8.2l-2.1 2.1"></path></g><path class="evening-horizon" d="M3 16h18M6 20h12"></path></svg>',
      late: '<svg class="scenario-glyph scenario-moon" viewBox="0 0 24 24" aria-hidden="true"><path class="moon-shape" d="M19.5 15.2A8 8 0 0 1 8.8 4.5 8 8 0 1 0 19.5 15.2Z"></path><path class="moon-star" d="m17 5 .5 1.3L19 7l-1.5.6L17 9l-.6-1.4L15 7l1.4-.7L17 5Z"></path></svg>'
    };
    return icons[name] || icons.sunny;
  }

  function text(id, value) {
    var node = el(id);
    if (node) node.textContent = value;
  }

  function html(id, value) {
    var node = el(id);
    if (node) node.innerHTML = value;
  }

  /*
   * Live wiring layout
   * ------------------
   * All routes are calculated from the real component rectangles. Moving a
   * component in layout-v7.css therefore moves its cable terminals as well.
   */
  var wireLayoutFrame = 0;
  var cableContactOverlap = 3;
  var assetBounds = {
    inverter: { left: .052, top: .070, right: .998, bottom: .908 },
    ats: { left: .179, top: .187, right: .885, bottom: .834 },
    distribution: { left: .136, top: .180, right: .921, bottom: .808 },
    battery: { left: .121, top: .023, right: .928, bottom: .923 },
    /* At the distribution-board height, the opaque house wall begins near 9%. */
    house: { left: .09, top: .004, right: .91, bottom: .994 }
  };

  /*
   * getBoundingClientRect() returns post-transform screen pixels. In kiosk
   * mode the entire 1920 × 1080 stage is transformed, while the SVG viewBox
   * remains in the stage's unscaled CSS coordinate system. Convert every
   * measured rectangle back to that local system before generating a route.
   */
  function stageCoordinateSpace() {
    var stage = document.querySelector('.visual-stage');
    if (!stage) return null;
    var box = stage.getBoundingClientRect();
    var width = stage.clientWidth;
    var height = stage.clientHeight;
    return {
      stage: stage,
      box: box,
      width: width,
      height: height,
      scaleX: box.width && width ? box.width / width : 1,
      scaleY: box.height && height ? box.height / height : 1
    };
  }

  function localRect(node, space) {
    var box = node.getBoundingClientRect();
    return {
      left: (box.left - space.box.left) / space.scaleX,
      top: (box.top - space.box.top) / space.scaleY,
      width: box.width / space.scaleX,
      height: box.height / space.scaleY
    };
  }

  function terminal(node, side, along) {
    var space = stageCoordinateSpace();
    if (!space) return { x: 0, y: 0 };
    var box = localRect(node, space);
    var ratio = typeof along === 'number' ? along : .5;
    var x = box.left;
    var y = box.top;

    if (side === 'right') { x += box.width; y += box.height * ratio; }
    else if (side === 'left') { y += box.height * ratio; }
    else if (side === 'bottom') { x += box.width * ratio; y += box.height; }
    else { x += box.width * ratio; }

    return { x: x, y: y };
  }

  function visibleTerminal(node, imageSelector, bounds, side, along) {
    var space = stageCoordinateSpace();
    if (!space) return { x: 0, y: 0 };
    var image = node.querySelector(imageSelector);
    if (!image || !image.naturalWidth || !image.naturalHeight) return terminal(node, side, along);

    var imageBox = localRect(image, space);
    var sourceRatio = image.naturalWidth / image.naturalHeight;
    var boxRatio = imageBox.width / imageBox.height;
    var renderedWidth;
    var renderedHeight;
    var offsetX;
    var offsetY;

    if (sourceRatio > boxRatio) {
      renderedWidth = imageBox.width;
      renderedHeight = renderedWidth / sourceRatio;
      offsetX = 0;
      offsetY = (imageBox.height - renderedHeight) / 2;
    } else {
      renderedHeight = imageBox.height;
      renderedWidth = renderedHeight * sourceRatio;
      offsetX = (imageBox.width - renderedWidth) / 2;
      offsetY = 0;
    }

    var left = imageBox.left + offsetX + renderedWidth * bounds.left;
    var right = imageBox.left + offsetX + renderedWidth * bounds.right;
    var top = imageBox.top + offsetY + renderedHeight * bounds.top;
    var bottom = imageBox.top + offsetY + renderedHeight * bounds.bottom;
    var ratio = typeof along === 'number' ? along : .5;

    if (side === 'right') return { x: right - cableContactOverlap, y: top + (bottom - top) * ratio };
    if (side === 'left') return { x: left + cableContactOverlap, y: top + (bottom - top) * ratio };
    if (side === 'bottom') return { x: left + (right - left) * ratio, y: bottom - cableContactOverlap };
    return { x: left + (right - left) * ratio, y: top + cableContactOverlap };
  }

  function roundedRoute(points, cornerRadius) {
    var clean = points.filter(function (point, index) {
      if (!index) return true;
      var previous = points[index - 1];
      return Math.abs(point.x - previous.x) > .5 || Math.abs(point.y - previous.y) > .5;
    });
    if (clean.length < 2) return '';

    var radius = typeof cornerRadius === 'number' ? cornerRadius : 15;
    var d = 'M ' + clean[0].x.toFixed(1) + ' ' + clean[0].y.toFixed(1);
    for (var i = 1; i < clean.length; i += 1) {
      var point = clean[i];
      if (i === clean.length - 1) {
        d += ' L ' + point.x.toFixed(1) + ' ' + point.y.toFixed(1);
        continue;
      }

      var previousPoint = clean[i - 1];
      var nextPoint = clean[i + 1];
      var incomingX = point.x - previousPoint.x;
      var incomingY = point.y - previousPoint.y;
      var outgoingX = nextPoint.x - point.x;
      var outgoingY = nextPoint.y - point.y;
      var incomingLength = Math.hypot(incomingX, incomingY);
      var outgoingLength = Math.hypot(outgoingX, outgoingY);
      var bend = Math.min(radius, incomingLength / 2, outgoingLength / 2);

      if (!bend) {
        d += ' L ' + point.x.toFixed(1) + ' ' + point.y.toFixed(1);
        continue;
      }

      var before = {
        x: point.x - incomingX / incomingLength * bend,
        y: point.y - incomingY / incomingLength * bend
      };
      var after = {
        x: point.x + outgoingX / outgoingLength * bend,
        y: point.y + outgoingY / outgoingLength * bend
      };
      d += ' L ' + before.x.toFixed(1) + ' ' + before.y.toFixed(1) +
        ' Q ' + point.x.toFixed(1) + ' ' + point.y.toFixed(1) +
        ' ' + after.x.toFixed(1) + ' ' + after.y.toFixed(1);
    }
    return d;
  }

  function setRoute(ids, route) {
    ids.forEach(function (id) {
      var node = el(id);
      if (node) node.setAttribute('d', route);
    });
  }

  function layoutWires() {
    wireLayoutFrame = 0;
    var stage = document.querySelector('.visual-stage');
    var svg = el('wiringSvg');
    var inverter = el('inverter');
    var ats = el('atsDevice');
    var atsFace = ats && ats.querySelector('.ats-panel');
    var distribution = el('distributionDevice');
    var home = el('homeModule');
    var gridBreaker = el('gridBreaker');
    var solarSource = document.querySelector('.source-solar');
    var gridSource = document.querySelector('.source-grid');
    var batteries = document.querySelectorAll('.battery-unit');
    if (!stage || !svg || !inverter || !ats || !distribution || !home || !gridBreaker || !solarSource || !gridSource || batteries.length < 2) return;

    var width = stage.clientWidth;
    var height = stage.clientHeight;
    if (!width || !height) return;
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    svg.setAttribute('preserveAspectRatio', 'none');

    var solarOut = terminal(solarSource, 'bottom', .5);
    var gridOut = terminal(gridSource, 'bottom', .5);
    var inverterSolar = visibleTerminal(inverter, '.inverter-image', assetBounds.inverter, 'top', .5);
    var inverterRight = visibleTerminal(inverter, '.inverter-image', assetBounds.inverter, 'right', .5);
    var inverterBattery = visibleTerminal(inverter, '.inverter-image', assetBounds.inverter, 'bottom', .5);
    var inverterBackup = visibleTerminal(inverter, '.inverter-image', assetBounds.inverter, 'right', .88);
    var atsIn = terminal(atsFace || ats, 'left', .54);
    var atsOut = terminal(atsFace || ats, 'right', .54);
    var atsBackup = terminal(atsFace || ats, 'bottom', .5);
    var boardIn = visibleTerminal(distribution, '.distribution-image', assetBounds.distribution, 'left', .54);
    var boardOut = visibleTerminal(distribution, '.distribution-image', assetBounds.distribution, 'right', .54);
    var homeIn = visibleTerminal(home, '.house-shell', assetBounds.house, 'left', .61);
    var batteryOne = visibleTerminal(batteries[0], '.battery-shell', assetBounds.battery, 'top', .5);
    var batteryTwo = visibleTerminal(batteries[1], '.battery-shell', assetBounds.battery, 'top', .5);

    /* One exact vertical guideline through source, inverter and battery split. */
    var leftAssemblyCenterX = inverterBattery.x;
    solarOut.x = leftAssemblyCenterX;
    inverterSolar.x = leftAssemblyCenterX;

    var busY = (atsIn.y + boardIn.y) / 2;
    var hardwareOverlap = Math.max(14, width * .012);
    var inverterGrid = { x: inverterRight.x - hardwareOverlap, y: busY };
    var sourceJoint = { x: gridOut.x, y: busY };
    var atsBusIn = { x: atsIn.x + hardwareOverlap, y: busY };
    var atsBusOut = { x: atsOut.x - hardwareOverlap, y: busY };
    var boardBusIn = { x: boardIn.x + hardwareOverlap, y: busY };
    var boardBusOut = { x: boardOut.x - hardwareOverlap, y: busY };
    /* Carry the cable beneath the opaque wall so the house cleanly masks its end. */
    var homeWallOverlap = Math.max(28, width * .022);
    var homeBusIn = { x: homeIn.x + homeWallOverlap, y: busY };
    var inverterSolarHidden = { x: inverterSolar.x, y: inverterSolar.y + 10 };
    var inverterBatteryHidden = { x: inverterBattery.x, y: inverterBattery.y - 12 };
    var inverterBackupHidden = { x: inverterBackup.x - hardwareOverlap, y: inverterBackup.y };
    var atsBackupHidden = { x: atsBackup.x, y: atsBackup.y - 12 };
    var batteryOneHidden = { x: batteryOne.x, y: batteryOne.y + 12 };
    var batteryTwoHidden = { x: batteryTwo.x, y: batteryTwo.y + 12 };
    /* Keep the battery route as a clear T: a centred vertical trunk from the
       inverter, then a short crossbar just above both battery terminals. */
    var batteryBranchGap = Math.max(26, Math.min(38, height * .035));
    var batteryJoint = {
      x: inverterBattery.x,
      y: Math.max(inverterBattery.y + 24, batteryOne.y - batteryBranchGap)
    };
    var backupLoopY = Math.max(inverterBackup.y, atsBackup.y) + Math.max(34, height * .055);
    var backupTurnX = inverterBackup.x + Math.max(30, width * .032);
    var wireCornerRadius = Math.max(10, Math.min(16, width * .012));

    gridBreaker.style.left = gridOut.x.toFixed(1) + 'px';
    gridBreaker.style.top = (gridOut.y + (sourceJoint.y - gridOut.y) * .38).toFixed(1) + 'px';

    var solarRoute = roundedRoute([solarOut, inverterSolarHidden], wireCornerRadius);
    var gridRoute = roundedRoute([gridOut, sourceJoint], wireCornerRadius);
    var onGridRoute = roundedRoute([inverterGrid, sourceJoint], wireCornerRadius);
    var sourceARoute = roundedRoute([sourceJoint, atsBusIn], wireCornerRadius);
    var atsOutRoute = roundedRoute([atsBusOut, boardBusIn], wireCornerRadius);
    var directRoute = roundedRoute([sourceJoint, boardBusIn], wireCornerRadius);
    var homeRoute = roundedRoute([boardBusOut, homeBusIn], wireCornerRadius);
    var batteryRoute = roundedRoute([inverterBatteryHidden, batteryJoint], wireCornerRadius) + ' ' +
      roundedRoute([batteryJoint, { x: batteryOne.x, y: batteryJoint.y }, batteryOneHidden], wireCornerRadius) + ' ' +
      roundedRoute([batteryJoint, { x: batteryTwo.x, y: batteryJoint.y }, batteryTwoHidden], wireCornerRadius);
    var backupRoute = roundedRoute([
      inverterBackupHidden,
      { x: backupTurnX, y: inverterBackup.y },
      { x: backupTurnX, y: backupLoopY },
      { x: atsBackup.x, y: backupLoopY },
      atsBackupHidden
    ], wireCornerRadius);

    setRoute(['baseSolar', 'auraSolar', 'coreSolar', 'flowSolar'], solarRoute);
    setRoute(['baseGrid', 'auraGridIn', 'coreGridIn', 'flowGridIn', 'auraGridOut', 'coreGridOut', 'flowGridOut'], gridRoute);
    setRoute(['baseOnGrid', 'auraOnGrid', 'coreOnGrid', 'flowOnGrid'], onGridRoute);
    setRoute(['baseSourceA', 'auraSourceA', 'coreSourceA', 'flowSourceA'], sourceARoute);
    setRoute(['baseAtsOut', 'auraAtsOut', 'coreAtsOut', 'flowAtsOut'], atsOutRoute);
    setRoute(['baseDirect', 'auraDirect', 'coreDirect', 'flowDirect'], directRoute);
    setRoute(['baseHome', 'auraHome', 'coreHome', 'flowHome'], homeRoute);
    setRoute(['baseBattery', 'auraBatteryCharge', 'coreBatteryCharge', 'flowBatteryCharge', 'auraBatterySupply', 'coreBatterySupply', 'flowBatterySupply'], batteryRoute);
    setRoute(['baseBackup', 'auraBackup', 'coreBackup', 'flowBackup'], backupRoute);

    el('sourceJunction').setAttribute('cx', sourceJoint.x.toFixed(1));
    el('sourceJunction').setAttribute('cy', sourceJoint.y.toFixed(1));
    el('batteryJunction').setAttribute('cx', batteryJoint.x.toFixed(1));
    el('batteryJunction').setAttribute('cy', batteryJoint.y.toFixed(1));
  }

  function scheduleWireLayout() {
    if (wireLayoutFrame) window.cancelAnimationFrame(wireLayoutFrame);
    wireLayoutFrame = window.requestAnimationFrame(layoutWires);
  }

  function playTone(kind) {
    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      var osc = audioContext.createOscillator();
      var gain = audioContext.createGain();
      osc.type = kind === 'alert' ? 'square' : 'sine';
      osc.frequency.value = kind === 'alert' ? 190 : kind === 'success' ? 660 : 440;
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(kind === 'alert' ? 0.07 : 0.035, audioContext.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + (kind === 'alert' ? 0.22 : 0.12));
      osc.connect(gain).connect(audioContext.destination);
      osc.start();
      osc.stop(audioContext.currentTime + (kind === 'alert' ? 0.24 : 0.14));
    } catch (error) { /* Sound is optional. */ }
  }

  function currentCommand() {
    if (state.scenario === 'sunny') return state.program === 'atap' ? 'X' : 'S';
    if (state.scenario === 'rain') return 'R';
    if (state.scenario === 'evening') return state.system === 'full' ? 'E' : 'G';
    if (state.scenario === 'late') return 'G';
    if (state.scenario === 'cut') return 'C';
    if (state.scenario === 'backup') return 'B';
    return '';
  }

  async function sendArduinoCommand(force) {
    var command = currentCommand();
    if (!serialWriter || !command || (!force && command === lastCommand)) return;
    try {
      await serialWriter.write(new TextEncoder().encode(command + '\n'));
      lastCommand = command;
    } catch (error) {
      await disconnectSerial();
    }
  }

  async function connectSerial() {
    if (!('serial' in navigator)) {
      el('lampButton').classList.add('unsupported');
      text('lampLabel', state.lang === 'en' ? 'USB browser only' : '需使用USB浏览器');
      return;
    }
    if (serialPort) {
      await disconnectSerial();
      renderUtilities();
      return;
    }
    try {
      await openSerialPort(await navigator.serial.requestPort());
    } catch (error) {
      serialPort = null;
      serialWriter = null;
      renderUtilities();
    }
  }

  async function openSerialPort(port) {
    serialPort = port;
    await serialPort.open({ baudRate: 9600 });
    serialWriter = serialPort.writable.getWriter();
    lastCommand = '';
    renderUtilities();
    await sendArduinoCommand(true);
  }

  async function disconnectSerial() {
    try {
      if (serialWriter) { serialWriter.releaseLock(); serialWriter = null; }
      if (serialPort) await serialPort.close();
    } catch (error) { /* Already disconnected. */ }
    serialPort = null;
    lastCommand = '';
  }

  function resetIdleTimer() {
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(function () { resetExperience(false); }, 60000);
  }

  function resetExperience(withSound) {
    state.system = 'full';
    state.program = 'atap';
    state.scenario = 'sunny';
    state.night = false;
    state.soc = 71;
    state.backupSeconds = 0;
    if (withSound !== false) playTone('click');
    render();
  }

  function setScenario(name) {
    if (name === 'backup' && state.system !== 'full') {
      return;
    }
    if (name === 'cut') {
      playTone('alert');
    } else {
      playTone('click');
    }
    state.scenario = name;
    state.backupSeconds = 0;
    render();
  }

  function weatherForState() {
    if (state.scenario === 'sunny') return 'sunny';
    if (state.scenario === 'rain') return 'rain';
    if (state.scenario === 'evening') return 'evening';
    if (state.scenario === 'late') return 'night';
    if (state.scenario === 'cut') return 'cut';
    if (state.scenario === 'backup') return state.night ? 'night' : 'backup';
    return 'sunny';
  }

  function renderStaticCopy() {
    var c = t();
    document.documentElement.lang = state.lang === 'zh' ? 'zh-Hans' : 'en';
    text('solarSourceLabel', c.solarPV); text('gridSourceLabel', c.grid);
    text('panelKicker', c.panelKicker); text('panelIntro', c.panelIntro);
    text('chooseSystemLabel', c.choose); text('tryScenarioLabel', c.tryScenario);
    text('powerCutLabel', c.powerCutLabel);
    text('systemOnGrid', c.ongrid); text('systemOnGridSub', c.ongridSub);
    text('systemHybrid', c.hybrid); text('systemHybridSub', c.hybridSub);
    text('systemFull', c.full); text('systemFullSub', c.fullSub);
    text('infoEyebrow', c.flowEyebrow);
    text('atsSourceAText', c.grid); text('atsSourceBText', c.atsBackup);
    html('inverterLabel', state.system === 'ongrid' ? (state.lang === 'en' ? 'ON-GRID INVERTER' : '并网型逆变器') : c.inverter);
    html('distributionLabel', c.distribution);
    text('lightLabel', c.light); text('fanLabel', c.fan);
    text('legendSolar', c.solar); text('legendBattery', c.battery); text('legendGrid', c.grid); text('legendHome', c.home);
    text('homePoweredLabel', c.homePowered); text('solarGoesLabel', c.solarGoes);
  }

  function renderUtilities() {
    var c = t();
    document.querySelectorAll('[data-lang]').forEach(function (button) {
      var active = button.dataset.lang === state.lang;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    el('dayToggleIcon').className = 'celestial-icon ' + (state.night ? 'moon-icon' : 'sun-icon');
    text('dayToggleLabel', state.night ? c.night : c.day);
    el('dayToggle').setAttribute('aria-pressed', String(state.night));
    el('lampButton').classList.toggle('connected', Boolean(serialPort));
    text('lampLabel', serialPort ? c.connected : c.lamp);
  }

  function renderControls() {
    document.querySelectorAll('.system-card').forEach(function (button) {
      var active = button.dataset.system === state.system;
      button.classList.toggle('active', active);
      button.setAttribute('aria-checked', String(active));
      var mark = button.querySelector('.radio-mark');
      if (mark) mark.textContent = active ? '✓' : '';
    });
    document.querySelectorAll('[data-program]').forEach(function (button) {
      var active = button.dataset.program === state.program;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    var c = t();
    var order = state.night ? scenarioOrder.night : scenarioOrder.day;
    el('scenarioGrid').innerHTML = order.map(function (name) {
      var item = c.scenarios[name];
      var active = name === state.scenario;
      var unavailable = name === 'backup' && state.system !== 'full';
      var subtitle = unavailable ? c.backupUnavailable : item[1];
      return '<button type="button" class="scenario-button' + (active ? ' active' : '') + (unavailable ? ' unavailable' : '') + '" data-scenario-button="' + name + '" style="--accent:' + scenarioColors[name] + '" aria-pressed="' + active + '" aria-disabled="' + unavailable + '"' + (unavailable ? ' disabled' : '') + '>' +
        '<span class="scenario-icon" aria-hidden="true">' + scenarioIconMarkup(name) + '</span><span><strong>' + item[0] + '</strong><small>' + subtitle + '</small></span>' +
        '<span class="scenario-check" aria-hidden="true">&#10003;</span></button>';
    }).join('');
  }

  function setFlow(id, active, color, slow) {
    var node = el(id);
    var suffix = id.indexOf('flow') === 0 ? id.slice(4) : id;
    var layers = [node, el('aura' + suffix), el('core' + suffix)].filter(Boolean);
    layers.forEach(function (layer) {
      layer.classList.toggle('active', Boolean(active));
      layer.classList.toggle('slow', Boolean(active && slow));
      if (color) layer.style.setProperty('--flow-color', color);
    });
  }

  function clearFlows() {
    ['flowSolar','flowGridIn','flowGridOut','flowOnGrid','flowSourceA','flowAtsOut','flowDirect','flowHome','flowBatteryCharge','flowBatterySupply','flowBackup'].forEach(function (id) {
      setFlow(id, false, '', false);
    });
    el('sourceJunction').classList.remove('active');
    el('batteryJunction').classList.remove('active');
  }

  function renderFlows() {
    clearFlows();
    var s = state.scenario;
    var full = state.system === 'full';
    var homeOn = s !== 'cut';
    var sourceActive = false;
    var batteryActive = false;

    function routeToHome(sourceColor) {
      if (full) {
        setFlow('flowSourceA', true, sourceColor);
        setFlow('flowAtsOut', true, '#ffc039');
      } else {
        setFlow('flowDirect', true, sourceColor);
      }
      setFlow('flowHome', true, '#ffc039');
    }

    if (s === 'sunny') {
      setFlow('flowSolar', true, '#ff9f24');
      setFlow('flowOnGrid', true, '#ff9f24');
      routeToHome('#ff9f24');
      if (state.program === 'atap') setFlow('flowGridOut', true, '#1fc866');
      if (full && state.soc < 100) { setFlow('flowBatteryCharge', true, '#2588f5'); batteryActive = true; }
      sourceActive = true;
    } else if (s === 'rain') {
      setFlow('flowSolar', true, '#ff9f24', true);
      setFlow('flowOnGrid', true, '#ff9f24', true);
      setFlow('flowGridIn', true, '#1fc866');
      routeToHome('#1fc866');
      sourceActive = true;
    } else if (s === 'evening') {
      setFlow('flowGridIn', true, '#1fc866');
      routeToHome(full ? '#20bca8' : '#1fc866');
      if (full && state.soc > 20) {
        setFlow('flowBatterySupply', true, '#2588f5');
        setFlow('flowOnGrid', true, '#2588f5');
        batteryActive = true;
      }
      sourceActive = true;
    } else if (s === 'late') {
      setFlow('flowGridIn', true, '#1fc866');
      routeToHome('#1fc866');
      sourceActive = true;
    } else if (s === 'backup') {
      if (!state.night) setFlow('flowSolar', true, '#ff9f24', true);
      setFlow('flowBatterySupply', true, '#2588f5');
      setFlow('flowBackup', true, '#2588f5');
      setFlow('flowAtsOut', true, '#ffc039');
      setFlow('flowHome', true, '#ffc039');
      batteryActive = true;
    }

    el('sourceJunction').classList.toggle('active', sourceActive);
    el('sourceJunction').style.color = s === 'rain' || s === 'late' ? '#1fc866' : '#ff9f24';
    el('batteryJunction').classList.toggle('active', batteryActive);
    el('batteryJunction').style.color = '#2588f5';
    el('homeModule').classList.toggle('off', !homeOn);
    el('atsDevice').dataset.source = s === 'backup' ? 'b' : s === 'cut' ? 'off' : 'a';
    el('atsHandle').style.transform = s === 'backup' ? 'rotate(38deg)' : 'rotate(-38deg)';
    text('atsSourceLabel', s === 'backup' ? t().sourceBBackup : s === 'cut' ? t().gridOff : t().sourceANormal);
  }

  function batteryMode() {
    if (state.system !== 'full') return 'standby';
    if (state.scenario === 'sunny' && state.soc < 100) return 'charging';
    if ((state.scenario === 'evening' || state.scenario === 'backup') && state.soc > 20) return 'supplying';
    if (state.soc >= 100) return 'fullState';
    return 'standby';
  }

  function renderBattery() {
    var mode = batteryMode();
    var label = t()[mode];
    document.querySelectorAll('.battery-unit').forEach(function (node) {
      node.dataset.mode = mode;
      node.classList.toggle('low-charge', state.soc <= 20);
    });
    document.querySelectorAll('.battery-percent').forEach(function (node) { node.textContent = state.soc + '%'; });
    document.querySelectorAll('.battery-state').forEach(function (node) { node.textContent = label; });
    document.querySelectorAll('.battery-meter i').forEach(function (node) {
      node.style.height = Math.max(5, state.soc) + '%';
      node.style.background = state.soc <= 20 ? 'linear-gradient(#ffd05c,#ff9e19)' : 'linear-gradient(#2f9aff,#0875df)';
    });
    text('availabilityNote', state.system === 'ongrid' ? t().notInstalled : state.system === 'hybrid' ? t().ready : '');
  }

  function segments(items) {
    return items.map(function (item) {
      return '<span class="energy-segment ' + item[0] + '" style="width:' + item[1] + '%">' + item[2] + '</span>';
    }).join('');
  }

  function energyData() {
    var c = t();
    var s = state.scenario;
    if (s === 'sunny') {
      var solarDestination;
      if (state.system === 'full') {
        solarDestination = state.program === 'atap' ? [['home',45,c.home],['battery',30,c.battery],['grid',25,c.grid]] : [['home',58,c.home],['battery',42,c.battery]];
      } else {
        solarDestination = state.program === 'atap' ? [['home',70,c.home],['grid',30,c.grid]] : [['home',100,c.home]];
      }
      return { home: [['solar',100,c.solar]], solar: solarDestination };
    }
    if (s === 'rain') return { home: [['solar',25,c.solar],['grid',75,c.grid]], solar: [['home',100,c.home]] };
    if (s === 'evening') return state.system === 'full' ? { home: [['battery',60,c.battery],['grid',40,c.grid]], solar: [['none',100,state.lang === 'en' ? 'No solar now' : '目前没有太阳能']] } : { home: [['grid',100,c.grid]], solar: [['none',100,state.lang === 'en' ? 'No solar now' : '目前没有太阳能']] };
    if (s === 'late') return { home: [['grid',100,c.grid]], solar: [['none',100,state.lang === 'en' ? 'No solar now' : '目前没有太阳能']] };
    if (s === 'cut') return { home: [['none',100,state.lang === 'en' ? 'No power' : '没有电力']], solar: [['none',100,state.lang === 'en' ? 'On-grid port stopped' : '并网端口已停止']] };
    return { home: state.night ? [['battery',100,c.battery]] : [['battery',58,c.battery],['solar',42,c.solar]], solar: [['home',100,c.home]] };
  }

  function scenarioDetail() {
    var c = t();
    var detail = c.details[state.scenario].slice();
    var noBattery = state.system !== 'full';
    if (state.scenario === 'sunny') {
      if (state.program === 'selco') {
        detail[3] = state.lang === 'en' ? 'ZERO EXPORT · SOLAR TO HOME' : '零输出 · 太阳能供家庭使用';
        detail[2] = noBattery
          ? (state.lang === 'en' ? 'Solar powers the home. SELCO is zero export, so production is limited to what the home can use.' : '太阳能为家庭供电。SELCO不输出余电，因此发电量会限制在家庭所需范围内。')
          : (state.lang === 'en' ? 'Solar powers the home and charges the batteries. SELCO keeps surplus energy from exporting to TNB.' : '太阳能为家庭供电并为电池充电。SELCO会阻止多余电力输出至国家电网。');
      } else if (noBattery) {
        detail[2] = state.lang === 'en' ? 'Solar powers the home first. With no battery installed, all surplus energy exports to TNB under Solar ATAP.' : '太阳能优先为家庭供电。由于没有安装电池，多余电力会通过Solar ATAP输出至国家电网。';
      }
    }
    if ((state.scenario === 'evening' || state.scenario === 'late') && noBattery) {
      detail[1] = state.lang === 'en' ? 'TNB at Night' : '夜间由国家电网供电';
      detail[2] = state.lang === 'en' ? 'The sun is down and no battery is installed, so TNB powers the home through the normal supply.' : '太阳已经下山，而且没有安装电池，因此家庭由国家电网正常供电。';
      detail[3] = state.lang === 'en' ? 'POWERED BY TNB' : '国家电网供电';
    }
    return detail;
  }

  function renderInfo() {
    var c = t();
    var detail = scenarioDetail();
    text('infoTitle', detail[1]);
    text('infoText', detail[2]);
    html('infoIcon', scenarioIconMarkup(state.scenario));
    el('infoIcon').style.setProperty('--accent', scenarioColors[state.scenario]);
    var energy = energyData();
    el('homeEnergyBar').innerHTML = segments(energy.home);
    el('solarEnergyBar').innerHTML = segments(energy.solar);
  }

  function render() {
    experience.dataset.system = state.system;
    experience.dataset.program = state.program;
    experience.dataset.scenario = state.scenario;
    experience.dataset.weather = weatherForState();
    renderStaticCopy();
    renderUtilities();
    renderControls();
    renderFlows();
    renderBattery();
    renderInfo();
    scheduleWireLayout();
    sendArduinoCommand(false);
    resetIdleTimer();
  }

  function toggleDayNight() {
    state.night = !state.night;
    if (state.night) {
      if (state.scenario === 'sunny') state.scenario = 'evening';
      else if (state.scenario === 'rain') state.scenario = 'late';
    } else {
      if (state.scenario === 'evening') state.scenario = 'sunny';
      else if (state.scenario === 'late') state.scenario = 'rain';
    }
    render();
  }

  document.addEventListener('click', function (event) {
    var systemButton = event.target.closest('.system-card');
    var programButton = event.target.closest('.program-toggle [data-program]');
    var scenarioButton = event.target.closest('[data-scenario-button]');
    var languageButton = event.target.closest('[data-lang]');
    if (systemButton) {
      state.system = systemButton.dataset.system;
      if (state.system !== 'full' && state.scenario === 'backup') state.scenario = state.night ? 'late' : 'rain';
      playTone('click'); render();
    } else if (programButton) {
      state.program = programButton.dataset.program;
      playTone('click'); render();
    } else if (scenarioButton) {
      setScenario(scenarioButton.dataset.scenarioButton);
    } else if (languageButton) {
      state.lang = languageButton.dataset.lang;
      render();
    }
  });

  el('dayToggle').addEventListener('click', toggleDayNight);
  el('resetButton').addEventListener('click', function () { resetExperience(false); });
  el('lampButton').addEventListener('click', connectSerial);
  ['pointerdown','keydown','touchstart'].forEach(function (name) {
    window.addEventListener(name, resetIdleTimer, { passive: true });
  });

  window.addEventListener('resize', scheduleWireLayout);
  window.addEventListener('boothdisplaychange', scheduleWireLayout);
  window.addEventListener('load', scheduleWireLayout);
  if ('ResizeObserver' in window) {
    new ResizeObserver(scheduleWireLayout).observe(document.querySelector('.visual-stage'));
  }
  document.querySelectorAll('.component-image, .house-shell').forEach(function (image) {
    image.addEventListener('load', scheduleWireLayout);
  });

  if ('serial' in navigator) {
    navigator.serial.addEventListener('disconnect', function () { disconnectSerial().then(renderUtilities); });
    navigator.serial.getPorts().then(function (ports) {
      if (ports[0] && !serialPort) openSerialPort(ports[0]).catch(function () { disconnectSerial().then(renderUtilities); });
    });
  }

  window.setInterval(function () {
    var changed = false;
    if (state.system === 'full' && state.scenario === 'sunny' && state.soc < 100) {
      state.soc += 1; changed = true;
    } else if (state.system === 'full' && state.scenario === 'evening' && state.soc > 20) {
      state.backupSeconds += 1;
      if (state.backupSeconds % 2 === 0) { state.soc -= 1; changed = true; }
    } else if (state.system === 'full' && state.scenario === 'backup' && state.soc > 20) {
      state.backupSeconds += 1;
      if (state.backupSeconds % 4 === 0) { state.soc -= 1; changed = true; }
    }
    if (changed) { renderBattery(); renderFlows(); renderInfo(); }
  }, 1000);

  render();
})();
