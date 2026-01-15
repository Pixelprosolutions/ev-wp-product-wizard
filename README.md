# Voltbuild Product Wizard

React-based product wizard for recommending EV chargers.

## Requirements
- Node.js 18+
- npm

## Setup
```
npm install
npm run dev
```

## Build
```
npm run build
```

## Lead Capture + Recommendations
- Lead data is posted to `/wp-json/voltbuild/v1/leads` before recommendations are fetched.
- Recommendations are fetched from `/wp-json/voltbuild/v1/recommendations`.
- The app expects a WordPress backend with the Voltbuild wizard plugin enabled.

