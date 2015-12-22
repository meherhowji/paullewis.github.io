'use strict';

class MagneticSnow {
  constructor () {

    this.time = 0;
    this.width = 0;
    this.height = 0;
    this.snow = [];
    this.inputs = {};

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

    requestAnimationFrame(this.update);
  }

  get MIN_DIST_SQ () {
    return 180000;
  }

  createSnow () {
    for (var i = 0; i < this.width; i++) {
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
      r: 1 + Math.random() * 2.5,
      a: 0.3 + Math.random() * 0.7
    };
  }

  update (now) {

    let input;
    let inputKeys = Object.keys(this.inputs);

    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.save();
    this.ctx.fillStyle = '#FFFFFF';

    // Draw the ring around the inputs.
    inputKeys.forEach((inputKey) => {

      input = this.inputs[inputKeys[inputKey]];
      input.strength += (input.targetStrength - input.strength) * 0.1;

      let fluctuation = Math.sin(((input.start + now) % 1570) * 0.001);
      let radius = Math.abs(fluctuation * 100);

      this.ctx.globalAlpha = input.strength * Math.max(0.16,
          (input.strength - fluctuation) * 0.5);

      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.arc(input.x, input.y,
          radius, 0, Math.PI * 2);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.globalAlpha = 1;

      this.ctx.beginPath();
      this.ctx.arc(input.x, input.y,
          Math.max(0, radius - 4), 0, Math.PI * 2);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.globalCompositeOperation = 'source-over';

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
    let inputMass = 3000;
    let snowFlakeMass = 1;
    let force = 1;

    this.snow.forEach((snowFlake, index) => {

      // Start with gravity.
      snowFlake.ax = snowFlake.dvx;
      snowFlake.ay = snowFlake.r * 0.02;

      inputKeys.forEach((inputKey) => {

        input = this.inputs[inputKeys[inputKey]];
        let fluctuation = Math.sin(((input.start + now) % 1570) * 0.001);

        dx = snowFlake.x - input.x;
        dy = snowFlake.y - input.y;

        distanceSquared = dx * dx + dy * dy;
        angle = Math.atan2(dy, dx);

        // Use the radius as a proxy for the snowflake's mass.
        snowFlakeMass = snowFlake.r;

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

      this.ctx.globalAlpha = snowFlake.a;
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.arc(snowFlake.x, snowFlake.y, snowFlake.r, 0, Math.PI * 2);
      this.ctx.closePath();
      this.ctx.fill();

    });

    this.ctx.restore();
    requestAnimationFrame(this.update);
  }

  onInteractStart (evt) {

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
        y: touchEvent.clientY
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
  }
}

new MagneticSnow();
