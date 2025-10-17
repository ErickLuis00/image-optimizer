# Integration Example

## 1. Install the package

```bash
npm install image-optimizer
```

## 2. Setup your server

```typescript
// server/entry.ts
import { Hono } from 'hono'
import { createImageMiddleware } from 'image-optimizer/server'

const app = new Hono()

// Setup image middleware with custom configuration
const imageMiddleware = createImageMiddleware({
  path: '/img',                              // Custom path (default: '/image')
  cacheControl: 'public, max-age=31536000',  // 1 year cache
  headers: {
    'X-Image-Service': 'vike-sharp-image',
    'X-Powered-By': 'Sharp'
  },
  projectRoot: process.cwd(),
  assetsDir: './assets',
  cacheDir: './.cache/sharp'
})

imageMiddleware(app)

// ... rest of your server setup
```

## 3. Use in your components

```tsx
// pages/index/+Page.tsx
import { Image } from 'image-optimizer'
import localPhoto from '../../assets/photo.jpg'

export default function Page() {
  return (
    <div>
      <h1>My Page</h1>
      
      {/* External image */}
      <Image 
        src="https://images.unsplash.com/photo-123" 
        alt="Photo" 
        width={800} 
        height={600} 
      />

      {/* Local image */}
      <Image 
        src={localPhoto} 
        alt="Local" 
        width={400} 
        height={300} 
      />

      {/* Hero image with priority */}
      <Image 
        src="https://example.com/hero.jpg" 
        alt="Hero" 
        width={1920} 
        height={600} 
        priority
        format="avif"
        quality={95}
        className="w-full"
      />
    </div>
  )
}
```

## Configuration Options

### Different endpoint paths:

```typescript
// Option 1: Default
createImageMiddleware() // Endpoint: /image

// Option 2: Custom path
createImageMiddleware({ path: '/img' }) // Endpoint: /img

// Option 3: Nested path
createImageMiddleware({ path: '/api/optimize' }) // Endpoint: /api/optimize
```

### Custom cache headers:

```typescript
createImageMiddleware({
  cacheControl: 'public, max-age=86400, s-maxage=31536000',
  headers: {
    'X-CDN': 'cloudflare',
    'X-Cache-Region': 'us-east-1'
  }
})
```

### Custom directories:

```typescript
createImageMiddleware({
  projectRoot: '/app',
  assetsDir: '/app/public/images',
  cacheDir: '/tmp/image-cache'
})
```

## Publishing to npm

```bash
cd image-optimizer
pnpm install
pnpm build
npm publish
```

## Important Notes

- **Server Import:** Always use `image-optimizer/server` for middleware (contains Sharp - Node.js only)
- **Client Import:** Always use `image-optimizer` for the Image component (browser-safe)
- The package uses React as a peer dependency, so it will use your project's React version

