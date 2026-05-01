export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  modules: ['@nuxt/ui', '@pinia/nuxt'],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:3001/api',
    },
  },

  // Nuxt UI automatically sets up TailwindCSS
  ui: {
    colorMode: false,
  },

  vite: {
    server: {
      watch: {
        usePolling: true,
        interval: 1000,
      },
      warmup: {
        clientFiles: [
          './app/layouts/default.vue',
          './app/pages/**/*.vue',
          './app/components/**/*.vue',
        ],
      },
    },
    optimizeDeps: {
      include: [
        'vue',
        'vue-router',
        'pinia',
        '@pinia/nuxt',
        'nanoid',
        // @nuxt/ui v4 runtime dependencies
        'reka-ui',
        '@iconify/vue',
        '@vueuse/core',
        '@vueuse/integrations',
        'tailwind-merge',
        'tailwind-variants',
        'motion-v',
        'fuse.js',
        'vaul-vue',
        '@tanstack/vue-table',
        'embla-carousel-vue',
        'embla-carousel-autoplay',
        'embla-carousel-fade',
      ],
    },
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },
})
