# 🌌 HuntEX - Exoplanet Detection System

> Built for NASA Space Apps Challenge Hackathon 🚀

An interactive web application that visualizes exoplanet detection using machine learning predictions. Upload your data and watch the universe reveal its secrets through a stunning space-themed interface.

![HuntEX Landing Page](huntex-app/docs/landing-page.png)

## 🎯 What is HuntEX?

HuntEX is a web-based exoplanet detection visualization tool that combines machine learning predictions with an engaging UI/UX experience. The app simulates the detection of exoplanets in real-time, presenting them on an interactive star map where users can explore detailed planetary data.

## ✨ Features

### 🎨 Beautiful UI/UX
- **Space-themed design** with particle animations and star fields
- **Glassmorphism effects** and smooth Framer Motion animations
- **Hyperspace transition** animation between sections (4-second warp speed effect)
- **Interactive star map** with pulsating exoplanet markers

### 📊 Dual Input Modes

#### Single Entry Analysis
Manual input form with 11 exoplanet parameters organized in 4 categories:
- 🌀 **Orbital Parameters** - Period, Duration, Impact
- 🌍 **Planetary Properties** - Radius, Temperature, Insolation
- ⭐ **Stellar Characteristics** - Effective Temp, Gravity, Radius
- 📡 **Signal Metrics** - Transit Depth, Signal-to-Noise Ratio

![Single Entry Form](docs/single-entry-form.png)

#### Bulk Upload
CSV file upload for batch analysis:
- Drag & drop interface
- 100MB file size limit
- Real-time validation and error reporting

![Bulk Upload Form](docs/bulk-upload-form.png)

### 🌟 Interactive Results Page
- **Animated star field** with 300+ background stars
- **Real-time exoplanet detection** (limited to 5 for demo)
- **Multi-ring visualization** for detected exoplanets with:
  - Outer halo (6x base size)
  - Mid gradient glow (3.5x)
  - Bright white core (1.5x)
- **Smart positioning** - exoplanets only appear in safe zones (10% margin from edges)
- **Clickable exoplanets** with detailed side panel information

![Results Page](docs/results-page-final.png)

## 🛠️ Tech Stack

### Frontend
- **React 19** + **TypeScript** - Modern UI framework
- **Vite 7** - Lightning-fast build tool
- **Tailwind CSS v4** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Lucide React** - Beautiful icons
- **HTML5 Canvas** - Custom star field & animations

### Backend (Not included in this repo)
- **FastAPI** (Python) - ML model inference
- REST API endpoints for predictions

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd HuntEX-front/huntex-app

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Environment Variables

Create a `.env` file in `huntex-app/`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

If not set, defaults to `http://localhost:8000`.

## 📁 Project Structure

```
huntex-app/
├── src/
│   ├── components/
│   │   ├── AnimatedBackground.tsx    # Particle background
│   │   ├── HyperspaceAnimation.tsx   # Warp speed effect
│   │   ├── UploadModal.tsx           # Modal container
│   │   ├── SingleEntryForm.tsx       # Manual data entry
│   │   ├── BulkUploadForm.tsx        # CSV upload
│   │   └── ResultsPage.tsx           # Star map & detections
│   ├── App.tsx                       # Main app logic
│   ├── main.tsx                      # React entry point
│   └── index.css                     # Tailwind imports
├── public/
│   └── logo.png                      # HuntEX logo
├── docs/                             # Screenshots
└── package.json
```

## 🎮 How to Use

1. **Launch the app** - You'll see the HuntEX landing page with animated background
2. **Click "UPLOAD DATA"** - Modal opens with two options
3. **Choose your method**:
   - **Single Entry**: Fill in the 11 exoplanet parameters manually
   - **Bulk Upload**: Drop a CSV file with multiple entries
4. **Submit your data** - Hyperspace animation plays (4 seconds)
5. **Explore results** - Interactive star map loads with:
   - Background stars
   - Detected exoplanets (pulsating blue/purple markers)
   - Real-time counter showing detections
6. **Click on exoplanets** - View detailed planetary data in side panel

## 🎨 Design Highlights

### Color Palette
- **Background**: Slate-950 to Slate-900 gradient
- **Accents**: Blue-400, Purple-500, Violet-500
- **Text**: White with gray-300/400 for secondary content

### Typography
- **Primary Font**: Bebas Neue (Google Fonts)
- **Wide letter-spacing** (0.2em) for sci-fi aesthetic
- **Uppercase headings** for impact

### Animations
- **Framer Motion** for UI transitions
- **Canvas-based** particle systems and star fields
- **Spring physics** for modal animations
- **Easing functions** for smooth movements

## 🔬 Technical Details

### Exoplanet Detection Logic
- Detects 1 exoplanet every 4 seconds
- Maximum 5 exoplanets for demo mode
- Safe zone positioning (10% margin from screen edges)
- Consistent sizing (2.5px base) regardless of original star size
- Multi-ring gradient visualization for high visibility

### Canvas Rendering
- 300 background stars with subtle pulsing
- Responsive canvas resizing
- Optimized animation loop with `requestAnimationFrame`
- Smooth transitions with easing (0.1 smoothing factor)

### API Integration
- **POST** `/api/single-predict` - Single entry predictions
- **POST** `/api/bulk-upload` - CSV batch processing
- Optimistic UI pattern (immediate transitions, background API calls)

## 👥 Team

Built with ❤️ for the NASA Space Apps Challenge by our amazing hackathon team.

## 📝 License

This is a hackathon project built for educational purposes.

## 🙏 Acknowledgments

- **NASA** for the Space Apps Challenge
- **Kepler Space Telescope** data for exoplanet research
- **React** and **Vite** communities for excellent tools

---

**Your hunt starts here.** 🔭✨

0-Angers repository for NASA SpaceApps Challenge in Málaga Local Event.
Important files:
  -Team photo.
  -Model canvas.