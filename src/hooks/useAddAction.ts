import { useContext, useEffect } from 'react'
import { AddActionContext } from '../contexts/AddActionContext'

export function useAddActionContext() {
  const ctx = useContext(AddActionContext)
  if (!ctx) throw new Error('useAddActionContext must be used within AddActionProvider')
  return ctx
}

/** Registers this page's handler for the nav's centre "+" button. */
export function useRegisterAddAction(handler: () => void) {
  const { setHandler } = useAddActionContext()

  useEffect(() => {
    setHandler(handler)
    return () => setHandler(null)
  }, [handler, setHandler])
}
