import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { Readable } from 'node:stream'
import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * Dev-only CORS bypass proxy (Vite plugin).
 *
 * Endpoint: http://localhost:<port>/spaces-api/<region>
 * forcePathStyle=true → SDK üretir: /spaces-api/<region>/<bucket>/<key>?<query>
 *
 * Middleware req.url'yi /spaces-api altında alır:
 *   /<region>/<bucket>/<key>?<query>
 * Ve iletir:
 *   https://<region>.digitaloceanspaces.com/<bucket>/<key>?<query>
 *
 * Production'da DigitalOcean Spaces CORS kuralı zorunludur:
 *   Panel > Spaces > <bucket> > Settings > CORS:
 *   Origin: * | Methods: GET PUT POST DELETE HEAD | Headers: * | MaxAge: 3600
 */
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,PUT,POST,DELETE,HEAD,OPTIONS',
  'access-control-allow-headers': '*',
  'access-control-expose-headers': 'ETag,Content-Length',
  'access-control-max-age': '3600',
}

async function readRequestBody(req: IncomingMessage): Promise<Buffer | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return undefined
  }

  const chunks: Buffer[] = []

  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }

  return Buffer.concat(chunks)
}

function spacesProxyPlugin(): Plugin {
  return {
    name: 'spaces-proxy',
    configureServer(server) {
      /**
       * URL format (relative to mount /spaces-proxy): /<hostname><path>?<query>
       * e.g. /sgp1.digitaloceanspaces.com/lunatic2/key?list-type=2
       *
       * The fetch intercept in spaces.ts already placed the full hostname here.
       * Authorization is signed for that hostname, so we MUST NOT alter any
       * auth-related headers — forward them verbatim.
       */
      server.middlewares.use('/spaces-proxy', async (req: IncomingMessage, res: ServerResponse) => {
        const url = req.url ?? '/'

        if (req.method === 'OPTIONS') {
          res.writeHead(204, CORS_HEADERS)
          res.end()
          return
        }

        // Strip leading slash to get: <hostname><rest>
        // e.g. sgp1.digitaloceanspaces.com/lunatic2/key?query
        const slashIndex = url.indexOf('/', 1)
        const hostname = slashIndex === -1 ? url.slice(1) : url.slice(1, slashIndex)
        const rest = slashIndex === -1 ? '/' : url.slice(slashIndex)

        if (!hostname.endsWith('.digitaloceanspaces.com')) {
          res.statusCode = 400
          res.end('spaces-proxy: hostname must be *.digitaloceanspaces.com')
          return
        }

        const forwardHeaders = new Headers()
        for (const [key, value] of Object.entries(req.headers)) {
          const lk = key.toLowerCase()
          // Drop hop-by-hop and browser-origin headers, keep auth headers untouched.
          if (lk === 'host' || lk === 'origin' || lk === 'referer' || lk === 'connection') continue
          if (Array.isArray(value)) {
            for (const item of value) {
              forwardHeaders.append(key, item)
            }
          } else if (typeof value === 'string') {
            forwardHeaders.set(key, value)
          }
        }
        forwardHeaders.set('host', hostname)

        try {
          const body = await readRequestBody(req)
          const targetUrl = `https://${hostname}${rest}`

          const upstream = await fetch(targetUrl, {
            method: req.method,
            headers: forwardHeaders,
            body,
          })

          // Headers that must NOT be forwarded to the browser:
          // - strict-transport-security: would mark localhost as HSTS,
          //   forcing future http://localhost requests to https → ALPN fail
          // - content-encoding/content-length: fetch() already decoded the body
          // - hop-by-hop headers
          const STRIP_RESPONSE_HEADERS = new Set([
            'strict-transport-security',
            'content-encoding',
            'content-length',
            'transfer-encoding',
            'connection',
            'keep-alive',
            'upgrade',
            'proxy-authenticate',
            'proxy-authorization',
            'te',
            'trailers',
          ])

          const responseHeaders: Record<string, string> = { ...CORS_HEADERS }
          upstream.headers.forEach((value, key) => {
            if (STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) return
            responseHeaders[key] = value
          })

          res.writeHead(upstream.status, responseHeaders)

          if (upstream.body) {
            Readable.fromWeb(upstream.body as globalThis.ReadableStream<Uint8Array>).pipe(res)
          } else {
            res.end()
          }
        } catch (err) {
          if (!res.headersSent) {
            res.statusCode = 502
            res.end(`spaces-proxy error: ${err instanceof Error ? err.message : 'unknown error'}`)
          }
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), spacesProxyPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
