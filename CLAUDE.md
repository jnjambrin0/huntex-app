# HuntEX - Exoplanet Detection Web Application

## Overview

HuntEX is a React-based single-page application (SPA) for exoplanet detection and analysis. It provides a visually engaging landing page with two primary analysis modes: bulk CSV upload and single-entry manual input. The app communicates with a FastAPI backend for machine learning predictions.

## Common Commands

```bash
# Development
npm run dev          # Start Vite dev server (default: http://localhost:5173)

# Production
npm run build        # TypeScript compilation + Vite build
npm run preview      # Preview production build locally

# Code Quality
npm run lint         # Run ESLint on the codebase

# Backend (if included)
npm run server       # Start Express server (server/index.js)
```

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS v4 with @tailwindcss/vite plugin
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Backend Integration**: FastAPI (Python) on port 8000

## Architecture Overview

### Component Structure

```
src/
├── App.tsx                          # Main landing page + hyperspace orchestration
├── components/
│   ├── AnimatedBackground.tsx       # Canvas-based particle animation (background stars)
│   ├── HyperspaceAnimation.tsx      # Canvas-based hyperspace warp effect (4s transition)
│   ├── UploadModal.tsx              # Modal container with view routing
│   ├── BulkUploadForm.tsx           # CSV upload interface (optimistic UI)
│   ├── SingleEntryForm.tsx          # Manual data entry form (optimistic UI)
│   └── ResultsPage.tsx              # Post-hyperspace destination page
├── index.css                        # Tailwind imports + Google Fonts
└── main.tsx                         # React entry point
```

### Key Architectural Patterns

#### 1. Modal Navigation System

The app uses a **three-view state machine** in `UploadModal.tsx`:

- `'selection'`: Initial view showing Bulk Upload vs Single Entry options
- `'bulk'`: CSV file upload interface
- `'single'`: Manual form for 11 exoplanet parameters

View transitions are handled with Framer Motion's `AnimatePresence` for smooth enter/exit animations.

```typescript
type ViewType = 'selection' | 'bulk' | 'single'
const [currentView, setCurrentView] = useState<ViewType>('selection')
```

#### 2. Hyperspace Navigation Flow (CRITICAL)

**Complete User Journey:**
```
Landing Page → Upload Modal → Form Submit → HYPERSPACE (4s) → Results Page
```

**State Management** (App.tsx):
- `isHyperspaceActive`: Controls 4-second warp animation
- `showResultsPage`: Renders ResultsPage after hyperspace completes
- Logo remains fixed (z-index 40) during hyperspace transition
- Title/subtitle fade out before hyperspace begins

**Hyperspace Animation** (HyperspaceAnimation.tsx):
- 250 stars with 3D perspective projection: `sx = (star.x / star.z) * width + centerX`
- 3-phase acceleration: ramp-up (1s) → max speed (2s) → deceleration (1s)
- Canvas-based with `easeInOutCubic` timing function
- Motion blur via `ctx.fillStyle = 'rgba(0,0,0,0.2)'` overlay
- Trail/streak effect using `ctx.createLinearGradient()` from previous to current position
- Star size/opacity proportional to distance: closer = bigger/brighter
- Triggers `onComplete()` callback after exactly 4000ms

#### 3. Optimistic UI Pattern (CRITICAL)

**Both forms implement immediate transitions** - no result display, no delays:

```typescript
// BulkUploadForm.tsx & SingleEntryForm.tsx
const handleSubmit = async () => {
  onConfirm()  // ← IMMEDIATE hyperspace trigger

  // Backend call continues in background (results logged, not displayed)
  fetch(API_ENDPOINT, ...).then(...)
}
```

**Why this matters:**
- Zero perceived latency - hyperspace starts instantly on submit
- Results/errors never shown to user (only console.log for debugging)
- Creates seamless, cinematic transition experience

#### 4. API Integration Pattern

Both forms use environment variables for flexible backend configuration:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
```

**Bulk Upload Endpoint**: `POST /api/bulk-upload`
- Sends: `FormData` with CSV file
- Expects: `{ entries: [{row: number, label: string}], errors: [{row: number, message: string}] }`
- **Note**: Results logged to console, not displayed to user

**Single Prediction Endpoint**: `POST /api/single-predict`
- Sends: JSON with 11 exoplanet parameters (koi_period, koi_depth, etc.)
- Expects: `{ label: string }` where label is one of:
  - `CONFIRMED` - Green with CheckCircle icon
  - `CANDIDATE` - Yellow with AlertCircle icon
  - `FALSE POSITIVE` - Red with XCircle icon
- **Note**: Result logged to console, not displayed to user

#### 5. Animation Patterns

**Canvas Particle System** (`AnimatedBackground.tsx`):
- 150 particles rendered on HTML5 canvas
- Smooth movement with wrap-around boundaries
- Responsive to window resizing

**Framer Motion Usage**:
- Spring animations for modal entry/exit
- Staggered delays for sequential element reveals
- Hover/tap scale transformations on interactive elements
- `whileHover`, `whileTap`, and `initial/animate/exit` variants throughout

**CRITICAL - Framer Motion Animation Bug**:
- **Problem**: Cards in UploadModal had visible flicker/jump when appearing
- **Root Cause**: Conflicting animations between parent container and child elements
- **Solution**: Remove `motion.div` wrapper from parent, use static `<div>` instead
- **Rule**: When animating multiple children with delays, DON'T animate the parent container

```tsx
// ❌ BAD - causes flicker
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
  <motion.button initial={{ opacity: 0, x: -20 }} transition={{ delay: 0.3 }} />
</motion.div>

// ✅ GOOD - smooth animation
<div>  {/* Static parent */}
  <motion.button initial={{ opacity: 0, x: -20 }} transition={{ delay: 0.15 }} />
</div>
```

#### 6. Form Validation & Error Handling

**Bulk Upload**:
- Client-side file type validation (CSV only)
- File size limit: 100MB
- Displays per-row errors and successful predictions separately

**Single Entry**:
- All 11 fields required (HTML5 validation)
- Visual feedback based on prediction label
- Dedicated error state display

### Typography & Styling

- **Primary Font**: Bebas Neue (imported from Google Fonts)
- **Title**: Uppercase, wide letter-spacing (0.2em)
- **Color Scheme**: Slate grays with blue/purple accent colors
- **Glass Morphism**: Backdrop blur effects on modal overlay

### Important Configuration Details

**Path Aliases** (vite.config.ts + tsconfig.json):
```typescript
"@/*": ["./src/*"]
```

**CSS Import Order** (CRITICAL):
Google Fonts MUST be imported BEFORE Tailwind to avoid PostCSS errors:
```css
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
@import "tailwindcss";
```

**Tailwind v4 Setup**:
Uses the new `@tailwindcss/vite` plugin instead of PostCSS configuration.

**Z-Index Stacking Order** (CRITICAL for hyperspace):
```
z-0:  AnimatedBackground (background stars)
z-10: Title/subtitle text (fades out before hyperspace)
z-30: HyperspaceAnimation canvas (warp effect)
z-40: Logo (remains visible during hyperspace)
z-50: UploadModal (above everything)
```
This order ensures logo stays visible during hyperspace while other elements fade.

### Environment Variables

Create `.env` file for custom backend URL:
```
VITE_API_BASE_URL=http://your-backend-url:8000
```

Defaults to `http://localhost:8000` if not set.

## Development Notes

### Known Issues & Solutions

1. **PostCSS @import order error**: Ensure Google Fonts import comes before Tailwind import in `index.css`

2. **Framer Motion vs motion/react**: This project uses `framer-motion` package. Avoid installing the separate `motion` package as it causes React hooks conflicts.

3. **Vite dependency optimization**: If you see "504 Outdated Optimize Dep" errors, kill and restart the dev server to rebuild dependencies.

### Testing with Playwright MCP

The app was built using iterative Playwright validation. Key validation points:
- Landing page renders logo, title, subtitle, and button correctly
- Modal opens/closes smoothly without animation flickers
- Both forms submit and trigger hyperspace immediately (optimistic UI)
- Hyperspace animation runs for exactly 4 seconds
- Results page appears after hyperspace completes

## Backend Requirements

The FastAPI backend must expose:
- `POST /api/bulk-upload` - Accepts CSV file, returns predictions + errors
- `POST /api/single-predict` - Accepts JSON parameters, returns label classification

Backend should handle:
- CSV parsing and validation
- Machine learning model inference
- Error handling for invalid/missing data
- CORS configuration for frontend origin
