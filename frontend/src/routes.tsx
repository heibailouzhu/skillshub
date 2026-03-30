import { createBrowserRouter } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SkillListPage from './pages/SkillListPage';
import SkillDetailPage from './pages/SkillDetailPage';
import SkillCreatePage from './pages/SkillCreatePage';
import SkillEditPage from './pages/SkillEditPage';
import SkillVersionPage from './pages/SkillVersionPage';
import FavoritesPage from './pages/FavoritesPage';
import UserProfilePage from './pages/UserProfilePage';
import ProtectedRoute from './components/ProtectedRoute';

const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/skills',
    element: <SkillListPage />,
  },
  {
    path: '/skills/:id',
    element: <SkillDetailPage />,
  },
  {
    path: '/skills/create',
    element: (
      <ProtectedRoute>
        <SkillCreatePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/skills/:id/edit',
    element: (
      <ProtectedRoute>
        <SkillEditPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/skills/:id/versions',
    element: (
      <ProtectedRoute>
        <SkillVersionPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/favorites',
    element: (
      <ProtectedRoute>
        <FavoritesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <UserProfilePage />
      </ProtectedRoute>
    ),
  },
]);

export default router;
