/**
 * Exoplanet Result Type
 * Represents the data structure returned by the backend API
 * and displayed in the ResultsPage visualization
 */
export interface ExoplanetResult {
  // Row identifier (for bulk uploads)
  row?: number

  // Classification label from ML model
  label: 'CONFIRMED' | 'CANDIDATE' | 'FALSE POSITIVE'

  // Kepler Object of Interest (KOI) Parameters
  koi_period: number      // Orbital period in days
  koi_depth: number       // Transit depth in parts per million (ppm)
  koi_duration: number    // Transit duration in hours
  koi_prad: number        // Planet radius in Earth radii
  koi_teq: number         // Equilibrium temperature in Kelvin
  koi_insol: number       // Insolation flux
  koi_steff: number       // Stellar effective temperature in Kelvin
  koi_slogg: number       // Stellar surface gravity (log g)
  koi_srad: number        // Stellar radius in Solar radii
  koi_model_snr: number   // Model signal-to-noise ratio
  koi_impact: number      // Impact parameter

  // Frontend-generated metadata
  name?: string           // Planet name (generated if not provided)
  discoveryDate?: string  // Timestamp of prediction
}

/**
 * Preprocessing Statistics
 * Metadata about CSV preprocessing (normalization, cleaning, transformations)
 */
export interface PreprocessingStats {
  original_rows: number      // Original CSV row count
  processed_rows: number     // Rows that passed all validation
  removed_rows: number       // Rows removed during preprocessing
  warnings: string[]         // Non-fatal issues (e.g., duplicates removed)
  errors: Array<{            // Fatal issues per row
    row: number
    message: string
  }>
}

/**
 * API Response with Preprocessing
 * Enhanced response from /api/preprocess-and-predict endpoint
 */
export interface PreprocessAndPredictResponse {
  entries: ExoplanetResult[]         // Predictions with processed feature values
  errors: Array<{                    // Prediction errors per row
    row: number
    message: string
  }>
  preprocessing: PreprocessingStats  // Preprocessing metadata
}

/**
 * Results State
 * Represents the loading/success/error states for the results
 */
export type ResultsState =
  | { status: 'loading' }
  | { status: 'success'; data: ExoplanetResult[] }
  | { status: 'error'; message: string }
