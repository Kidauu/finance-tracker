import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw } from 'lucide-react'

// How often to ask the browser whether a newer service worker exists. iOS
// PWAs are unreliable about checking on their own — without this, a deployed
// fix can sit unnoticed until the app happens to reload for some other
// reason, which on a home-screen app can be days.
const UPDATE_CHECK_INTERVAL_MS = 60_000

/**
 * Surfaces an explicit "versi baru" banner instead of silently swapping the
 * service worker in the background (see vite.config.ts) — so a deploy is
 * never mistaken for "the fix didn't work" when it's really just a stale
 * cache the user has no way to see or clear themselves.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      setInterval(() => {
        registration.update().catch(() => {
          // offline or a transient network hiccup — next interval retries
        })
      }, UPDATE_CHECK_INTERVAL_MS)
    },
  })

  if (!needRefresh) return null

  return (
    <div className="safe-bottom fixed inset-x-0 bottom-24 z-[80] flex justify-center px-5">
      <button
        onClick={() => updateServiceWorker(true)}
        className="flex items-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-bold text-on-ink shadow-lg"
      >
        <RefreshCw size={15} />
        Versi baru tersedia — ketuk buat perbarui
      </button>
    </div>
  )
}
