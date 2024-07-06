'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import CustomAuth from './CustomAuth'

export default function AuthWrapper({ children }) {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleAuthChange = (user) => {
    setSession({ user })
  }

  if (!session) {
    return <CustomAuth onAuthChange={handleAuthChange} />
  }

  return <>{children}</>
}