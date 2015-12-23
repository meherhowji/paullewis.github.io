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

class MagneticSnow {
  constructor () {

    console.log('v1.0.1');
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

  get MAX_HIT_COUNT () {
    return 100;
  }

  get MIN_DIST_SQ () {
    return 180000;
  }

  writeBestTime () {

    if (this.bestTime === null)
      return;

    this.timeElement.innerText = 'Best time: ' + this.bestTime + 's';
  }

  createSnow () {
    for (var i = 0; i < this.width * 0.67; i++) {
      this.snow.push(this.createSnowflake());
    }
  }

  createSnowflake () {
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

  createSnowParticle () {
    let ctx = this.snowFlakeCanvas.getContext('2d');
    this.snowFlakeCanvas.width = 256;
    this.snowFlakeCanvas.height = 256;

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(128, 128, 128, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }

  update (now) {

    let input;
    let inputKeys = Object.keys(this.inputs);

    this.targetElement.classList.remove('hit');
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.save();
    this.ctx.fillStyle = '#FFFFFF';

    // Draw the ring around the inputs.
    inputKeys.forEach((inputKey) => {

      input = this.inputs[inputKey];

      if (!input)
        return;

      if (!input.visible)
        return;

      input.strength += (input.targetStrength - input.strength) * 0.1;

      let fluctuation = Math.sin((now % 1570) * 0.001);
      let radius = Math.abs(fluctuation * 100);

      this.ctx.globalAlpha = Math.max(0, input.strength - fluctuation);

      this.ctx.lineWidth = 6 - fluctuation * 6;
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.arc(input.x, input.y,
          Math.max(0, radius - 4), 0, Math.PI * 2);
      this.ctx.closePath();
      this.ctx.stroke();

      // Now the glow.
      this.ctx.globalAlpha = input.strength;
      let gradient =
          this.ctx.createRadialGradient(
              input.x, input.y, 0,
              input.x, input.y, 100);

      gradient.addColorStop(0, 'rgba(125, 244, 255, 0.4)');
      gradient.addColorStop(1, 'rgba(125, 244, 255, 0)');

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(input.x, input.y,
          100, 0, Math.PI * 2);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.globalAlpha = 1;

    });

    // Now each snowflake.
    let distanceSquared = 0;
    let dx = 0;
    let dy = 0;
    let angle = 0;
    let inputMass = 2400;
    let snowFlakeMass = 1;
    let force = 1;

    this.snow.forEach((snowFlake, index) => {

      // Start with gravity.
      snowFlake.ax = snowFlake.dvx;
      snowFlake.ay = snowFlake.s * 0.01;

      inputKeys.forEach((inputKey) => {

        input = this.inputs[inputKey];

        if (!input)
          return;

        let fluctuation = Math.sin(((input.start + now) % 1570) * 0.001);

        dx = snowFlake.x - input.x;
        dy = snowFlake.y - input.y;

        distanceSquared = dx * dx + dy * dy;
        angle = Math.atan2(dy, dx);

        // Use the radius as a proxy for the snowflake's mass.
        snowFlakeMass = snowFlake.s;

        if (distanceSquared < this.MIN_DIST_SQ) {

          // Make sure we never treat it as so close that force becomes
          // super massive!
          distanceSquared = Math.max(100, distanceSquared);

          // Force = inputMass * snowFlakeMass / r*r
          // Force = mass * acceleration
          force = (inputMass *
                  snowFlakeMass *
                  Math.max(0.5, fluctuation) *
                  input.strength) / distanceSquared;

          snowFlake.ax += (force / snowFlakeMass) * Math.cos(angle);
          snowFlake.ay += (force / snowFlakeMass) * Math.sin(angle);
        }

      });

      snowFlake.vx += snowFlake.ax;
      snowFlake.vy += snowFlake.ay;

      snowFlake.vx *= 0.99;
      snowFlake.vy *= 0.99;

      snowFlake.x += snowFlake.vx;
      snowFlake.y += snowFlake.vy;

      if (snowFlake.y > this.height)
        this.snow[index] = this.createSnowflake();

      // If it hits the target, increment the count and recycle the snow.
      if (this.isPlaying && this.intersectsTarget(snowFlake.x, snowFlake.y)) {

        if (this.hitCount >= this.MAX_HIT_COUNT) {
          this.stopGame();
        }

        this.hitCount++;

        let progress = Math.min(1, this.hitCount / this.MAX_HIT_COUNT);
        let progressPercentage = progress * 100;

        this.meterElement.style.height = progressPercentage + '%';

        this.meterGlowElement.style.opacity = progress;
        this.meterGlowElement.style.height = progressPercentage + '%';

        this.targetElement.classList.add('hit');
        this.snow[index] = this.createSnowflake();
      }

      // Blit the circle across rather than drawing an arc
      // because it's significantly faster.
      this.ctx.save();
      this.ctx.globalAlpha = snowFlake.a;
      this.ctx.drawImage(this.snowFlakeCanvas,
        snowFlake.x, snowFlake.y,
        snowFlake.s, snowFlake.s);

      this.ctx.restore();
    });

    this.ctx.restore();

    if (this.isPlaying) {
      let playTime = (Date.now() - this.startPlayTime) / 1000;
      this.playTimeElement.innerText = playTime.toFixed(2) + 's';
    }

    requestAnimationFrame(this.update);
  }

  intersectsTarget (x, y) {
    return (x >= this.target.left &&
            x <= this.target.right &&
            y >= this.target.top &&
            y <= this.target.bottom);
  }

  centerPushAway () {
    this.inputs.pushAway = {
      start: window.performance.now(),
      targetStrength: 30,
      strength: 30,
      x: this.width * 0.5,
      y: this.height * 0.5,
      visible: false
    };

    setTimeout (() => {
      delete this.inputs.pushAway;
    }, 1000);
  }

  startGame () {
    this.hitCount = 0;
    this.isPlaying = true;
    this.startPlayTime = Date.now();

    this.playTimeElement.innerText = '';
    this.meterElement.style.height = '0%';
    this.meterGlowElement.style.opacity = '0';
    this.meterGlowElement.style.height = '0%';

    document.body.classList.add('playing');
  }

  stopGame () {
    this.isPlaying = false;
    this.centerPushAway();
    this.playTimeElement.innerText = '';

    let playTime = (Date.now() - this.startPlayTime) / 1000;
    let bestTime = parseInt(this.bestTime);

    if (isNaN(bestTime))
      bestTime = Number.POSITIVE_INFINITY;

    if (playTime < bestTime) {
      this.bestTime = playTime;
      window.localStorage.setItem('best', playTime.toFixed(2));
    }

    this.writeBestTime();

    document.body.classList.remove('playing');
  }

  onInteractStart (evt) {

    if (evt.target === this.playButtonElement) {
      this.startGame();
      return;
    }

    evt.preventDefault();

    let touchEvent, id;

    if (typeof evt.changedTouches === 'undefined')
      evt.changedTouches = [evt];

    for (let t = 0; t < evt.changedTouches.length; t++) {
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

  onInteractEnd (evt) {
    evt.preventDefault();

    let touchEvent, id;

    if (typeof evt.changedTouches === 'undefined')
      evt.changedTouches = [evt];

    for (let t = 0; t < evt.changedTouches.length; t++) {
      touchEvent = evt.changedTouches[t];
      id = touchEvent.identifier || 0;
      delete this.inputs[id];
    }
  }

  onInteractMove (evt) {

    evt.preventDefault();

    let touchEvent, id;

    if (typeof evt.changedTouches === 'undefined')
      evt.changedTouches = [evt];

    for (let t = 0; t < evt.changedTouches.length; t++) {
      touchEvent = evt.changedTouches[t];
      id = touchEvent.identifier || 0;

      if (typeof this.inputs[id] === 'undefined')
        continue;

      this.inputs[id].x = touchEvent.clientX;
      this.inputs[id].y = touchEvent.clientY;
    }
  }

  addEventListeners () {
    window.addEventListener('resize', this.onResize);

    document.addEventListener('mousedown', this.onInteractStart);
    document.addEventListener('mouseup', this.onInteractEnd);
    document.addEventListener('mousemove', this.onInteractMove);

    document.addEventListener('touchstart', this.onInteractStart);
    document.addEventListener('touchend', this.onInteractEnd);
    document.addEventListener('touchmove', this.onInteractMove);
  }

  removeEventListeners () {
    window.removeEventListener('resize', this.onResize);

    document.removeEventListener('mousedown', this.onInteractStart);
    document.removeEventListener('mouseup', this.onInteractEnd);
    document.removeEventListener('mousemove', this.onInteractMove);

    document.removeEventListener('touchstart', this.onInteractStart);
    document.removeEventListener('touchend', this.onInteractEnd);
    document.removeEventListener('touchmove', this.onInteractMove);
  }

  onResize () {

    let dPR = window.devicePixelRatio || 1;

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.element.width = this.width * dPR;
    this.element.height = this.height * dPR;

    this.element.style.width = `${this.width}px`;
    this.element.style.height = `${this.height}px`;

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
}

new MagneticSnow();
