// src/pages/dashboard.js
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import Wallet from '../components/Wallet'
import PostCard from '../components/PostCard'

export default function Dashboard() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [newPost, setNewPost] = useState('')
  const [loading, setLoading] = useState(true)

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*, users(*)')
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (!error) setPosts(data)
      setLoading(false)
    }
    fetchPosts()
  }, [])

  // Create new post
  const handlePost = async () => {
    if (!newPost.trim()) return

    const { data, error } = await supabase
      .from('posts')
      .insert([{
        content: newPost,
        user_id: user?.id
      }])
      .select()

    if (!error && data) {
      setPosts([data[0], ...posts])
      setNewPost('')
    }
  }

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Dashboard Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">Welcome, {user?.display_name || user?.email}</span>
            <button onClick={() => signOut()} className="text-red-600 hover:text-red-800">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Wallet Section */}
        <Wallet />

        {/* Create Post */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <textarea
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            rows="3"
            placeholder="What's on your mind?"
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
          />
          <button
            onClick={handlePost}
            className="mt-3 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Post
          </button>
        </div>

        {/* Feed */}
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </div>
  )
}
