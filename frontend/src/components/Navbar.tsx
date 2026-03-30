import { Link, useLocation } from 'react-router-dom';
import Button from './Button';

export function Navbar() {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const isAuthenticated = !!token;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link
              to="/"
              className="text-2xl font-bold text-indigo-600 hover:text-indigo-800"
            >
              SkillShub
            </Link>
            <div className="hidden md:flex space-x-4">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === '/'
                    ? 'text-indigo-600 bg-indigo-50'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                首页
              </Link>
              <Link
                to="/skills"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname.startsWith('/skills')
                    ? 'text-indigo-600 bg-indigo-50'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                技能列表
              </Link>
              {isAuthenticated && (
                <>
                  <Link
                    to="/favorites"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname === '/favorites'
                        ? 'text-indigo-600 bg-indigo-50'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    我的收藏
                  </Link>
                  <Link
                    to="/skills/create"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  >
                    发布技能
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-gray-600">
                  {localStorage.getItem('user') || '用户'}
                </span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  登出
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    登录
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    注册
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
