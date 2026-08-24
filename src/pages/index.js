// src/pages/index.js
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Head from 'next/head'

export default function Home() {
  const [features] = useState([
    { icon: '🤖', title: 'AI Integration', desc: 'Connect AI with your measurements' },
    { icon: '📊', title: 'API Access', desc: 'Free API for all clients' },
    { icon: '💳', title: 'PayPal Payment', desc: 'Secure payment processing' },
    { icon: '🔗', title: 'Wallet System', desc: 'Manage your digital wallet' }
  ])

  return (
    <>
      <Head>
        <title>huzni's Family - Social Platform</title>
        <meta name="description" content="Connect AI with your measurements" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        {/* Navigation */}
        <nav className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <span className="text-2xl font-bold text-blue-600">huzni's Family</span>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/login" className="text-gray-700 hover:text-blue-600">Login</Link>
                <Link href="/register" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  Sign Up Free
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Welcome to <span className="text-blue-600">huzni's Family</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Connect AI with your measurements. Free API for all clients.
              Build and deploy your own applications using our services.
            </p>
            <Link href="/register" className="bg-blue-600 text-white text-xl px-8 py-4 rounded-lg hover:bg-blue-700 inline-block">
              Get Started Free
            </Link>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-white py-8 mt-16">
          <div className="max-w-7xl mx-auto px-4 text-center text-gray-600">
            <p>All Rights Reserved © 2024</p>
            <p className="text-sm">Powered by huzni's Family Service Team</p>
          </div>
        </footer>
      </div>
    </>
  )
}
