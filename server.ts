import { appendFile } from 'node:fs/promises'

const server = Bun.serve({
  routes: {
    // Static routes
    '/webhook': async (req: Request) => {
      const body = await req.text()
      const logEntry = `[${new Date().toISOString()}] ${req.method} ${req.url}\nHeaders: ${JSON.stringify(
        Object.fromEntries(req.headers),
      )}\nBody: ${body}\n\n`
      await appendFile('webhook.log', logEntry)
      return new Response('OK', { status: 200 })
    },

    // Wildcard route for all routes that start with "/api/" and aren't otherwise matched
    '/*': (req: Request) => new Response(JSON.stringify({ message: 'Not found' }), { status: 404 }),
  },

  // fallback for unmatched routes:
  fetch(req) {
    return new Response('Not Found', { status: 404 })
  },

  port: 8080,
})

console.log(`Server running at ${server.url}`)
