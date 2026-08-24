// src/components/Wallet.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Wallet() {
  const { user } = useAuth()
  const [balance, setBalance] = useState(0)
  const [showPayPal, setShowPayPal] = useState(false)

  // Fetch wallet balance
  useEffect(() => {
    const fetchWallet = async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user?.id)
        .single()
      
      if (!error && data) setBalance(data.balance)
    }
    fetchWallet()
  }, [user])

  // PayPal payment handler
  const handlePayPalPayment = () => {
    setShowPayPal(true)
    // PayPal integration would go here
    // This would create a PayPal order and redirect
    window.location.href = '/payment/create'
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold">💰 Wallet Balance</h3>
          <p className="text-3xl font-bold text-blue-600">${balance.toFixed(2)}</p>
        </div>
        <button
          onClick={handlePayPalPayment}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Add Funds
        </button>
      </div>

      {showPayPal && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600">
            🔄 Redirecting to PayPal...
          </p>
          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              PayPal payment will create a page ending with .html
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
