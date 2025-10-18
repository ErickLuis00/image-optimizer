import type { Hono } from 'hono'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'
import crypto from 'crypto'
import { execSync } from 'child_process'
import type { ImageMiddlewareConfig } from './types'

function generateCacheKey(
  source: string,
  width?: number,
  height?: number,
  quality?: number,
  format?: string
): string {
  const hash = crypto.createHash('md5').update(source).digest('hex')
  return `${hash}-${width || 'auto'}x${height || 'auto'}-q${quality || 80}.${format || 'webp'}`
}

function isUrl(source: string): boolean {
  return source.startsWith('http://') || source.startsWith('https://')
}

async function fetchExternalImage(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText} ${response.status}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

// Works with any framework.
// DO NOT WORK IN EDGE RUNTIME AS REQUIRES SHELL COMMANDS AND FS.
function detectImagesLocalDir(srcPath: string): string | null {
  try {
    const shellCommand = `
      input="${srcPath}"
      dir="$PWD"
      while [[ "$dir" != "/" ]]; do
        result=$(find "$dir" -path "*$(dirname "$input")*" -name "$(basename "$input")" 2>/dev/null)
        [[ -n "$result" ]] && echo "$result" && break
        dir=$(dirname "$dir")
      done
    `

    const result = execSync(shellCommand, {
      shell: '/bin/bash',
      encoding: 'utf-8',
      timeout: 5000
    }).trim()

    if (!result) {
      return null
    }

    // Extract the parent directory of /assets from the found path
    // Example: /path/to/dist/client/assets/static/file.png + src=/assets/static/file.png
    // Result: /path/to/dist/client
    const normalizedSrc = srcPath.startsWith('/') ? srcPath : `/${srcPath}`
    const srcIndex = result.indexOf(normalizedSrc)

    if (srcIndex !== -1) {
      return result.substring(0, srcIndex)
    }

    return null
  } catch (error) {
    console.error('Failed to detect images local directory:', error)
    return null
  }
}

function resolveLocalImagePath(
  relativePath: string,
  imagesLocalDir: string
): string | null {
  // Simply join imagesLocalDir with the src path
  const normalizedPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`
  const fullPath = path.join(imagesLocalDir, normalizedPath)
  const resolvedPath = path.resolve(fullPath)

  // Security check: ensure resolved path starts with imagesLocalDir
  if (!resolvedPath.startsWith(path.resolve(imagesLocalDir))) {
    return null
  }

  return resolvedPath
}

export function createImageMiddleware(config: ImageMiddlewareConfig = {}) {
  const {
    path: routePath = '/image',
    cacheControl = 'public, max-age=31536000, immutable',
    headers = {},
    cacheDir = path.join(process.cwd(), '.cache/sharp'),
  } = config

  let imagesLocalDir: string | undefined
  let imagesLocalDirDetected = false

  // Remove existing cache and create fresh
  if (fs.existsSync(cacheDir)) {
    fs.rmSync(cacheDir, { recursive: true, force: true })
  }
  fs.mkdirSync(cacheDir, { recursive: true })

  return (app: Hono) => {
    app.get(routePath, async (c) => {
      try {
        // Remove any existing query parameters from src only for local URLs
        const rawSrc = c.req.query('src')
        const src = rawSrc ? (isUrl(rawSrc) ? rawSrc : rawSrc.split('?')[0]) : undefined
        const width = Number(c.req.query('width')) || undefined
        const height = Number(c.req.query('height')) || undefined
        const quality = Number(c.req.query('quality')) || 80
        const format = (c.req.query('format') as keyof sharp.FormatEnum) || 'webp'

        if (!src) {
          return c.text('Missing src parameter', 400)
        }

        const cacheFileName = generateCacheKey(src, width, height, quality, format)
        const cacheFilePath = path.join(cacheDir, cacheFileName)

        if (fs.existsSync(cacheFilePath)) {
          const cachedImage = fs.readFileSync(cacheFilePath)
          const responseHeaders: Record<string, string> = {
            'Content-Type': `image/${format}`,
            'Cache-Control': cacheControl,
            ...headers,
          }
          return c.body(cachedImage, 200, responseHeaders)
        }

        let imageBuffer: Buffer

        if (isUrl(src)) {
          imageBuffer = await fetchExternalImage(src)
        } else {
          // Auto-detect imagesLocalDir on first request
          if (!imagesLocalDirDetected) {
            const detected = detectImagesLocalDir(src)
            if (detected) {
              imagesLocalDir = detected
              imagesLocalDirDetected = true
              console.log(`Images local directory auto-detected: ${imagesLocalDir}`)
            } else {
              console.warn(`Failed to auto-detect images local directory for: ${src}`)
              imagesLocalDirDetected = true // Don't try again
            }
          }

          if (!imagesLocalDir) {
            return c.text('Failed to detect images directory. Image not found.', 404)
          }

          const resolvedPath = resolveLocalImagePath(src, imagesLocalDir)

          if (!resolvedPath) {
            return c.text('Invalid image path (security: path traversal blocked)', 403)
          }

          if (!fs.existsSync(resolvedPath)) {
            return c.text('Image file not found', 404)
          }

          imageBuffer = fs.readFileSync(resolvedPath)
        }

        let image = sharp(imageBuffer)

        if (width || height) {
          // Get image metadata to determine aspect ratio
          const metadata = await image.metadata()
          const originalWidth = metadata.width || 0
          const originalHeight = metadata.height || 0

          let resizeWidth = width
          let resizeHeight = height

          // If both dimensions are provided, calculate which dimension to use
          // based on aspect ratio to prevent images from becoming too small
          if (width && height && originalWidth && originalHeight) {
            const originalAspectRatio = originalWidth / originalHeight
            const targetAspectRatio = width / height

            // If original is more portrait (taller) than target
            if (originalAspectRatio < targetAspectRatio) {
              // Use width as constraint, let height be auto
              resizeHeight = undefined
            } else {
              // Use height as constraint, let width be auto
              resizeWidth = undefined
            }
          }

          image = image.resize(resizeWidth, resizeHeight, {
            fit: 'inside',
            withoutEnlargement: true,
          })
        }

        image = image.toFormat(format, { quality })

        await image.toFile(cacheFilePath)

        const processedImage = fs.readFileSync(cacheFilePath)

        const responseHeaders: Record<string, string> = {
          'Content-Type': `image/${format}`,
          'Cache-Control': cacheControl,
          ...headers,
        }

        return c.body(processedImage, 200, responseHeaders)
      } catch (err) {
        console.error('Image optimization error:', err)
        return c.text('Internal Server Error', 500)
      }
    })
  }
}

