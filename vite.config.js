// // import { defineConfig } from 'vite'

// // export default defineConfig({
// //   build: {
// //     outDir: 'dist',
// //     emptyOutDir: true
// //   }
// // })

// import { defineConfig } from 'vite'
// import fs from 'fs'
// import path from 'path'

// export default defineConfig({
//   plugins: [
//     {
//       name: 'custom-router',
//       configureServer(server) {
//         server.middlewares.use((req, res, next) => {

//           // Only allow /interview/*
//           if (req.url!.startsWith('/interview/')) {
//             const filePath = path.resolve('index.html')
//             const html = fs.readFileSync(filePath, 'utf-8')

//             res.setHeader('Content-Type', 'text/html')
//             res.statusCode = 200
//             res.end(html)
//             return
//           }

//           // Everything else → 404
//           res.statusCode = 404
//           res.setHeader('Content-Type', 'text/plain')
//           res.end('404 Not Found')
//         })
//       }
//     }
//   ]
// })


// import { defineConfig } from 'vite'
// import fs from 'fs'
// import path from 'path'

// export default defineConfig({
//   server: {
//     proxy: {
//       '/interview': {
//         target: 'http://127.0.0.1:8000',
//         changeOrigin: true,
//         rewrite: (path) => path, // keep the path as-is
//       }
//     }
//   },
//   plugins: [
//     {
//       name: 'custom-router',
//       configureServer(server) {
//         server.middlewares.use((req, res, next) => {
//           const url = req.url || ''

//           // ✅ Allow Vite dev server internal requests
//           if (
//             url.startsWith('/@vite/') ||      // Vite HMR & modules
//             url.startsWith('/src/') ||        // src files
//             url.startsWith('/node_modules/') || 
//             url.startsWith('/public/') || 
//             url.includes('.')                  // any file with extension
//           ) {
//             return next()
//           }

//           // ✅ Serve interview.html only for /interview/*
//           if (url.startsWith('/interview/')) {
//             const filePath = path.resolve('index.html')
//             const html = fs.readFileSync(filePath, 'utf-8')

//             res.statusCode = 200
//             res.setHeader('Content-Type', 'text/html')
//             res.end(html)
//             return
//           }

//           // ❌ Everything else → 404
//           res.statusCode = 404
//           res.setHeader('Content-Type', 'text/plain')
//           res.end('404 Not Found')
//         })
//       }
//     }
//   ]
// })


// import { defineConfig } from 'vite';
// import fs from 'fs';
// import path from 'path';

// export default defineConfig({
//   plugins: [
//     {
//       name: 'spa-interview-fallback',
//       configureServer(server) {
//         server.middlewares.use((req, res, next) => {
//           const url = req.url!;
          
//           // if it's a valid file that exists, let Vite handle it
//           const filePath = path.join(server.config.root, url);
//           if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
//             return next();
//           }

//           // if it's a request for /interview/*
//           if (url.startsWith('/interview/')) {
//             const indexHtml = fs.readFileSync(
//               path.join(server.config.root, 'index.html'), 'utf-8'
//             );
//             res.statusCode = 200;
//             res.setHeader('Content-Type', 'text/html');
//             res.end(indexHtml);
//             return;
//           }

//           return next(); // otherwise let Vite handle others
//         });
//       }
//     }
//   ]
// });


import { defineConfig } from 'vite'
import fs from 'fs'
import path from 'path'
import {resolve} from 'path'

export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      input: {
        main: './index.html', // Pastikan path ini benar dari root project
        // main: resolve(__dirname, 'index.html'), // Pastikan ini mengarah ke file yang benar
      },
    },
  },
  server: {
    fs: { strict: false }
  },
  plugins: [
    {
      name: 'spa-interview-fallback',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url
          const file = path.join(server.config.root, url.split('?')[0])

          if (fs.existsSync(file) && fs.statSync(file).isFile()) {
            return next()  // let Vite serve real files
          }

          if (url.startsWith('/interview/')) {
            const html = fs.readFileSync(path.join(server.config.root, 'index.html'))
            res.statusCode = 200
            res.setHeader('Content-Type', 'text/html')
            res.end(html)
            return
          }

          next()
        })
      }
    }
  ]
})