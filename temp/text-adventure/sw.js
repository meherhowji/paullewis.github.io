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

const NAME = 'TextAdventure';
const VERSION = '1.0.8';

/* eslint-env es6 */

self.oninstall = evt => {
  const urls = ['/', 'story.json'];

  evt.waitUntil(
    caches
      .open(NAME + '-v' + VERSION)
      .then(cache => {
        return cache.addAll(urls);
      }));

  self.skipWaiting();
};

self.onactivate = _ => {
  const currentCacheName = NAME + '-v' + VERSION;
  caches.keys().then(cacheNames => {
    return Promise.all(
      cacheNames.map(cacheName => {
        if (cacheName.indexOf(NAME) === -1) {
          return null;
        }

        if (cacheName !== currentCacheName) {
          return caches.delete(cacheName);
        }

        return null;
      })
    );
  });

  self.clients.claim();
};

self.onnotificationclick = evt => {
  evt.notification.close();

  const action = evt.action;
  if (!action || action === '__quit') {
    return;
  }

  self._showNode(action);
};

self._showNode = nodeName => {
  return caches.match('story.json')
      .then(r => r.json())
      .then(story => {

        const node = story[nodeName];
        if (!node) {
          throw new Error('Unable to locate node!');
        }

        if (typeof node === 'string') {
          return self._showNode(node);
        }

        node.actions.push({
          action: '__quit',
          title: 'Quit'
        });

        return self.registration.showNotification(nodeName, {
          body: node.text,
          actions: node.actions
        });
      }, err => {
        console.log('Story not found', err);
      });
}

self.onmessage = evt => {
  switch (evt.data) {
    case 'version':
      evt.source.postMessage({
        version: VERSION
      });
      break;

    case 'start':
      self._showNode('__start');
      break;
  }
};

self.onfetch = evt => {
  evt.respondWith(
    caches.match(evt.request)
          .then(response => {
            if (response) {
              return response;
            }

            const request = evt.request;
            return fetch(request).then(fetchResponse => {
              // Never cache Analytics, Conversion or Push requests.
              if (/google/.test(request.url) || /cds-push/.test(request.url)) {
                return fetchResponse;
              }

              // Cache for next time.
              return caches.open(NAME + '-v' + VERSION).then(cache => {
                return cache.put(request.clone(), fetchResponse.clone());
              }).then(_ => {
                return fetchResponse;
              });
            }, err => {
              console.warn(`Unable to fetch ${evt.request.url}.`);
              console.warn(err.stack);
              return new Response('Unable to fetch.');
            });
          })
  );
}
