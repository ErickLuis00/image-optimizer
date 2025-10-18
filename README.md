# image-optimizer

Next.js-like Image component with automatic optimization using Sharp. React and Hono friendly (currently)

## Features

- ✅ Automatic image optimization with Sharp
- ✅ Server-side caching
- ✅ External URLs and local images support
- ✅ Lazy loading by default
- ✅ Smooth loading transitions
- ✅ Error handling with fallback UI
- ✅ TypeScript support
- ✅ SSR compatible
- ✅ Zero dependencies (except Sharp)

## Installation

```bash
npm install image-optimizer
# or
pnpm add image-optimizer
# or
yarn add image-optimizer
```

> **Important:** This package has two entry points:
> - `image-optimizer` - Client-safe Image component (use in React components)
> - `image-optimizer/server` - Server-only middleware (use in Node.js server setup using HONO)

## Usage

### 1. Setup Middleware (Server-side only)

```typescript
import { Hono } from 'hono'
import { createImageMiddleware } from 'image-optimizer/server'

const app = new Hono()

// Basic usage with defaults
const imageMiddleware = createImageMiddleware()
imageMiddleware(app)

// Or with custom configuration
const imageMiddleware = createImageMiddleware({
  path: '/image',                    // Custom endpoint path (default: '/image')
  cacheControl: 'public, max-age=31536000',  // Custom cache header
  headers: {                       // Additional headers
    'X-Custom-Header': 'value'
  },
})
imageMiddleware(app)
```

### 2. Use Image Component (Client-side safe)

```tsx
import { Image } from 'image-optimizer'

export function MyPage() {
  return (
    <div>
      {/* External URL */}
      <Image 
        src="https://example.com/photo.jpg" 
        alt="Photo" 
        width={800} 
        height={600} 
      />

      {/* Local path */}
      <Image 
        src="/images/local.jpg"
        alt="Local" 
        width={400} 
        height={300} 
      />

      {/* With custom format and quality */}
      <Image 
        src="https://example.com/photo.jpg" 
        alt="Photo" 
        width={1200} 
        format="avif" 
        quality={90}
        className="w-full"
      />

      {/* Priority loading (hero images) */}
      <Image 
        src="https://example.com/hero.jpg" 
        alt="Hero" 
        width={1920} 
        height={600} 
        priority
        quality={95}
      />

      {/* With callbacks */}
      <Image 
        src="https://example.com/photo.jpg" 
        alt="Photo" 
        width={600} 
        height={400}
        onLoad={() => console.log('Loaded!')}
        onError={() => console.error('Error!')}
      />
    </div>
  )
}
```

## API

### Image Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | *required* | Image URL or local path |
| `alt` | `string` | *required* | Alt text for accessibility |
| `width` | `number` | `undefined` | Target width in pixels |
| `height` | `number` | `undefined` | Target height in pixels |
| `quality` | `number` | `80` | Image quality (1-100) |
| `format` | `'webp' \| 'jpeg' \| 'png' \| 'avif' \| 'gif'` | `'webp'` | Output format |
| `loading` | `'lazy' \| 'eager'` | `'lazy'` | Loading behavior |
| `priority` | `boolean` | `false` | Load with high priority |
| `className` | `string` | `undefined` | Additional CSS classes |
| `onLoad` | `() => void` | `undefined` | Callback when loaded |
| `onError` | `() => void` | `undefined` | Callback on error |

### Middleware Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `path` | `string` | `'/image'` | Endpoint path for image optimization |
| `cacheControl` | `string` | `'public, max-age=31536000, immutable'` | Cache-Control header |
| `headers` | `Record<string, string>` | `{}` | Additional custom headers |


## Examples

### Custom Middleware Path

```typescript
const imageMiddleware = createImageMiddleware({
  path: '/api/optimize-image'
})
imageMiddleware(app)
```

### Custom Cache Headers

```typescript
const imageMiddleware = createImageMiddleware({
  cacheControl: 'public, max-age=86400, s-maxage=31536000',
  headers: {
    'X-Image-Processor': 'vike-sharp-image',
    'X-CDN': 'cloudflare'
  }
})
imageMiddleware(app)
```


## License

MIT

