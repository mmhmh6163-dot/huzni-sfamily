// src/pages/_app.js
import '../styles/global.css'
import { AuthProvider } from '../context/AuthContext'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

function MyApp({ Component, pageProps }) {
  const router = useRouter()

  useEffect(() => {
    // Handle basePath for GitHub Pages
    if (typeof window !== 'undefined') {
      const basePath = process.env.NODE_ENV === 'production' ? '/huzni-sfamily' : ''
      if (basePath && window.location.pathname.startsWith(basePath) && router.pathname === '/') {
        // Remove basePath from URL if needed
      }
    }
  }, [router])

  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  )
}

export default MyApp
