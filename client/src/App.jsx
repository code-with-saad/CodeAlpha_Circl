import { Route, Routes } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import { ConfirmHost, Toaster } from './components/Feedback'
import RequireAuth from './components/layout/RequireAuth'
import AuthPage from './pages/AuthPage'
import ProfilePage, { MeRedirect } from './pages/ProfilePage'
import EditProfilePage from './pages/EditProfilePage'
import HomePage from './pages/HomePage'
import ComposePage from './pages/ComposePage'
import PostPage from './pages/PostPage'
import SavedPage from './pages/SavedPage'
import ExplorePage from './pages/ExplorePage'
import TagPage from './pages/TagPage'
import NotificationsPage from './pages/NotificationsPage'
import SettingsPage from './pages/SettingsPage'
import UsersListPage from './pages/UsersListPage'
import AdminShell from './admin/AdminShell'
import DashboardPage from './admin/DashboardPage'
import PeoplePage from './admin/PeoplePage'
import ContentPage from './admin/ContentPage'
import ReportsPage from './admin/ReportsPage'

function NotFound() {
  return (
    <>
      <h1 className="page-title">Not found</h1>
      <p className="placeholder">That page does not exist.</p>
    </>
  )
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="login" element={<AuthPage mode="login" />} />
        <Route path="register" element={<AuthPage mode="register" />} />
        <Route element={<RequireAuth />}>
          {/* Admins get their own layout, navigation and landing page */}
          <Route path="admin" element={<AdminShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="people" element={<PeoplePage />} />
            <Route path="content" element={<ContentPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>

          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="post/:id" element={<PostPage />} />
            <Route path="explore" element={<ExplorePage />} />
            <Route path="tag/:tag" element={<TagPage />} />
            <Route path="compose" element={<ComposePage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="me" element={<MeRedirect />} />
            <Route path="u/:username" element={<ProfilePage />} />
            <Route path="edit-profile" element={<EditProfilePage />} />
            <Route path="saved" element={<SavedPage />} />
            <Route path="u/:username/followers" element={<UsersListPage kind="followers" />} />
            <Route path="u/:username/following" element={<UsersListPage kind="following" />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
      <Toaster />
      <ConfirmHost />
    </>
  )
}
