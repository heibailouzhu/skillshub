import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Button from './Button';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';

function getStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function SunIcon() { return <span aria-hidden="true">☀</span>; }
function MoonIcon() { return <span aria-hidden="true">☾</span>; }
function SystemIcon() { return <span aria-hidden="true">◐</span>; }

export function Navbar() {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const isAuthenticated = Boolean(token);
  const storedUser = getStoredUser();
  const userName = storedUser?.username || storedUser?.email || 'User';
  const isAdmin = Boolean(storedUser?.is_admin);
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();
  const [accountOpen, setAccountOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const themeRef = useRef<HTMLDivElement | null>(null);
  const langRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (accountRef.current && !accountRef.current.contains(target)) setAccountOpen(false);
      if (themeRef.current && !themeRef.current.contains(target)) setThemeOpen(false);
      if (langRef.current && !langRef.current.contains(target)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const navClass = (active: boolean) =>
    `rounded-full px-4 py-2.5 text-sm font-medium transition ${
      active ? 'border border-[var(--line)] bg-[var(--panel)] text-[var(--text)]' : 'text-[var(--text-soft)] hover:bg-[var(--panel)] hover:text-[var(--text)]'
    }`;

  const themeOptions = [
    { key: 'light', label: t.theme.light, icon: <SunIcon /> },
    { key: 'dark', label: t.theme.dark, icon: <MoonIcon /> },
    { key: 'system', label: t.theme.system, icon: <SystemIcon /> },
  ] as const;

  const currentThemeOption = themeOptions.find((option) => option.key === theme) || themeOptions[2];
  const currentLocaleLabel = locale === 'zh-CN' ? '中' : 'EN';
  const compactTriggerClass = 'flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--panel)] text-sm text-[var(--text)] shadow-sm transition hover:bg-[var(--panel-strong)]';

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] backdrop-blur-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--panel-strong) 84%, transparent 16%)' }}>
      <div className="container-wide flex min-h-[78px] items-center justify-between gap-5 py-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-black ring-1 shadow-sm" style={{ backgroundColor: 'var(--brand-soft)', color: 'var(--brand)', borderColor: 'var(--line)' }}>S</div>
            <div>
              <div className="text-sm font-semibold tracking-[0.24em] uppercase text-[var(--text-muted)]">UI Pro</div>
              <div className="text-lg font-semibold text-[var(--text)]">SkillShub</div>
            </div>
          </Link>
          <span className="status-dot hidden md:inline-block" />
          <span className="hidden text-sm md:inline theme-text-muted">{t.navbar.subtitle}</span>
        </div>

        <nav className="hidden items-center gap-3 xl:flex">
          <Link to="/" className={navClass(location.pathname === '/')}>{t.common.home}</Link>
          <Link to="/skills" className={navClass(location.pathname.startsWith('/skills'))}>{t.common.marketplace}</Link>
          {isAuthenticated && <Link to="/favorites" className={navClass(location.pathname === '/favorites')}>{t.common.favorites}</Link>}
          {isAuthenticated && <Link to="/skills/create" className={navClass(location.pathname === '/skills/create')}>{t.common.publish}</Link>}
        </nav>

        <div className="flex items-center gap-3 lg:gap-4">
          <div className="relative" ref={themeRef}>
            <button type="button" onClick={() => { setThemeOpen((v) => !v); setLangOpen(false); setAccountOpen(false); }} className={compactTriggerClass} title={currentThemeOption.label}>
              <span className="text-base">{currentThemeOption.icon}</span>
            </button>
            {themeOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-3xl border border-[var(--line)] bg-[var(--panel-strong)] p-2 shadow-[var(--shadow)]">
                {themeOptions.map((option) => (
                  <button key={option.key} type="button" onClick={() => { setTheme(option.key); setThemeOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition ${theme === option.key ? 'bg-[var(--brand-soft)] text-[var(--brand)]' : 'text-[var(--text)] hover:bg-[var(--bg-soft)]'}`}>
                    <span className="text-base">{option.icon}</span>
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative" ref={langRef}>
            <button type="button" onClick={() => { setLangOpen((v) => !v); setThemeOpen(false); setAccountOpen(false); }} className={compactTriggerClass} title={t.navbar.language}>
              <span className="text-sm font-semibold">{currentLocaleLabel}</span>
            </button>
            {langOpen && (
              <div className="absolute right-0 mt-2 w-40 rounded-3xl border border-[var(--line)] bg-[var(--panel-strong)] p-2 shadow-[var(--shadow)]">
                <button type="button" onClick={() => { setLocale('zh-CN'); setLangOpen(false); }} className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${locale === 'zh-CN' ? 'bg-[var(--brand-soft)] text-[var(--brand)]' : 'text-[var(--text)] hover:bg-[var(--bg-soft)]'}`}>
                  <span>中文</span>
                  <span>中</span>
                </button>
                <button type="button" onClick={() => { setLocale('en-US'); setLangOpen(false); }} className={`mt-1 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${locale === 'en-US' ? 'bg-[var(--brand-soft)] text-[var(--brand)]' : 'text-[var(--text)] hover:bg-[var(--bg-soft)]'}`}>
                  <span>English</span>
                  <span>EN</span>
                </button>
              </div>
            )}
          </div>

          {isAuthenticated ? (
            <div className="relative" ref={accountRef}>
              <button type="button" onClick={() => { setAccountOpen((v) => !v); setThemeOpen(false); setLangOpen(false); }} className="flex min-w-[160px] items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-left transition hover:bg-[var(--panel-strong)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-soft)] text-sm font-semibold text-[var(--brand)]">{String(userName).slice(0, 1).toUpperCase()}</div>
                  <div>
                    <div className="text-sm font-medium text-[var(--text)]">{userName}</div>
                    <div className="text-xs theme-text-muted">{isAdmin ? t.navbar.adminAccount : t.navbar.personalAccount}</div>
                  </div>
                </div>
                <span className="text-xs theme-text-muted">▾</span>
              </button>

              {accountOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-3xl border border-[var(--line)] bg-[var(--panel-strong)] p-3 shadow-[var(--shadow)]">
                  <div className="rounded-2xl bg-[var(--panel)] px-4 py-3">
                    <div className="text-sm font-semibold text-[var(--text)]">{userName}</div>
                    <div className="mt-1 text-xs theme-text-muted">{isAdmin ? t.navbar.adminHint : t.navbar.personalHint}</div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <Link to="/profile" onClick={() => setAccountOpen(false)} className="block rounded-2xl px-4 py-3 text-sm text-[var(--text)] transition hover:bg-[var(--bg-soft)]">{t.common.profile}</Link>
                    {isAdmin && <Link to="/admin" onClick={() => setAccountOpen(false)} className="block rounded-2xl px-4 py-3 text-sm text-[var(--text)] transition hover:bg-[var(--bg-soft)]">{t.common.admin}</Link>}
                  </div>
                  <div className="my-3 border-t border-[var(--line)]" />
                  <button type="button" onClick={handleLogout} className="block w-full rounded-2xl px-4 py-3 text-left text-sm text-[var(--danger)] transition hover:bg-[var(--bg-soft)]">{t.common.logout}</button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login"><Button variant="ghost" size="sm">{t.common.login}</Button></Link>
              <Link to="/register"><Button size="sm">{t.common.register}</Button></Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
