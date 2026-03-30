import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth';
import { Navbar, Footer } from '../components';
import { Input } from '../components';
import type { RegisterRequest } from '../api/auth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<RegisterRequest>({
    username: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 表单验证
    if (formData.username.length < 3 || formData.username.length > 50) {
      setError('用户名长度必须在 3-50 个字符之间');
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('请输入有效的邮箱地址');
      return;
    }

    if (formData.password.length < 6) {
      setError('密码长度不能少于 6 个字符');
      return;
    }

    setLoading(true);

    try {
      const response = await register(formData);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify({
        id: response.user_id,
        username: formData.username,
        email: formData.email,
      }));
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || '注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              注册
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              已有账户？{' '}
              <Link
                to="/login"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                登录
              </Link>
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            <Input
              name="username"
              label="用户名"
              type="text"
              required
              value={formData.username}
              onChange={handleChange}
              placeholder="用户名"
            />
            <Input
              name="email"
              label="邮箱"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="邮箱"
            />
            <Input
              name="password"
              label="密码"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="密码"
            />

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '注册中...' : '注册'}
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}
