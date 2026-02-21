# Issue: App ships as a single ~1MB JS bundle

## Summary
`npm run build` showed the main JavaScript bundle was ~981kB minified, which slows initial page load on mobile networks and lower-end devices.

## Impact
- Slower first contentful paint and interaction readiness.
- Higher data usage for users.
- Poor scalability as more features are added.

## Root cause
`App.tsx` eagerly imported all route pages and shared UI modules, so Vite emitted one large entry chunk.

## Resolution in this PR
- Added route-level lazy loading with `React.lazy` and `Suspense` for all pages and dashboard components.
- Added a lightweight loading fallback while split chunks load.

## Validation
After the fix, `npm run build` emits multiple chunks and the main application entry (`index-*.js`) drops from ~981kB to ~70kB, with code split across route chunks.
