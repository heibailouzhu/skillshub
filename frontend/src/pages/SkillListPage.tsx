import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getSkills } from '../api/skills';
import { Badge, Button, Card, CardBody, Footer, Input, Navbar } from '../components';
import { useI18n } from '../i18n';
import type { Skill } from '../api/skills';

const PAGE_SIZE = 12;

export default function SkillListPage() {
  const { t, locale } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [searchDraft, setSearchDraft] = useState(searchParams.get('search') || '');

  const formatCount = (value: number) => new Intl.NumberFormat(locale).format(value || 0);
  const pageLabel = (page: number, totalCount: number) => {
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    return t.market.pageLabel.replace('{page}', String(page)).replace('{totalPages}', String(totalPages));
  };

  const page = Number.parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const tags = searchParams.get('tags') || '';
  const sortBy = searchParams.get('sort_by') || 'created_at';
  const sortOrder = searchParams.get('sort_order') || 'desc';

  useEffect(() => {
    setSearchDraft(search);
  }, [search]);

  useEffect(() => {
    const fetchSkills = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await getSkills({
          page,
          page_size: PAGE_SIZE,
          search: search || undefined,
          category: category || undefined,
          tags: tags || undefined,
          sort_by: sortBy as never,
          sort_order: sortOrder as never,
        });
        setSkills(response.skills || []);
        setTotal(response.total || 0);
      } catch {
        setError(t.market.loadError);
      } finally {
        setLoading(false);
      }
    };

    fetchSkills();
  }, [page, search, category, tags, sortBy, sortOrder, t.market.loadError]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set('page', '1');
    setSearchParams(next);
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    updateParam('search', searchDraft.trim());
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const activeFilters = useMemo(() => {
    const filters: Array<{ key: string; label: string; value: string }> = [];
    if (category) filters.push({ key: 'category', label: t.market.categoryFilter, value: category });
    if (tags) {
      tags.split(',').filter(Boolean).forEach((tag) => {
        filters.push({ key: 'tags', label: t.market.tagFilter, value: tag });
      });
    }
    return filters;
  }, [category, tags, t.market.categoryFilter, t.market.tagFilter]);

  const removeTag = (tagToRemove: string) => {
    const nextTags = tags.split(',').filter((tag) => tag && tag !== tagToRemove).join(',');
    updateParam('tags', nextTags);
  };

  return (
    <div className="min-h-screen flex flex-col theme-text">
      <Navbar />

      <main className="container-wide page-shell flex-1">
        <section className="mb-10 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]">
          <div className="glass-panel-strong rounded-[2rem] p-8 xl:p-10">
            <div className="mb-3 text-sm uppercase tracking-[0.24em] theme-text-muted">{t.common.marketplace}</div>
            <h1 className="text-4xl font-black tracking-tight theme-text">{t.market.title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 theme-text-soft">{t.market.subtitle}</p>
          </div>
          <div className="glass-panel rounded-[2rem] p-8 xl:p-10">
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <div><div className="text-3xl font-bold theme-text">{formatCount(total)}</div><div className="mt-2 text-sm theme-text-muted">{t.market.total}</div></div>
              <div><div className="text-3xl font-bold theme-text">{page}</div><div className="mt-2 text-sm theme-text-muted">{t.market.currentPage}</div></div>
              <div><div className="text-3xl font-bold theme-text">{PAGE_SIZE}</div><div className="mt-2 text-sm theme-text-muted">{t.market.pageSize}</div></div>
              <div><div className="text-3xl font-bold theme-text">{totalPages}</div><div className="mt-2 text-sm theme-text-muted">{t.market.totalPages}</div></div>
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-[2rem] p-6 sm:p-8 xl:p-10">
          <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.22em] theme-text-muted">{t.market.filtersEyebrow}</div>
              <h2 className="mt-2 text-2xl font-semibold theme-text">{t.market.filtersTitle}</h2>
            </div>
            <div className="text-sm theme-text-soft">{t.market.filtersHint}</div>
          </div>
          <form onSubmit={handleSearch} className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
            <Input name="search" value={searchDraft} onChange={(e) => setSearchDraft(e.target.value)} placeholder={t.common.search} fullWidth />
            <select value={sortBy} onChange={(e) => updateParam('sort_by', e.target.value)} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-[var(--text)] focus:border-[var(--accent)] focus:outline-none">
              <option value="created_at">{t.market.latest}</option>
              <option value="updated_at">{t.market.updated}</option>
              <option value="rating_avg">{t.market.topRated}</option>
              <option value="download_count">{t.market.mostDownloaded}</option>
              <option value="favorite_count">{t.market.mostFavorited}</option>
            </select>
            <div className="flex gap-3 xl:justify-end">
              <select value={sortOrder} onChange={(e) => updateParam('sort_order', e.target.value)} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-[var(--text)] focus:border-[var(--accent)] focus:outline-none">
                <option value="desc">{t.common.desc}</option>
                <option value="asc">{t.common.asc}</option>
              </select>
              <Button type="submit">{t.common.search}</Button>
            </div>
          </form>

          {activeFilters.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="text-sm theme-text-muted">{t.messages.activeFilters}</span>
              {activeFilters.map((filter) => (
                <button key={`${filter.key}-${filter.value}`} type="button" onClick={() => filter.key === 'tags' ? removeTag(filter.value) : updateParam(filter.key, '')} className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-[var(--brand)] transition hover:opacity-80">
                  {filter.label}: {filter.value} ×
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          {loading ? (
            <div className="glass-panel rounded-[2rem] p-10 text-center theme-text-muted">{t.messages.loadingSkills}</div>
          ) : error ? (
            <div className="rounded-3xl border border-rose-400/20 bg-rose-400/10 p-6 text-rose-200">{error}</div>
          ) : skills.length === 0 ? (
            <div className="glass-panel rounded-[2rem] p-10 text-center theme-text-muted">{t.market.noResults}</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {skills.map((skill) => (
                <Link key={skill.id} to={`/skills/${skill.id}`}>
                  <Card hover className="h-full">
                    <CardBody className="flex h-full flex-col gap-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm uppercase tracking-[0.2em] theme-text-muted">{skill.author_username || t.market.author}</div>
                          <h2 className="mt-2 text-xl font-semibold theme-text">{skill.title}</h2>
                        </div>
                        <Badge variant="primary">{skill.category || t.market.uncategorized}</Badge>
                      </div>
                      <p className="line-clamp-3 text-sm leading-6 theme-text-soft">{skill.description || t.market.noDescription}</p>
                      <div className="flex flex-wrap gap-2">
                        {(skill.tags || []).slice(0, 4).map((tag) => <Badge key={tag} size="sm">#{tag}</Badge>)}
                      </div>
                      <div className="mt-auto grid grid-cols-4 gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 text-sm theme-text-muted">
                        <div><div className="font-semibold theme-text">{skill.rating_avg?.toFixed(1) || '0.0'}</div><div>{t.messages.rating}</div></div>
                        <div><div className="font-semibold theme-text">{formatCount(skill.download_count || 0)}</div><div>{t.messages.downloads}</div></div>
                        <div><div className="font-semibold theme-text">{formatCount(skill.favorite_count || 0)}</div><div>{t.market.favoritesCount}</div></div>
                        <div><div className="font-semibold theme-text">{skill.version}</div><div>{t.messages.version}</div></div>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 flex flex-col items-center justify-between gap-4 rounded-[2rem] border border-[var(--line)] bg-[var(--panel)] px-6 py-5 sm:flex-row">
          <div className="text-sm theme-text-muted">{pageLabel(page, total)}</div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" disabled={page <= 1} onClick={() => updateParam('page', String(page - 1))}>{t.common.previous}</Button>
            <Button variant="secondary" disabled={page >= totalPages} onClick={() => updateParam('page', String(page + 1))}>{t.common.next}</Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
