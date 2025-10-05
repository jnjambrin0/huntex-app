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
├── App.tsx                          # Main landing page with modal trigger
├── components/
│   ├── AnimatedBackground.tsx       # Canvas-based particle animation
│   ├── UploadModal.tsx             # Modal container with view routing
│   ├── BulkUploadForm.tsx          # CSV upload interface
│   └── SingleEntryForm.tsx         # Manual data entry form
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

#### 2. API Integration Pattern

Both forms use environment variables for flexible backend configuration:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
```

**Bulk Upload Endpoint**: `POST /api/bulk-upload`
- Sends: `FormData` with CSV file
- Expects: `{ entries: [{row: number, label: string}], errors: [{row: number, message: string}] }`

**Single Prediction Endpoint**: `POST /api/single-predict`
- Sends: JSON with 11 exoplanet parameters (koi_period, koi_depth, etc.)
- Expects: `{ label: string }` where label is one of:
  - `CONFIRMED` - Green with CheckCircle icon
  - `CANDIDATE` - Yellow with AlertCircle icon
  - `FALSE POSITIVE` - Red with XCircle icon

#### 3. Animation Patterns

**Canvas Particle System** (`AnimatedBackground.tsx`):
- 150 particles rendered on HTML5 canvas
- Smooth movement with wrap-around boundaries
- Responsive to window resizing

**Framer Motion Usage**:
- Spring animations for modal entry/exit
- Staggered delays for sequential element reveals
- Hover/tap scale transformations on interactive elements
- `whileHover`, `whileTap`, and `initial/animate/exit` variants throughout

#### 4. Form Validation & Error Handling

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
- Modal opens/closes smoothly with animations
- Both forms display and handle submissions properly
- Error states render appropriately

### Future Enhancement Considerations

- Add loading states during backend calls
- Implement result export functionality (CSV download)
- Add form field tooltips with parameter descriptions
- Persist upload history in localStorage
- Add dark/light theme toggle
- Implement batch result visualization (charts/graphs)

## Backend Requirements

The FastAPI backend must expose:
- `POST /api/bulk-upload` - Accepts CSV file, returns predictions + errors
- `POST /api/single-predict` - Accepts JSON parameters, returns label classification

Backend should handle:
- CSV parsing and validation
- Machine learning model inference
- Error handling for invalid/missing data
- CORS configuration for frontend origin
