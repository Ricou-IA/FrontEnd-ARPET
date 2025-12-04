import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5173,
        host: true,
        // Désactiver le cache HTTP pour éviter les problèmes de cache navigateur
        headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        },
        // Améliorer le HMR pour éviter les problèmes de cache
        hmr: {
            overlay: true
        }
    },
    // Optimisations pour le développement
    optimizeDeps: {
        // Forcer la revalidation des dépendances
        force: true,
        // Ne pas mettre en cache les dépendances
        holdUntilCrawlEnd: false
    },
    // Désactiver le cache en développement
    clearScreen: false,
    // Désactiver le cache des modules en développement
    build: {
        rollupOptions: {
            output: {
                // Ajouter un hash pour forcer le rechargement
                entryFileNames: 'assets/[name].[hash].js',
                chunkFileNames: 'assets/[name].[hash].js',
                assetFileNames: 'assets/[name].[hash].[ext]'
            }
        }
    }
});
