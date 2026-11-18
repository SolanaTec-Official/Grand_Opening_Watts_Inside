(function () {
  'use strict';

  var experience = document.getElementById('experience');
  var weather = document.getElementById('weatherSystem');
  var canvas = document.getElementById('weatherParticles');
  if (!experience || !weather || !canvas) return;

  var context = canvas.getContext('2d', { alpha: true });
  var plates = [
    weather.querySelector('.weather-plate-a'),
    weather.querySelector('.weather-plate-b')
  ];
  var sources = {
    sunny: 'assets/weather-sunny-dynamic-v3.png',
    rain: 'assets/weather-storm-dynamic-v3.png',
    evening: 'assets/weather-evening-dynamic-v4.png',
    night: 'assets/weather-night-dynamic-v3.png',
    cut: 'assets/weather-sunny-dynamic-v3.png',
    backup: 'assets/weather-sunny-dynamic-v3.png'
  };

  /* Decode every weather plate during the initial sunny screen so the first
     day/night change never waits for a large image to load or decompress. */
  var preloadedSources = {};
  Object.keys(sources).forEach(function (key) {
    var source = sources[key];
    if (preloadedSources[source]) return;
    var image = new Image();
    image.decoding = 'async';
    image.src = source;
    if (image.decode) image.decode().catch(function () { /* The browser will still use its normal loader. */ });
    preloadedSources[source] = image;
  });

  var activePlate = 0;
  var currentMode = '';
  var width = 0;
  var height = 0;
  var pixelRatio = 1;
  var rainDrops = [];
  var particlesDirty = true;
  var lastFrame = performance.now();
  var nextLightning = 0;
  var lightningUntil = 0;
  var lightning = null;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function random(minimum, maximum) {
    return minimum + Math.random() * (maximum - minimum);
  }

  function resizeCanvas() {
    var bounds = weather.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    pixelRatio = Math.min(1.5, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    buildRain();
    particlesDirty = true;
  }

  function buildRain() {
    var count = clamp(Math.round((width * height) / 8500), 90, 270);
    rainDrops = Array.from({ length: count }, function () {
      return {
        x: random(-width * .1, width * 1.05),
        y: random(-height, height),
        length: random(13, 36),
        speed: random(620, 1180),
        width: random(.55, 1.5),
        opacity: random(.16, .58)
      };
    });
  }

  function drawRain(delta) {
    context.save();
    context.lineCap = 'round';
    rainDrops.forEach(function (drop) {
      drop.y += drop.speed * delta;
      drop.x -= drop.speed * delta * .16;
      if (drop.y > height + 55 || drop.x < -70) {
        drop.y = random(-height * .38, -35);
        drop.x = random(width * .08, width * 1.12);
      }
      var gradient = context.createLinearGradient(drop.x, drop.y, drop.x - 7, drop.y + drop.length);
      gradient.addColorStop(0, 'rgba(229,244,255,0)');
      gradient.addColorStop(.35, 'rgba(219,239,255,' + drop.opacity + ')');
      gradient.addColorStop(1, 'rgba(168,205,234,0)');
      context.strokeStyle = gradient;
      context.lineWidth = drop.width;
      context.beginPath();
      context.moveTo(drop.x, drop.y);
      context.lineTo(drop.x - 7, drop.y + drop.length);
      context.stroke();
    });
    context.restore();
  }

  function createLightning() {
    var originX = random(width * .28, width * .78);
    var endY = random(height * .48, height * .82);
    var points = [{ x: originX, y: -8 }];
    var x = originX;
    var step = endY / random(8, 13);
    for (var y = step; y < endY; y += step) {
      x += random(-38, 34);
      points.push({ x: x, y: y });
    }
    points.push({ x: x + random(-12, 12), y: endY });

    var branches = [];
    points.slice(3, -2).forEach(function (point, index) {
      if (Math.random() > .58) return;
      var direction = index % 2 ? 1 : -1;
      branches.push([
        point,
        { x: point.x + random(28, 72) * direction, y: point.y + random(28, 60) },
        { x: point.x + random(52, 110) * direction, y: point.y + random(66, 112) }
      ]);
    });

    weather.style.setProperty('--strike-x', (originX / width * 100).toFixed(1) + '%');
    return { points: points, branches: branches };
  }

  function strokeLightning(points, widthValue, alpha) {
    if (!points || points.length < 2) return;
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach(function (point) { context.lineTo(point.x, point.y); });
    context.lineWidth = widthValue;
    context.strokeStyle = 'rgba(239,248,255,' + alpha + ')';
    context.stroke();
  }

  function drawLightning(now) {
    if (!lightning || now > lightningUntil) return;
    var life = clamp((lightningUntil - now) / 330, 0, 1);
    context.save();
    context.globalCompositeOperation = 'screen';
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.shadowBlur = 26;
    context.shadowColor = 'rgba(123,191,255,.95)';
    strokeLightning(lightning.points, 6, life * .32);
    context.shadowBlur = 10;
    strokeLightning(lightning.points, 2.1, life);
    lightning.branches.forEach(function (branch) {
      strokeLightning(branch, 1.15, life * .72);
    });
    context.restore();
  }

  function triggerLightning(now) {
    lightning = createLightning();
    lightningUntil = now + 330;
    weather.classList.remove('is-lightning');
    void weather.offsetWidth;
    weather.classList.add('is-lightning');
    window.setTimeout(function () { weather.classList.remove('is-lightning'); }, 560);
    window.setTimeout(function () { atmosphereAudio.thunder(); }, random(180, 680));
    nextLightning = now + random(4200, 10500);
  }

  function animate(now) {
    var delta = Math.min(.034, Math.max(.001, (now - lastFrame) / 1000));
    lastFrame = now;
    if (currentMode === 'rain') {
      context.clearRect(0, 0, width, height);
      drawRain(delta);
      if (!reducedMotion && now >= nextLightning && !document.hidden) triggerLightning(now);
      drawLightning(now);
      particlesDirty = true;
    } else if (particlesDirty) {
      context.clearRect(0, 0, width, height);
      particlesDirty = false;
    }

    window.requestAnimationFrame(animate);
  }

  function sourceFor(mode) {
    return sources[mode] || sources.sunny;
  }

  function setState(mode, instant) {
    mode = sources[mode] ? mode : 'sunny';
    var source = sourceFor(mode);
    var currentSource = plates[activePlate].dataset.source;

    if (!currentSource || instant) {
      plates[activePlate].style.backgroundImage = 'url("' + source + '")';
      plates[activePlate].dataset.source = source;
      plates[activePlate].classList.add('is-active');
    } else if (source !== currentSource) {
      var incoming = activePlate === 0 ? 1 : 0;
      plates[incoming].style.backgroundImage = 'url("' + source + '")';
      plates[incoming].dataset.source = source;
      plates[incoming].classList.add('is-active');
      plates[activePlate].classList.remove('is-active');
      activePlate = incoming;
    }

    currentMode = mode;
    weather.dataset.mode = mode;
    particlesDirty = true;
    nextLightning = mode === 'rain' ? performance.now() + random(1800, 5200) : Infinity;
    lightning = null;
    atmosphereAudio.setMode(mode);
  }

  function AtmosphereAudio() {
    this.context = null;
    this.master = null;
    this.gains = null;
    this.enabled = false;
    this.mode = 'sunny';
  }

  AtmosphereAudio.prototype.makeNoise = function (seconds) {
    var length = Math.floor(this.context.sampleRate * seconds);
    var buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    var data = buffer.getChannelData(0);
    var previous = 0;
    for (var index = 0; index < length; index += 1) {
      var white = Math.random() * 2 - 1;
      previous = previous * .82 + white * .18;
      data[index] = previous * .82 + white * .18;
    }
    return buffer;
  };

  AtmosphereAudio.prototype.enable = function () {
    if (this.enabled) {
      if (this.context && this.context.state === 'suspended') this.context.resume();
      return;
    }
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    try {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = .22;
      this.master.connect(this.context.destination);

      var source = this.context.createBufferSource();
      source.buffer = this.makeNoise(7);
      source.loop = true;

      var windFilter = this.context.createBiquadFilter();
      windFilter.type = 'lowpass';
      windFilter.frequency.value = 760;
      var rainFilter = this.context.createBiquadFilter();
      rainFilter.type = 'highpass';
      rainFilter.frequency.value = 1250;
      var nightFilter = this.context.createBiquadFilter();
      nightFilter.type = 'bandpass';
      nightFilter.frequency.value = 4700;
      nightFilter.Q.value = 1.15;
      var windGain = this.context.createGain();
      var rainGain = this.context.createGain();
      var nightGain = this.context.createGain();
      [windGain, rainGain, nightGain].forEach(function (gain) { gain.gain.value = .0001; });

      source.connect(windFilter).connect(windGain).connect(this.master);
      source.connect(rainFilter).connect(rainGain).connect(this.master);
      source.connect(nightFilter).connect(nightGain).connect(this.master);
      source.start();

      this.gains = { wind: windGain, rain: rainGain, night: nightGain };
      this.enabled = true;
      this.setMode(this.mode);
    } catch (error) {
      this.enabled = false;
    }
  };

  AtmosphereAudio.prototype.setMode = function (mode) {
    this.mode = mode;
    if (!this.enabled || !this.context || !this.gains) return;
    var values = {
      sunny: [.055, .0001, .0001],
      backup: [.055, .0001, .0001],
      rain: [.085, .15, .0001],
      evening: [.034, .0001, .0001],
      night: [.007, .0001, .022],
      cut: [.003, .0001, .0001]
    }[mode] || [.04, .0001, .0001];
    var now = this.context.currentTime;
    ['wind', 'rain', 'night'].forEach(function (name, index) {
      var gain = this.gains[name].gain;
      gain.cancelScheduledValues(now);
      gain.setTargetAtTime(values[index], now, .65);
    }, this);
  };

  AtmosphereAudio.prototype.thunder = function () {
    if (!this.enabled || !this.context || currentMode !== 'rain') return;
    var duration = 3.2;
    var length = Math.floor(this.context.sampleRate * duration);
    var buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    var data = buffer.getChannelData(0);
    var roll = 0;
    for (var index = 0; index < length; index += 1) {
      var time = index / this.context.sampleRate;
      var envelope = Math.exp(-time * 1.65) * (1 - Math.exp(-time * 28));
      roll = roll * .94 + (Math.random() * 2 - 1) * .06;
      data[index] = roll * envelope;
    }

    var source = this.context.createBufferSource();
    source.buffer = buffer;
    var filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    filter.Q.value = .75;
    var gain = this.context.createGain();
    gain.gain.value = .75;
    source.connect(filter).connect(gain).connect(this.master);
    source.start();
  };

  AtmosphereAudio.prototype.setMuted = function (muted) {
    if (!this.master || !this.context) return;
    this.master.gain.setTargetAtTime(muted ? .0001 : .22, this.context.currentTime, .12);
  };

  var atmosphereAudio = new AtmosphereAudio();

  new MutationObserver(function (changes) {
    changes.forEach(function (change) {
      if (change.attributeName === 'data-weather') setState(experience.dataset.weather);
    });
  }).observe(experience, { attributes: true, attributeFilter: ['data-weather'] });

  ['pointerdown', 'touchstart', 'keydown'].forEach(function (eventName) {
    window.addEventListener(eventName, function () { atmosphereAudio.enable(); }, { once: true, passive: true });
  });

  document.addEventListener('visibilitychange', function () {
    if (!atmosphereAudio.context) return;
    if (document.hidden) atmosphereAudio.context.suspend();
    else if (atmosphereAudio.enabled) atmosphereAudio.context.resume();
  });

  window.addEventListener('resize', resizeCanvas);
  if ('ResizeObserver' in window) new ResizeObserver(resizeCanvas).observe(weather);

  window.WeatherDynamics = {
    setState: setState,
    enableAudio: function () { atmosphereAudio.enable(); },
    setMuted: function (muted) { atmosphereAudio.setMuted(Boolean(muted)); }
  };

  resizeCanvas();
  setState(experience.dataset.weather || 'sunny', true);
  window.requestAnimationFrame(animate);
}());

