/**
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MagneticSnow = (function () {
  function MagneticSnow() {
    _classCallCheck(this, MagneticSnow);

    console.log('v1.0.2');
    this.bestTime = window.localStorage.getItem('best');

    this.time = 0;
    this.width = 0;
    this.height = 0;
    this.snow = [];
    this.snowFlakeCanvas = document.createElement('canvas');
    this.inputs = {};
    this.target = {
      x: 0,
      y: 0
    };
    this.hitCount = 0;
    this.isPlaying = false;
    this.startPlayTime = 0;

    this.timeElement = document.querySelector('.time');
    this.playTimeElement = document.querySelector('.playtime');
    this.playButtonElement = document.querySelector('.play');
    this.meterElement = document.querySelector('.meter-inner');
    this.meterGlowElement = document.querySelector('.meter-inner-glow');
    this.targetElement = document.querySelector('.target');
    this.element = document.querySelector('canvas');
    this.ctx = this.element.getContext('2d');

    this.onResize = this.onResize.bind(this);
    this.update = this.update.bind(this);

    this.onInteractStart = this.onInteractStart.bind(this);
    this.onInteractEnd = this.onInteractEnd.bind(this);
    this.onInteractMove = this.onInteractMove.bind(this);

    this.addEventListeners();
    this.onResize();
    this.createSnow();
    this.createSnowParticle();
    this.writeBestTime();

    requestAnimationFrame(this.update);
  }

  _createClass(MagneticSnow, [{
    key: 'writeBestTime',
    value: function writeBestTime() {

      if (this.bestTime === null) return;

      this.timeElement.innerText = 'Best time: ' + this.bestTime + 's';
    }
  }, {
    key: 'createSnow',
    value: function createSnow() {
      for (var i = 0; i < this.width * 0.67; i++) {
        this.snow.push(this.createSnowflake());
      }
    }
  }, {
    key: 'createSnowflake',
    value: function createSnowflake() {
      return {
        x: Math.random() * this.width,
        y: Math.random() * -this.height - 100,
        dvx: (Math.random() - 0.5) * 0.015,
        dvy: 1.3 + Math.random(),
        vx: 0,
        vy: 0,
        ax: 0,
        ay: 0,
        s: 1 + Math.random() * 3,
        a: 0.3 + Math.random() * 0.7
      };
    }
  }, {
    key: 'createSnowParticle',
    value: function createSnowParticle() {
      var ctx = this.snowFlakeCanvas.getContext('2d');
      this.snowFlakeCanvas.width = 256;
      this.snowFlakeCanvas.height = 256;

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(128, 128, 128, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    }
  }, {
    key: 'update',
    value: function update(now) {
      var _this = this;

      var input = undefined;
      var inputKeys = Object.keys(this.inputs);

      this.targetElement.classList.remove('hit');
      this.ctx.clearRect(0, 0, this.width, this.height);

      this.ctx.save();
      this.ctx.fillStyle = '#FFFFFF';

      // Draw the ring around the inputs.
      inputKeys.forEach(function (inputKey) {

        input = _this.inputs[inputKey];

        if (!input) return;

        if (!input.visible) return;

        input.strength += (input.targetStrength - input.strength) * 0.1;

        var fluctuation = Math.sin(now % 1570 * 0.001);
        var radius = Math.abs(fluctuation * 100);

        _this.ctx.globalAlpha = Math.max(0, input.strength - fluctuation);

        _this.ctx.lineWidth = 6 - fluctuation * 6;
        _this.ctx.strokeStyle = '#FFFFFF';
        _this.ctx.beginPath();
        _this.ctx.arc(input.x, input.y, Math.max(0, radius - 4), 0, Math.PI * 2);
        _this.ctx.closePath();
        _this.ctx.stroke();

        // Now the glow.
        _this.ctx.globalAlpha = input.strength;
        var gradient = _this.ctx.createRadialGradient(input.x, input.y, 0, input.x, input.y, 100);

        gradient.addColorStop(0, 'rgba(125, 244, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(125, 244, 255, 0)');

        _this.ctx.fillStyle = gradient;
        _this.ctx.beginPath();
        _this.ctx.arc(input.x, input.y, 100, 0, Math.PI * 2);
        _this.ctx.closePath();
        _this.ctx.fill();
        _this.ctx.globalAlpha = 1;
      });

      // Now each snowflake.
      var distanceSquared = 0;
      var dx = 0;
      var dy = 0;
      var angle = 0;
      var inputMass = 2400;
      var snowFlakeMass = 1;
      var force = 1;

      this.snow.forEach(function (snowFlake, index) {

        // Start with gravity.
        snowFlake.ax = snowFlake.dvx;
        snowFlake.ay = snowFlake.s * 0.01;

        inputKeys.forEach(function (inputKey) {

          input = _this.inputs[inputKey];

          if (!input) return;

          var fluctuation = Math.sin((input.start + now) % 1570 * 0.001);

          dx = snowFlake.x - input.x;
          dy = snowFlake.y - input.y;

          distanceSquared = dx * dx + dy * dy;
          angle = Math.atan2(dy, dx);

          // Use the radius as a proxy for the snowflake's mass.
          snowFlakeMass = snowFlake.s;

          if (distanceSquared < _this.MIN_DIST_SQ) {

            // Make sure we never treat it as so close that force becomes
            // super massive!
            distanceSquared = Math.max(100, distanceSquared);

            // Force = inputMass * snowFlakeMass / r*r
            // Force = mass * acceleration
            force = inputMass * snowFlakeMass * Math.max(0.5, fluctuation) * input.strength / distanceSquared;

            snowFlake.ax += force / snowFlakeMass * Math.cos(angle);
            snowFlake.ay += force / snowFlakeMass * Math.sin(angle);
          }
        });

        snowFlake.vx += snowFlake.ax;
        snowFlake.vy += snowFlake.ay;

        snowFlake.vx *= 0.99;
        snowFlake.vy *= 0.99;

        snowFlake.x += snowFlake.vx;
        snowFlake.y += snowFlake.vy;

        if (snowFlake.y > _this.height) _this.snow[index] = _this.createSnowflake();

        // If it hits the target, increment the count and recycle the snow.
        if (_this.isPlaying && _this.intersectsTarget(snowFlake.x, snowFlake.y)) {

          if (_this.hitCount >= _this.MAX_HIT_COUNT) {
            _this.stopGame();
          }

          _this.hitCount++;

          var progress = Math.min(1, _this.hitCount / _this.MAX_HIT_COUNT);
          var progressPercentage = progress * 100;

          _this.meterElement.style.height = progressPercentage + '%';

          _this.meterGlowElement.style.opacity = progress;
          _this.meterGlowElement.style.height = progressPercentage + '%';

          _this.targetElement.classList.add('hit');
          _this.snow[index] = _this.createSnowflake();
        }

        // Blit the circle across rather than drawing an arc
        // because it's significantly faster.
        _this.ctx.save();
        _this.ctx.globalAlpha = snowFlake.a;
        _this.ctx.drawImage(_this.snowFlakeCanvas, snowFlake.x, snowFlake.y, snowFlake.s, snowFlake.s);

        _this.ctx.restore();
      });

      this.ctx.restore();

      if (this.isPlaying) {
        var playTime = (Date.now() - this.startPlayTime) / 1000;
        this.playTimeElement.innerText = playTime.toFixed(2) + 's';
      }

      requestAnimationFrame(this.update);
    }
  }, {
    key: 'intersectsTarget',
    value: function intersectsTarget(x, y) {
      return x >= this.target.left && x <= this.target.right && y >= this.target.top && y <= this.target.bottom;
    }
  }, {
    key: 'centerPushAway',
    value: function centerPushAway() {
      var _this2 = this;

      this.inputs.pushAway = {
        start: window.performance.now(),
        targetStrength: 30,
        strength: 30,
        x: this.width * 0.5,
        y: this.height * 0.5,
        visible: false
      };

      setTimeout(function () {
        delete _this2.inputs.pushAway;
      }, 1000);
    }
  }, {
    key: 'startGame',
    value: function startGame() {
      this.hitCount = 0;
      this.isPlaying = true;
      this.startPlayTime = Date.now();

      this.playTimeElement.innerText = '';
      this.meterElement.style.height = '0%';
      this.meterGlowElement.style.opacity = '0';
      this.meterGlowElement.style.height = '0%';

      document.body.classList.add('playing');
    }
  }, {
    key: 'stopGame',
    value: function stopGame() {
      this.isPlaying = false;
      this.centerPushAway();
      this.playTimeElement.innerText = '';

      var playTime = (Date.now() - this.startPlayTime) / 1000;
      var bestTime = parseInt(this.bestTime);

      if (isNaN(bestTime)) bestTime = Number.POSITIVE_INFINITY;

      if (playTime < bestTime) {
        this.bestTime = playTime;
        window.localStorage.setItem('best', playTime.toFixed(2));
      }

      this.writeBestTime();

      document.body.classList.remove('playing');
    }
  }, {
    key: 'onInteractStart',
    value: function onInteractStart(evt) {

      if (evt.target === this.playButtonElement) {
        this.startGame();
        return;
      }

      evt.preventDefault();

      var touchEvent = undefined,
          id = undefined;

      if (typeof evt.changedTouches === 'undefined') evt.changedTouches = [evt];

      for (var t = 0; t < evt.changedTouches.length; t++) {
        touchEvent = evt.changedTouches[t];
        id = touchEvent.identifier || 0;

        this.inputs[id] = {
          start: window.performance.now(),
          targetStrength: touchEvent.force || 1,
          strength: 0,
          x: touchEvent.clientX,
          y: touchEvent.clientY,
          visible: true
        };
      }
    }
  }, {
    key: 'onInteractEnd',
    value: function onInteractEnd(evt) {
      evt.preventDefault();

      var touchEvent = undefined,
          id = undefined;

      if (typeof evt.changedTouches === 'undefined') evt.changedTouches = [evt];

      for (var t = 0; t < evt.changedTouches.length; t++) {
        touchEvent = evt.changedTouches[t];
        id = touchEvent.identifier || 0;
        delete this.inputs[id];
      }
    }
  }, {
    key: 'onInteractMove',
    value: function onInteractMove(evt) {

      evt.preventDefault();

      var touchEvent = undefined,
          id = undefined;

      if (typeof evt.changedTouches === 'undefined') evt.changedTouches = [evt];

      for (var t = 0; t < evt.changedTouches.length; t++) {
        touchEvent = evt.changedTouches[t];
        id = touchEvent.identifier || 0;

        if (typeof this.inputs[id] === 'undefined') continue;

        this.inputs[id].x = touchEvent.clientX;
        this.inputs[id].y = touchEvent.clientY;
      }
    }
  }, {
    key: 'addEventListeners',
    value: function addEventListeners() {
      window.addEventListener('resize', this.onResize);

      document.addEventListener('mousedown', this.onInteractStart);
      document.addEventListener('mouseup', this.onInteractEnd);
      document.addEventListener('mousemove', this.onInteractMove);

      document.addEventListener('touchstart', this.onInteractStart);
      document.addEventListener('touchend', this.onInteractEnd);
      document.addEventListener('touchmove', this.onInteractMove);
    }
  }, {
    key: 'removeEventListeners',
    value: function removeEventListeners() {
      window.removeEventListener('resize', this.onResize);

      document.removeEventListener('mousedown', this.onInteractStart);
      document.removeEventListener('mouseup', this.onInteractEnd);
      document.removeEventListener('mousemove', this.onInteractMove);

      document.removeEventListener('touchstart', this.onInteractStart);
      document.removeEventListener('touchend', this.onInteractEnd);
      document.removeEventListener('touchmove', this.onInteractMove);
    }
  }, {
    key: 'onResize',
    value: function onResize() {

      var dPR = window.devicePixelRatio || 1;

      this.width = window.innerWidth;
      this.height = window.innerHeight;

      this.element.width = this.width * dPR;
      this.element.height = this.height * dPR;

      this.element.style.width = this.width + 'px';
      this.element.style.height = this.height + 'px';

      this.ctx.scale(dPR, dPR);

      this.target = {
        w: this.width * 0.1,
        y: this.height * 0.9,
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
      };

      this.target.left = (this.width - this.target.w) * 0.5;
      this.target.right = this.target.left + this.target.w;
      this.target.top = this.target.y;
      this.target.bottom = this.target.y + 10;
    }
  }, {
    key: 'MAX_HIT_COUNT',
    get: function get() {
      return 100;
    }
  }, {
    key: 'MIN_DIST_SQ',
    get: function get() {
      return 180000;
    }
  }]);

  return MagneticSnow;
})();

window.addEventListener('load', function () {
  new MagneticSnow();
});

