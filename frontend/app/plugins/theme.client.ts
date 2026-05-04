export default defineNuxtPlugin(() => {
  const stored = localStorage.getItem('kairos-theme')
  const isDark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.classList.toggle('dark', isDark)
})
