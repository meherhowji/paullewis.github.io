self.oninstall = evt => {
  console.log("oninstall - aerotwist-3.0.4");

  evt.waitUntil(
    caches.open("aerotwist-3.0.4")
          .then((cache) => {
            return cache.addAll([
              "/css/aerotwist.css"
            ]);
          })
  );

  self.skipWaiting();
};

self.onactivate = evt => {
  evt.waitUntil(
    caches.keys()
          .then((cacheNames) => {
            const deleteOldCaches = cacheNames.map((cacheName) => {
              // Old cache - please remove.
              if (cacheName !== "aerotwist-3.0.4") {
                return caches.delete(cacheName);
              }

              // This is the current cache, leave alone.
              return Promise.resolve();
            });
            return Promise.all(deleteOldCaches);
          })
  );

  self.clients.claim();
};

self.onfetch = evt => {
  evt.waitUntil(
    caches.match(evt.request)
      .then((response) => {
        // Match found: return.
        if (response) {
          console.log("match found for ", evt.request.url);
          return response;
        }

        // Match not found: go to network.
        return fetch(evt.request)
      })
  );
};
