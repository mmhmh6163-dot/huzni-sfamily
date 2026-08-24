// src/pages/login.js
import { useState } from 'react'
import { signInWithEmail, signInWithGoogle, signInWithGithub } from '../lib/auth'
import { useRouter } from 'next/router'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    const { error } = await signInWithEmail(email, password)
    if (error) {
      setError(error)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full">
        <h2 className="text-3xl font-bold text-center mb-8">Welcome Back</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin}>
          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 border rounded-lg mb-4 focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 border rounded-lg mb-4 focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 mb-4"
          >
            Login
          </button>
        </form>

        <div className="relative my-4">
          <hr />
          <span className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-gray-500">
            OR
          </span>
        </div>

        <button
          onClick={signInWithGoogle}
          className="w-full bg-red-500 text-white p-3 rounded-lg hover:bg-red-600 mb-3"
        >
          Continue with Google
        </button>

        <button
          onClick={signInWithGithub}
          className="w-full bg-gray-800 text-white p-3 rounded-lg hover:bg-gray-900"
        >
          Continue with GitHub
        </button>

        <p className="text-center mt-4">
          Don't have an account? <a href="/register" className="text-blue-600 hover:underline">Sign Up</a>
        </p>
      </div>
    </div>
  )
}
