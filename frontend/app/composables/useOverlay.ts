export function useOverlay() {
  const active = useState('overlay', () => false)

  async function withOverlay<T>(fn: () => Promise<T>): Promise<T> {
    active.value = true
    try {
      return await fn()
    } finally {
      active.value = false
    }
  }

  return { active: readonly(active), withOverlay }
}
