import express from 'express'
import multer from 'multer'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import os from 'node:os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PYTHON_SCRIPT = path.join(__dirname, 'predict.py')

const app = express()
const PORT = Number(process.env.PORT) || 8000

app.use(express.json({ limit: '1mb' }))

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true)
    } else {
      cb(new Error('Only CSV files are supported.'))
    }
  },
})

function log(message, extra = {}) {
  const base = { timestamp: new Date().toISOString(), message }
  console.log(JSON.stringify({ ...base, ...extra }))
}

function runPython(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', [PYTHON_SCRIPT, ...args])

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout)
      } else {
        const errorOutput = stdout || stderr || `Python exited with code ${code}`
        reject(new Error(errorOutput))
      }
    })

    proc.on('error', (err) => {
      reject(err)
    })
  })
}

app.post('/api/single-predict', async (req, res) => {
  log('single-predict start', { payloadKeys: Object.keys(req.body || {}) })

  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'Request body is required.' })
    }

    const pythonOutput = await runPython(['--mode', 'single', '--data', JSON.stringify(req.body)])
    const result = JSON.parse(pythonOutput)

    if (result.error) {
      log('single-predict error', { error: result.error })
      return res.status(400).json({ error: result.error })
    }

    log('single-predict success', { label: result.label })
    return res.json(result)
  } catch (error) {
    log('single-predict failure', { error: error.message })
    return res.status(500).json({ error: 'Failed to process the request.' })
  }
})

app.post('/api/bulk-upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'CSV file is required under field name "file".' })
  }

  const { path: tempPath, originalname, size } = req.file
  log('bulk-upload start (legacy endpoint)', { originalname, size })

  try {
    const pythonOutput = await runPython(['--mode', 'bulk', '--csv', tempPath])
    const result = JSON.parse(pythonOutput)

    if (result.error) {
      log('bulk-upload error', { error: result.error })
      return res.status(400).json({ error: result.error })
    }

    log('bulk-upload success', { entries: result.entries?.length ?? 0, errors: result.errors?.length ?? 0 })
    return res.json(result)
  } catch (error) {
    log('bulk-upload failure', { error: error.message })
    return res.status(500).json({ error: 'Failed to process the CSV file.' })
  } finally {
    if (tempPath) {
      try {
        await fs.unlink(tempPath)
      } catch (cleanupError) {
        log('bulk-upload cleanup error', { error: cleanupError.message })
      }
    }
  }
})

/**
 * Primary bulk upload endpoint with automatic CSV preprocessing.
 *
 * Accepts raw Kepler CSVs in any format and automatically:
 * - Normalizes column names (case-insensitive)
 * - Removes data leakage features
 * - Validates physical ranges
 * - Imputes missing values
 * - Applies log10 transformations
 * - Removes outliers
 *
 * Flow: Raw CSV → preprocess.py → Processed CSV → predict.py → Response
 *
 * Returns predictions + processed feature values + preprocessing statistics.
 */
app.post('/api/preprocess-and-predict', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'CSV file is required under field name "file".' })
  }

  const { path: tempPath, originalname, size } = req.file
  log('preprocess-and-predict start', { originalname, size })

  const processedCsvPath = path.join(os.tmpdir(), `processed_${Date.now()}.csv`)

  try {
    // Step 1: Preprocess raw CSV (normalization, validation, transforms)
    const preprocessScript = path.join(__dirname, 'preprocess.py')
    const preprocessArgs = [
      preprocessScript,
      '--input', tempPath,
      '--output', processedCsvPath
    ]

    // Run preprocess.py directly (not through PYTHON_SCRIPT wrapper)
    const preprocessOutput = await new Promise((resolve, reject) => {
      const proc = spawn('python3', preprocessArgs)

      let stdout = ''
      let stderr = ''

      proc.stdout.on('data', (chunk) => {
        stdout += chunk.toString()
      })

      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString()
      })

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout)
        } else {
          const errorOutput = stdout || stderr || `Preprocessing exited with code ${code}`
          reject(new Error(errorOutput))
        }
      })

      proc.on('error', (err) => {
        reject(err)
      })
    })

    const preprocessResult = JSON.parse(preprocessOutput)

    if (!preprocessResult.success) {
      log('preprocess-and-predict preprocessing failed', {
        errors: preprocessResult.errors?.length ?? 0
      })
      return res.status(400).json({
        error: 'CSV preprocessing failed',
        preprocessing_errors: preprocessResult.errors,
        warnings: preprocessResult.warnings
      })
    }

    log('preprocess-and-predict preprocessing success', {
      original_rows: preprocessResult.original_rows,
      processed_rows: preprocessResult.processed_rows,
      removed_rows: preprocessResult.removed_rows
    })

    // Step 2: Run predictions on processed CSV
    const pythonOutput = await runPython(['--mode', 'bulk', '--csv', processedCsvPath])
    const predictionResult = JSON.parse(pythonOutput)

    if (predictionResult.error) {
      log('preprocess-and-predict prediction error', { error: predictionResult.error })
      return res.status(400).json({ error: predictionResult.error })
    }

    // Step 3: Combine preprocessing stats with predictions
    const combinedResult = {
      entries: predictionResult.entries,
      errors: predictionResult.errors,
      preprocessing: {
        original_rows: preprocessResult.original_rows,
        processed_rows: preprocessResult.processed_rows,
        removed_rows: preprocessResult.removed_rows,
        warnings: preprocessResult.warnings || [],
        errors: preprocessResult.errors || []
      }
    }

    log('preprocess-and-predict success', {
      entries: combinedResult.entries?.length ?? 0,
      preprocessing_errors: preprocessResult.errors?.length ?? 0,
      prediction_errors: predictionResult.errors?.length ?? 0
    })

    return res.json(combinedResult)
  } catch (error) {
    log('preprocess-and-predict failure', { error: error.message })
    return res.status(500).json({ error: 'Failed to process the CSV file.' })
  } finally {
    // Clean up both temporary files
    for (const filePath of [tempPath, processedCsvPath]) {
      if (filePath) {
        try {
          await fs.unlink(filePath)
        } catch (cleanupError) {
          log('preprocess-and-predict cleanup error', { error: cleanupError.message, file: filePath })
        }
      }
    }
  }
})

app.use((err, _req, res, _next) => {
  log('unhandled error', { error: err.message })
  if (err.message.includes('Only CSV files')) {
    return res.status(400).json({ error: err.message })
  }
  return res.status(500).json({ error: 'Unexpected server error.' })
})

app.listen(PORT, () => {
  log('backend ready', { port: PORT })
})
