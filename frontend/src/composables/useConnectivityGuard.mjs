const RETRY_FLAG_KEY = 'nc_server_reload_attempt'
const CONNECTIVITY_EVENT = 'nc-connectivity-state'

let routingToOffline = false

function emitConnectivityState(showReloadPopup) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(CONNECTIVITY_EVENT, { detail: { showReloadPopup } }))
}

function hasReloadAttemptFlag() {
  if (typeof sessionStorage === 'undefined') return false
  return sessionStorage.getItem(RETRY_FLAG_KEY) === '1'
}

function setReloadAttemptFlag() {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(RETRY_FLAG_KEY, '1')
}

export function clearReloadAttemptFlag() {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem(RETRY_FLAG_KEY)
}

export function handleApiRequestFailure() {
  if (typeof window === 'undefined') return
  if (window.location.pathname === '/offline') return
  emitConnectivityState(true)
}

export function handleServerConnectionFailure(options = {}) {
  const { forceOffline = false } = options

  if (typeof window === 'undefined') return
  if (window.location.pathname === '/offline') return

  if (forceOffline) {
    clearReloadAttemptFlag()
    emitConnectivityState(false)

    if (!routingToOffline) {
      routingToOffline = true
      window.location.assign('/offline')
    }
    return
  }

  if (hasReloadAttemptFlag()) {
    clearReloadAttemptFlag()
    emitConnectivityState(false)

    if (!routingToOffline) {
      routingToOffline = true
      window.location.assign('/offline')
    }
    return
  }

  emitConnectivityState(true)
}

export function handleServerConnectionRecovered() {
  emitConnectivityState(false)
  clearReloadAttemptFlag()
}

export function reloadToRecoverConnection() {
  setReloadAttemptFlag()
  window.location.reload()
}

export function listenToConnectivityState(onChange) {
  if (typeof window === 'undefined' || typeof onChange !== 'function') return () => {}

  const handler = (event) => {
    const next = !!event?.detail?.showReloadPopup
    onChange(next)
  }

  window.addEventListener(CONNECTIVITY_EVENT, handler)
  return () => window.removeEventListener(CONNECTIVITY_EVENT, handler)
}
