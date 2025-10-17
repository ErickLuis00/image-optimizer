import type { Hono } from 'hono'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'
import crypto from 'crypto'
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
    throw new Error(`Failed to fetch image: ${response.statusText}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

function resolveLocalImagePath(
  relativePath: string,
  projectRoot: string,
  assetsDir: string
): string | null {
  const normalizedPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath

  if (normalizedPath.startsWith('assets/')) {
    const fullPath = path.join(projectRoot, normalizedPath)
    const resolvedPath = path.resolve(fullPath)

    const projectAssetsDir = path.resolve(projectRoot, 'assets')
    if (!resolvedPath.startsWith(projectAssetsDir)) {
      return null
    }

    return resolvedPath
  }

  const fullPath = path.join(assetsDir, normalizedPath)
  const resolvedPath = path.resolve(fullPath)

  if (!resolvedPath.startsWith(path.resolve(assetsDir))) {
    return null
  }

  return resolvedPath
}

export function createImageMiddleware(config: ImageMiddlewareConfig = {}) {
  const {
    path: routePath = '/image',
    cacheControl = 'public, max-age=31536000, immutable',
    headers = {},
    projectRoot = process.cwd(),
    assetsDir = path.join(process.cwd(), 'assets'),
    cacheDir = path.join(process.cwd(), '.cache/sharp'),
  } = config

  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true })
  }

  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true })
  }

  return (app: Hono) => {
    app.get(routePath, async (c) => {
      try {
        const src = c.req.query('src')
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
          const resolvedPath = resolveLocalImagePath(src, projectRoot, assetsDir)

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
          image = image.resize(width, height, {
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

