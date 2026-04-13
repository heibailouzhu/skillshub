import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api/auth';
import { Footer, Input, Navbar } from '../components';
import Button from '../components/Button';
import { useI18n } from '../i18n';
import type { RegisterRequest } from '../api/auth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [formData, setFormData] = useState<RegisterRequest>({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.username.length < 3 || formData.username.length > 50) {
      setError(t.messages.invalidUsername);
      return;
    }
    if (!validateEmail(formData.email)) {
      setError(t.messages.invalidEmail);
      return;
    }
    if (formData.password.length < 6) {
      setError(t.messages.invalidPassword);
      return;
    }

    setLoading(true);
    try {
      const response = await register(formData);
      localStorage.setItem('token', response.token);
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: response.user_id,
          username: response.username || formData.username,
          email: formData.email,
          is_admin: response.is_admin ?? false,
        }),
      );
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || t.messages.registerFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col theme-text">
      <Navbar />
      <main className="container-wide flex flex-1 items-center justify-center py-16 lg:py-20">
        <div className="glass-panel-strong w-full max-w-lg rounded-[2rem] p-8 lg:p-10">
          <div className="mb-8">
            <div className="text-sm uppercase tracking-[0.24em] theme-text-muted">{t.auth.createAccount}</div>
            <h1 className="mt-3 text-3xl font-black theme-text">{t.auth.registerTitle}</h1>
            <p className="mt-3 text-sm leading-6 theme-text-soft">{t.auth.registerHint}</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
            <Input name="username" label={t.auth.username} type="text" required value={formData.username} onChange={handleChange} placeholder={t.auth.username} fullWidth />
            <Input name="email" label={t.auth.email} type="email" required value={formData.email} onChange={handleChange} placeholder={t.auth.email} fullWidth />
            <Input name="password" label={t.auth.password} type="password" required value={formData.password} onChange={handleChange} placeholder={t.auth.password} fullWidth />
            <Button type="submit" loading={loading} fullWidth className="w-full justify-center">{t.common.register}</Button>
          </form>

          <p className="mt-6 text-sm theme-text-soft">
            {t.auth.alreadyHaveAccount}{' '}
            <Link to="/login" className="text-[var(--brand)] hover:opacity-80">{t.common.login}</Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
