import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';

type AdminSection = 'skills' | 'users';

interface AdminLayoutProps {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  children: React.ReactNode;
}

export default function AdminLayout({ activeSection, onSectionChange, children }: AdminLayoutProps) {
  const { t } = useI18n();

  const navClass = (active: boolean) =>
    `flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition ${
      active
        ? 'bg-[var(--brand-soft)] text-[var(--brand)]'
        : 'text-[var(--text-soft)] hover:bg-[var(--panel)] hover:text-[var(--text)]'
    }`;

  return (
    <div className="min-h-screen bg-[var(--bg)] theme-text">
      <div className="mx-auto flex min-h-screen w-full max-w-[1820px]">
        <aside className="hidden w-[300px] shrink-0 border-r border-[var(--line)] px-7 py-10 xl:block">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-black ring-1" style={{ backgroundColor: 'var(--brand-soft)', color: 'var(--brand)', borderColor: 'var(--line)' }}>
              S
            </div>
            <div>
              <div className="text-sm font-semibold tracking-[0.24em] uppercase text-[var(--text-muted)]">Admin</div>
              <div className="text-lg font-semibold text-[var(--text)]">SkillShub Console</div>
            </div>
          </Link>

          <div className="mt-10 space-y-2">
            <button type="button" onClick={() => onSectionChange('skills')} className={navClass(activeSection === 'skills')}>{t.admin.skills}</button>
            <button type="button" onClick={() => onSectionChange('users')} className={navClass(activeSection === 'users')}>{t.admin.users}</button>
          </div>

          <div className="mt-10 rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <div className="text-sm font-semibold theme-text">{t.admin.title}</div>
            <p className="mt-3 text-sm leading-6 theme-text-soft">{t.navbar.adminHint}</p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="border-b border-[var(--line)] px-6 py-6 lg:px-10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm uppercase tracking-[0.24em] theme-text-muted">Console</div>
                <h1 className="mt-2 text-3xl font-black theme-text">{t.admin.title}</h1>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Link to="/skills" className="rounded-full border border-[var(--line)] px-4 py-2 theme-text-soft transition hover:bg-[var(--panel)] hover:text-[var(--text)]">{t.admin.backToSite}</Link>
                <Link to="/profile" className="rounded-full border border-[var(--line)] px-4 py-2 theme-text-soft transition hover:bg-[var(--panel)] hover:text-[var(--text)]">{t.common.profile}</Link>
              </div>
            </div>
            <div className="mt-5 flex gap-3 xl:hidden">
              <button type="button" onClick={() => onSectionChange('skills')} className={navClass(activeSection === 'skills')}>{t.admin.skills}</button>
              <button type="button" onClick={() => onSectionChange('users')} className={navClass(activeSection === 'users')}>{t.admin.users}</button>
            </div>
          </header>

          <main className="px-6 py-8 lg:px-10 lg:py-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
