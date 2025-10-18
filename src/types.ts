import type { CSSProperties, ImgHTMLAttributes } from 'react'
import type { Hono } from 'hono'

export type ImageFormat = 'webp' | 'jpeg' | 'jpg' | 'png' | 'avif' | 'gif'

export interface ImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height'> {
  src: string
  alt: string
  width?: number
  height?: number
  quality?: number
  format?: ImageFormat
  className?: string
  style?: CSSProperties
  loading?: 'lazy' | 'eager'
  priority?: boolean
  onLoad?: () => void
  onError?: () => void
}

export interface ImageMiddlewareConfig {
  /**
   * Path where the image optimization endpoint will be mounted
   * @default "/image"
   * @example "/img", "/img/process", "/api/image"
   */
  path?: string

  /**
   * Cache-Control header for optimized images
   * @default "public, max-age=31536000, immutable"
   */
  cacheControl?: string

  /**
   * Additional custom headers to include in responses
   * @example { "X-Custom-Header": "value" }
   */
  headers?: Record<string, string>

  /**
   * Cache directory for optimized images
   * @default path.join(process.cwd(), '.cache/sharp')
   */
  cacheDir?: string
}

export interface ImageMiddleware {
  (app: Hono): void
}

