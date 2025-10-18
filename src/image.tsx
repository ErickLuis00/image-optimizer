import { useState, useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import type { ImageProps, ImageFormat } from './types'

function buildImageUrl(
    src: string,
    width?: number,
    height?: number,
    quality?: number,
    format?: ImageFormat,
    basePath: string = '/image'
): string {
    const params = new URLSearchParams()

    // Remove any existing query parameters from src only for local URLs
    const isHttpUrl = src.startsWith('http://') || src.startsWith('https://')
    const cleanSrc = isHttpUrl ? src : src.split('?')[0]
    params.append('src', cleanSrc)

    if (width) params.append('width', width.toString())
    if (height) params.append('height', height.toString())
    if (quality) params.append('quality', quality.toString())
    if (format) params.append('format', format)

    return `${basePath}?${params.toString()}`
}

export function Image({
    src,
    alt,
    width,
    height,
    quality = 80,
    format = 'webp',
    className,
    style,
    loading = 'lazy',
    priority = false,
    onLoad,
    onError,
    ...props
}: ImageProps) {
    const [isLoaded, setIsLoaded] = useState(false)
    const [hasError, setHasError] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    const imgRef = useRef<HTMLImageElement>(null)

    const isHttpUrl = src.startsWith('http://') || src.startsWith('https://')
    const isLocalPath = !src.includes(':') // No protocol means it's a local path
    const shouldOptimize = isHttpUrl || isLocalPath
    const optimizedSrc = shouldOptimize ? buildImageUrl(src, width, height, quality, format) : src

    useEffect(() => {
        setIsMounted(true)

        const img = imgRef.current
        if (!img) return

        if (img.complete && img.naturalHeight !== 0) {
            setIsLoaded(true)
        }
    }, [])

    const handleLoad = () => {
        setIsLoaded(true)
        onLoad?.()
    }

    const handleError = () => {
        setHasError(true)
        onError?.()
    }

    const imageStyle: CSSProperties = {
        ...style,
        ...(isMounted && {
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
        }),
    }

    if (hasError) {
        return (
            <div
                className={className}
                style={{
                    width: width ? `${width}px` : '100%',
                    height: height ? `${height}px` : 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f3f4f6',
                    ...style,
                }}
            >
                <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Failed to load image</span>
            </div>
        )
    }

    return (
        <img
            {...props}
            ref={imgRef}
            src={optimizedSrc}
            alt={alt}
            width={width}
            height={height}
            loading={priority ? 'eager' : loading}
            onLoad={handleLoad}
            onError={handleError}
            className={className}
            style={imageStyle}
        />
    )
}

