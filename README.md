# AURELIA — Interactive 3D Planetary Landing Page

A self-contained, Russian-language 3D landing page built with HTML, CSS, JavaScript and a local Three.js build.

## Run locally

Open `index.html` in a modern browser (Chrome, Edge, Firefox or Safari). No build step, npm install, server, or CDN is required.

## Publish with GitHub Pages

1. Create a new repository on GitHub.
2. Upload **the contents of this folder** to the repository root: `index.html`, `style.css`, `app.js`, and `three.local.js`.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select branch `main` and folder `/ (root)`, then press **Save**.
6. Wait for the deployment to finish; GitHub will show the public URL in Settings → Pages.

Important: `index.html` must be in the repository root, not nested inside another folder. Keep all four files together because the HTML references the CSS and JavaScript by relative paths.

## Features

- Interactive procedural rocky planet, rings and moons
- Scroll-driven camera and scene changes
- Planet ring and core-section controls
- Responsive layout for desktop and mobile
- Local Three.js file; no external CDN dependency
- Reduced-motion preference support

## Performance notes

The scene includes WebGL rendering, so performance depends on the device GPU and browser. Test on desktop and mobile after publishing. Avoid claiming a guaranteed FPS across devices; use the built-in quality controls/profile behavior where available.

## Project files

- `index.html` — page structure and controls
- `style.css` — visual design and responsive styles
- `app.js` — Three.js scene, camera, interactions and scroll behavior
- `three.local.js` — local Three.js build

## License

Project-specific HTML/CSS/JS are provided as this project. `three.local.js` contains the Three.js library; retain its embedded license notice and comply with the Three.js MIT license when redistributing it.
