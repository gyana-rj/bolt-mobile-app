import { FileSystemTree } from '@webcontainer/api';

export const starterFiles: FileSystemTree = {
  'package.json': {
    file: {
      contents: `
        {
          "name": "vite-starter",
          "private": true,
          "version": "0.0.0",
          "type": "module",
          "scripts": {
            "dev": "vite",
            "build": "vite build",
            "preview": "vite preview"
          },
          "dependencies": {
            "react": "^18.2.0",
            "react-dom": "^18.2.0"
          },
          "devDependencies": {
            "@vitejs/plugin-react": "^4.0.3",
            "vite": "^4.4.5"
          }
        }
      `,
    },
  },
  'index.html': {
    file: {
      contents: `
        <!DOCTYPE html>
        <html lang="en">
          <body>
            <div id="root"></div>
            <script type="module" src="/src/main.jsx"></script>
          </body>
        </html>
      `,
    },
  },
  'src': {
    directory: {
      'main.jsx': {
        file: {
          contents: `
            import React from 'react'
            import ReactDOM from 'react-dom/client'
            
            ReactDOM.createRoot(document.getElementById('root')).render(
              <React.StrictMode>
                <h1>Hello from WebContainers!</h1>
              </React.StrictMode>
            )
          `,
        },
      },
    },
  },
};