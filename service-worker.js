"use strict";

// ========================================
// ØYGARDEN MARINE - SERVICE WORKER
// ========================================

const CACHE_NAME = "oygarden-marine-v2";

// Filer som lagres lokalt
const APP_FILES = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./manifest.json",
    "./image/marine-waves.jpeg",
    "./image/marine-icon.svg",
    "./image/marine-icon-192.png",
    "./image/marine-icon-512.png",
    "./image/apple-touch-icon.png"
];

// Installerer Service Worker
self.addEventListener("install", (event) => {

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(APP_FILES);
        })
    );
});

// Aktiverer Service Worker
self.addEventListener("activate", (event) => {

    event.waitUntil(
        caches.keys().then((cacheNames) => {

            return Promise.all(
                cacheNames
                    .filter((cacheName) =>
                        cacheName.startsWith("oygarden-marine-") &&
                        cacheName !== CACHE_NAME
                    )
                    .map((cacheName) =>
                        caches.delete(cacheName)
                    )
            );
        })
    );
});

// Henter ressurser fra nettverk eller cache
self.addEventListener("fetch", (event) => {

    // Eksterne API-data hentes direkte fra nettverket
    if (
        event.request.method !== "GET" ||
        new URL(event.request.url).origin !== self.location.origin
    ) {
        return;
    }

    // Henter lokale ressurser
    event.respondWith(
        fetch(event.request).catch(async () => {
            const cache = await caches.open(CACHE_NAME);
            return await cache.match(event.request) || Response.error();
        })
    );
});