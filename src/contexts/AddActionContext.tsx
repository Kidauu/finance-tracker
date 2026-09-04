import { createContext, useCallback, useState, type ReactNode } from 'react'

type Handler = (() => void) | null

interface AddActionContextValue {
  handler: Handler
  /** pages call this on mount to own the nav's centre "+" button */
  setHandler: (fn: Handler) => void
}

export const AddActionContext = createContext<AddActionContextValue | undefined>(undefined)

/**
 * The design moves "add transaction" into the centre of the bottom nav, so the
 * button lives in the Layout while the form lives in whichever page is open.
 * Pages register their handler here rather than each rendering their own FAB.
 */
export function AddActionProvider({ children }: { children: ReactNode }) {
  const [handler, setHandlerState] = useState<Handler>(null)

  const setHandler = useCallback((fn: Handler) => {
    // store the function itself, not a state updater
    setHandlerState(() => fn)
  }, [])

  return (
    <AddActionContext.Provider value={{ handler, setHandler }}>
      {children}
    </AddActionContext.Provider>
  )
}
