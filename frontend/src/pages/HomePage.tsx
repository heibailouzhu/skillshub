import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPopularCategories, getPopularTags, getSkills } from '../api/skills';
import { Badge, Button, Card, CardBody, Footer, Navbar } from '../components';
import { useI18n } from '../i18n';
import type { PopularCategory, PopularTag, Skill } from '../api/skills';

export default function HomePage() {
  const { locale, t } = useI18n();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [categories, setCategories] = useState<PopularCategory[]>([]);
  const [tags, setTags] = useState<PopularTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const formatCount = (value: number) => new Intl.NumberFormat(locale).format(value || 0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [skillsRes, categoriesRes, tagsRes] = await Promise.all([
          getSkills({ page: 1, page_size: 6, sort_by: 'download_count', sort_order: 'desc' }),
          getPopularCategories(),
          getPopularTags(),
        ]);
        setSkills(skillsRes.skills || []);
        setCategories(categoriesRes || []);
        setTags(tagsRes || []);
      } catch {
        setError(t.home.loadError);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [t.home.loadError]);

  const metrics = useMemo(
    () => [
      { label: t.home.metrics.hotSkills, value: formatCount(skills.length ? skills.length * 12 : 72) },
      { label: t.home.metrics.categoryCoverage, value: formatCount(categories.length) },
      { label: t.home.metrics.trendingTags, value: formatCount(tags.length) },
    ],
    [skills.length, categories.length, tags.length, locale, t.home.metrics],
  );

  return (
    <div className="min-h-screen flex flex-col theme-text">
      <Navbar />

      <main className="flex-1">
        <section className="hero-grid overflow-hidden border-b border-[var(--line)]">
          <div className="container-wide relative grid gap-12 py-20 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)] lg:py-28 2xl:gap-16">
            <div className="relative space-y-10">
              <div className="inline-flex items-center gap-3 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-[var(--brand)] shadow-[0_20px_50px_-30px_rgba(16,185,129,0.55)]">
                <span className="status-dot" />
                {t.home.banner}
              </div>

              <div className="pointer-events-none absolute -left-16 top-24 h-56 w-56 rounded-full bg-[var(--brand)]/8 blur-3xl" />
              <div className="pointer-events-none absolute left-56 top-8 h-44 w-44 rounded-full bg-[var(--accent)]/10 blur-3xl" />

              <div className="space-y-5">
                <h1 className="max-w-4xl text-4xl font-black tracking-tight text-balance sm:text-5xl lg:text-6xl 2xl:text-7xl">
                  {t.home.title}
                </h1>
                <p className="max-w-3xl text-lg leading-8 theme-text-soft lg:text-xl">{t.home.subtitle}</p>
              </div>

              <div className="flex flex-wrap gap-4">
                <Link to="/skills">
                  <Button size="lg">{t.home.browse}</Button>
                </Link>
                <Link to="/skills/create">
                  <Button variant="secondary" size="lg">{t.home.create}</Button>
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 xl:max-w-5xl">
                {metrics.map((metric) => (
                  <div key={metric.label} className="glass-panel rounded-3xl p-5">
                    <div className="text-3xl font-black theme-text">{metric.value}</div>
                    <div className="mt-2 text-sm theme-text-muted">{metric.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel-strong relative overflow-hidden rounded-[2rem] p-7 lg:p-8 xl:p-10">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/5 to-transparent" />
              <div className="relative mb-6 flex items-center justify-between">
                <div>
                  <div className="text-sm uppercase tracking-[0.22em] theme-text-muted">{t.home.featured}</div>
                  <div className="mt-2 text-2xl font-semibold theme-text">{t.home.trending}</div>
                </div>
                <Badge variant="success">{t.home.live}</Badge>
              </div>

              <div className="space-y-4">
                {skills.slice(0, 4).map((skill, index) => (
                  <Link key={skill.id} to={`/skills/${skill.id}`}>
                    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 transition hover:border-[color:var(--brand)]/30 hover:bg-[var(--panel-strong)]">
                      <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] theme-text-muted">
                        <span>Top {index + 1}</span>
                        <span>{skill.category || t.market.uncategorized}</span>
                      </div>
                      <div className="text-lg font-semibold theme-text">{skill.title}</div>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 theme-text-soft">
                        {skill.description || t.market.noDescription}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs theme-text-muted">
                        <span>{skill.author_username || t.market.author}</span>
                        <span>{t.home.ratingLabel} {skill.rating_avg?.toFixed(1) || '0.0'}</span>
                        <span>{t.home.downloadsLabel} {formatCount(skill.download_count || 0)}</span>
                        <span>收藏 {formatCount(skill.favorite_count || 0)}</span>
                      </div>
                    </div>
                  </Link>
                ))}

                {!loading && skills.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[var(--line)] px-5 py-10 text-center theme-text-soft">
                    {t.home.emptySkills}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="container-wide py-18 lg:py-20">
          {loading ? (
            <div className="glass-panel rounded-[2rem] p-10 text-center theme-text-muted">{t.home.loading}</div>
          ) : error ? (
            <div className="rounded-3xl border border-rose-400/20 bg-rose-400/10 p-6 text-rose-200">{error}</div>
          ) : (
            <div className="space-y-14">
              <div>
                <div className="mb-6 flex items-end justify-between gap-4">
                  <div>
                    <div className="text-sm uppercase tracking-[0.24em] theme-text-muted">{t.common.marketplace}</div>
                    <h2 className="mt-2 text-3xl font-semibold theme-text">{t.home.recommendTitle}</h2>
                  </div>
                  <Link to="/skills" className="text-sm text-[var(--brand)] hover:opacity-80">{t.home.viewAll}</Link>
                </div>

                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {skills.map((skill) => (
                    <Link key={skill.id} to={`/skills/${skill.id}`}>
                      <Card hover className="h-full">
                        <CardBody className="space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-xl font-semibold theme-text">{skill.title}</h3>
                              <p className="mt-2 line-clamp-3 text-sm leading-6 theme-text-muted">
                                {skill.description || t.home.noDescriptionShort}
                              </p>
                            </div>
                            <Badge variant="primary">{skill.category || t.home.generalCategory}</Badge>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {(skill.tags || []).slice(0, 3).map((tag) => (
                              <Badge key={tag} size="sm">#{tag}</Badge>
                            ))}
                          </div>

                          <div className="grid grid-cols-3 gap-3 text-sm theme-text-muted">
                            <div>
                              <div className="theme-text">{skill.rating_avg?.toFixed(1) || '0.0'}</div>
                              <div>{t.home.ratingLabel}</div>
                            </div>
                            <div>
                              <div className="theme-text">{formatCount(skill.download_count || 0)}</div>
                              <div>{t.home.downloadsLabel}</div>
                            </div>
                            <div>
                              <div className="theme-text">{skill.version}</div>
                              <div>{t.home.versionLabel}</div>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardBody>
                    <div className="mb-5 flex items-center justify-between">
                      <h3 className="text-2xl font-semibold theme-text">{t.home.popularCategories}</h3>
                      <Badge variant="secondary">{formatCount(categories.length)} {t.home.itemsUnit}</Badge>
                    </div>
                    <div className="space-y-3">
                      {categories.slice(0, 6).map((item) => (
                        <Link
                          key={item.category}
                          to={`/skills?category=${encodeURIComponent(item.category)}`}
                          className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 hover:bg-[var(--panel-strong)]"
                        >
                          <span className="theme-text-soft">{item.category}</span>
                          <span className="text-sm theme-text-muted">{formatCount(item.skill_count)} {t.home.skillsUnit}</span>
                        </Link>
                      ))}
                      {categories.length === 0 && <div className="theme-text-muted">{t.home.emptyCategories}</div>}
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardBody>
                    <div className="mb-5 flex items-center justify-between">
                      <h3 className="text-2xl font-semibold theme-text">{t.home.popularTags}</h3>
                      <Badge variant="secondary">{formatCount(tags.length)} {t.home.itemsUnit}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {tags.slice(0, 18).map((item) => (
                        <Link key={item.tag} to={`/skills?tags=${encodeURIComponent(item.tag)}`}>
                          <Badge variant="success" className="px-4 py-2">#{item.tag} · {formatCount(item.skill_count)} </Badge>
                        </Link>
                      ))}
                      {tags.length === 0 && <div className="theme-text-muted">{t.home.emptyTags}</div>}
                    </div>
                  </CardBody>
                </Card>
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
