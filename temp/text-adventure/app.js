/*!
 *
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/* eslint-env es6 */

class App {
  constructor () {
    if (!('serviceWorker' in navigator)) {
      console.error('No service workers');
      return;
    }

    if ((!('PushManager' in window)) || Notification.permission === 'denied') {
      console.warn('No push manager or permission denied');
      return;
    }

    this._onMessage = this._onMessage.bind(this);
    this._onRegistration = this._onRegistration.bind(this);
    this._startAdventure = this._startAdventure.bind(this);

    this._button = document.querySelector('.start-adventure')
    this._currentVersion = null;
    this._registerServiceWorker();
    this._key = new Uint8Array([4,84,7,205,103,88,137,201,233,56,199,24,121,204,115,205,197,21,65,143,73,63,244,234,125,143,157,145,197,108,204,147,152,198,150,116,156,154,39,197,93,8,11,142,230,85,190,92,136,119,103,252,24,188,170,59,3,96,13,45,38,244,87,240,200]);
    this._keyString = this._key.toString();

    this._addEventListeners();
  }

  _enableButtonWhenReady () {
    return navigator.serviceWorker.ready.then(registration => {
      if (!registration) {
        return;
      }

      this._button.disabled = false;
    });
  }

  _addEventListeners () {
    this._button.addEventListener('click', this._startAdventure);
  }

  _onMessage (evt) {
    if (typeof evt.data.version !== 'undefined') {
      if (this._currentVersion === null) {
        this._currentVersion = evt.data.version;
      } else {
        const newVersion = evt.data.version;
        const cvParts = this._currentVersion.split('.');
        const nvParts = newVersion.split('.');

        if (cvParts[0] === nvParts[0]) {
          console.log('Service Worker moved from ' +
                    this._currentVersion + ' to ' + newVersion);
        } else {
          console.log('Site updated. Refresh to get the latest!');
        }
      }
    }
  }

  _onRegistration (registration) {
    if (registration.active) {
      registration.active.postMessage('version');
    }

    // We should also start tracking for any updates to the Service Worker.
    registration.onupdatefound = function () {
      console.log('A new version has been found... Installing...');

      // If an update is found the spec says that there is a new Service Worker
      // installing, so we should wait for that to complete then show a
      // notification to the user.
      registration.installing.onstatechange = function () {
        if (this.state === 'installed') {
          return console.log('App updated');
        }

        if (this.state === 'activated') {
          registration.active.postMessage('version');
        }

        console.log('Incoming SW state:', this.state);
      };
    };

    this._enableButtonWhenReady();
  }

  _registerServiceWorker () {
    navigator.serviceWorker.onmessage = this._onMessage;
    navigator.serviceWorker.register('./sw.js').then(this._onRegistration);
  }

  _getSubscription () {
    return navigator.serviceWorker.ready.then(registration => {
      return registration.pushManager.getSubscription().then(subscription => {
        if (subscription && !this._keyHasChanged) {
          return subscription;
        }

        return idbKeyval.set('appkey', this._keyString).then(_ => {
          return registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: this._key
          }).catch(err => {
            console.log(`Subscription rejected: ${err}`);
            return null;
          });
        });
      });
    });
  }

  _startAdventure () {
    return this._getSubscription().then(subscription => {
      if (!subscription) {
        console.error('Need a subscription to play!');
        return;
      }

      return navigator.serviceWorker.getRegistration().then(registration => {
        registration.active.postMessage('start');
      });
    });
  }
}

new App();
