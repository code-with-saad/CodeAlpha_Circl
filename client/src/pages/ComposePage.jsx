import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import Composer from '../components/Composer'
import './profile.css'

export default function ComposePage() {
  const navigate = useNavigate()
  return (
    <>
      <div className="edit-bar">
        <Link to="/" className="icon-btn" aria-label="Cancel"><ArrowLeft size={24} /></Link>
        <h1 className="edit-title">New post</h1>
      </div>
      <Composer autoFocus onDone={() => navigate('/')} />
    </>
  )
}
