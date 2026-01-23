import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    // SECURITY: Remove technology stack traces
    esbuild: {
        drop: ['console', 'debugger'],
    },
    build: {
        // SECURITY: Disable source maps
        sourcemap: false,
        // SECURITY: Minify and clean
        minify: 'esbuild',
        chunkSizeWarningLimit: 2000,
        rollupOptions: {
            output: {
                // SECURITY: Obfuscate filenames (removes "index", "vendor", etc.)
                entryFileNames: 'a/[hash].js',
                chunkFileNames: 'a/[hash].js',
                assetFileNames: 'a/[hash].[ext]',
                manualChunks: {
                    // Minimized chunk names
                    c: ['react', 'react-dom', 'react-router-dom'],
                    u: ['@radix-ui/react-slot', 'lucide-react', 'clsx', 'tailwind-merge']
                }
            }
        }
    }
})
