import PostCard from '../components/PostCard'
import { usePagedPosts } from '../lib/usePagedPosts'
import '../components/post.css'
import './profile.css'

export default function SavedPage() {
  const posts = usePagedPosts('/posts/saved')
  return (
    <>
      <h1 className="page-title">Saved</h1>
      {posts.items.map((p) => <PostCard key={p.id} post={p} onRemoved={posts.remove} />)}
      {posts.error && <p className="profile-empty" role="alert">{posts.error}</p>}
      {posts.loading && !posts.items.length && <p className="profile-empty" role="status">Loading...</p>}
      {!posts.loading && !posts.error && !posts.items.length && (
        <p className="profile-empty">Nothing saved yet. Tap the bookmark on a post to keep it here.</p>
      )}
      {posts.hasMore && posts.items.length > 0 && (
        <button className="btn-outline feed-more" onClick={posts.loadMore} disabled={posts.loading}>Show more</button>
      )}
    </>
  )
}
