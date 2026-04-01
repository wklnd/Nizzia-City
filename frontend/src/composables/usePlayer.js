import { usePlayerStore } from '../stores/player'

/**
 * Returns { store, ensurePlayer, reloadPlayer }.
 * Call `await ensurePlayer()` in `onMounted` when a page depends on player state.
 */
export function usePlayer() {
  const store = usePlayerStore()

  /** Make sure the player store is hydrated. Safe to call repeatedly. */
  async function ensurePlayer() {
    // Hydrate quickly from cache for instant UI, then revalidate from API.
    if (!store.player?.user) {
      try {
        const cached = JSON.parse(localStorage.getItem('nc_player') || 'null')
        if (cached?.user) store.setPlayer(cached)
      } catch { /* ignore */ }
    }

    // Always fetch latest server state to avoid showing stale vitals after reload.
    return await store.loadByUser()
  }

  /**
   * Reload player from API (e.g. after an action that changes stats).
   * Returns the fresh player object.
   */
  async function reloadPlayer() {
    return await store.loadByUser()
  }

  return { store, ensurePlayer, reloadPlayer }
}
