import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getComments } from '../api/comments';
import { getFavorites } from '../api/favorites';
import { getRatings } from '../api/ratings';
import { getRatingStats, getSkill } from '../api/skills';
import { Badge, Button, Card, CardBody, CommentForm, FavoriteButton, Footer, Navbar, RatingForm } from '../components';
import { useI18n } from '../i18n';
import type { Comment } from '../api/comments';
import type { Favorite } from '../api/favorites';
import type { Rating } from '../api/ratings';
import type { Skill, SkillRatingStats } from '../api/skills';

function safeFormatDate(value: string, locale: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(locale);
}

export default function SkillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const [skill, setSkill] = useState<Skill | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [ratingStats, setRatingStats] = useState<SkillRatingStats | null>(null);
  const [userRating, setUserRating] = useState<Rating | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isAuthenticated = Boolean(localStorage.getItem('token'));

  const formatCount = (value: number) => new Intl.NumberFormat(locale).format(value || 0);

  const loadUserRating = async (ratings: Rating[]) => {
    const skillRating = ratings.find((item) => item.skill_id === id);
    setUserRating(skillRating || null);
  };

  const loadFavoriteStatus = async (favorites: Favorite[]) => {
    const isFav = favorites.some((item) => item.skill && item.skill.id === id);
    setIsFavorite(isFav);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const [skillRes, commentsRes] = await Promise.all([
          getSkill(id),
          getComments(id, { page: 1, page_size: 10 }),
        ]);

        setSkill(skillRes);
        setComments(commentsRes.comments || []);

        try {
          const ratingRes = await getRatingStats(id);
          setRatingStats(ratingRes);
        } catch {
          setRatingStats(null);
        }

        if (token) {
          try {
            const [ratingsRes, favoritesRes] = await Promise.all([
              getRatings({ page: 1, page_size: 100 }),
              getFavorites({ page: 1, page_size: 100 }),
            ]);
            await loadUserRating(ratingsRes.ratings);
            await loadFavoriteStatus(favoritesRes.favorites);
          } catch {
            // ignore secondary panel failures
          }
        }
      } catch {
        setError(t.skillDetail.loadError);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, t.skillDetail.loadError]);

  const refreshComments = async () => {
    if (!id) return;
    const commentsRes = await getComments(id, { page: 1, page_size: 10 });
    setComments(commentsRes.comments || []);
  };

  const handleCommentSuccess = async () => {
    await refreshComments();
  };

  const handleRatingSuccess = async () => {
    if (!id) return;
    const [ratingsRes, skillRes] = await Promise.all([
      getRatings({ page: 1, page_size: 100 }),
      getSkill(id),
    ]);
    await loadUserRating(ratingsRes.ratings);
    setSkill(skillRes);
    try {
      const ratingRes = await getRatingStats(id);
      setRatingStats(ratingRes);
    } catch {
      setRatingStats(null);
    }
  };

  const handleFavoriteToggle = (nextValue: boolean) => {
    setIsFavorite(nextValue);
    setSkill((current) => current ? {
      ...current,
      favorite_count: Math.max(0, (current.favorite_count || 0) + (nextValue ? 1 : -1)),
    } : current);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center theme-bg theme-text">{t.skillDetail.loading}</div>;
  }

  if (error || !skill) {
    return (
      <div className="min-h-screen flex items-center justify-center theme-bg px-4">
        <div className="rounded-3xl border border-rose-400/20 bg-rose-400/10 px-6 py-5 text-rose-500">{error || t.skillDetail.notFound}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col theme-bg theme-text">
      <Navbar />
      <main className="container-wide page-shell flex-1">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.18fr)_minmax(340px,0.82fr)] 2xl:gap-10">
          <section className="space-y-8 xl:min-w-0">
            <div className="glass-panel-strong rounded-[2rem] p-8 xl:p-10">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <Badge variant="primary">{skill.category || t.market.uncategorized}</Badge>
                <Badge>{t.skillDetail.versionPrefix} {skill.version}</Badge>
                <Badge variant={skill.is_published ? 'success' : 'warning'}>{skill.is_published ? t.skillDetail.published : t.skillDetail.draft}</Badge>
              </div>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="max-w-3xl">
                  <h1 className="text-4xl font-black theme-text">{skill.title}</h1>
                  <p className="mt-4 text-base leading-8 theme-text-soft">{skill.description || t.skillDetail.noSummary}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm theme-text-soft">
                  <div>{t.skillDetail.publishedAt}: {safeFormatDate(skill.created_at, locale)}</div>
                  <div className="mt-2">{t.skillDetail.updatedAt}: {safeFormatDate(skill.updated_at, locale)}</div>
                </div>
              </div>
            </div>

            <Card>
              <CardBody>
                <pre className="whitespace-pre-wrap break-words text-sm leading-7 theme-text-soft font-sans">{skill.content}</pre>
              </CardBody>
            </Card>

            {ratingStats && (
              <Card>
                <CardBody>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-2xl font-semibold theme-text">{t.skillDetail.ratingDistribution}</h2>
                    <span className="text-sm theme-text-muted">{formatCount(ratingStats.total_ratings)} {t.skillDetail.ratingCount}</span>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(ratingStats.distribution || {}).map(([score, count]) => {
                      const numericCount = Number(count) || 0;
                      const ratio = ratingStats.total_ratings ? (numericCount / ratingStats.total_ratings) * 100 : 0;
                      return (
                        <div key={score} className="flex items-center gap-3">
                          <span className="w-10 text-sm theme-text-soft">{score}★</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${ratio}%` }} />
                          </div>
                          <span className="w-12 text-right text-sm theme-text-muted">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>
            )}

            <Card>
              <CardBody>
                <h2 className="mb-5 text-2xl font-semibold theme-text">{t.skillDetail.comments} ({comments.length})</h2>
                {isAuthenticated ? (
                  <CommentForm skillId={skill.id} onSuccess={handleCommentSuccess} />
                ) : (
                  <div className="mb-5 rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-5 py-4 text-sm leading-7 theme-text-soft">{t.skillDetail.loginToComment}</div>
                )}
                {comments.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-5 py-6 text-sm theme-text-muted">{t.skillDetail.noComments}</div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="rounded-2xl border border-white/8 bg-white/5 p-5">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="font-medium theme-text">{comment.user_username || t.skillDetail.anonymousUser}</span>
                          <span className="text-sm theme-text-muted">{safeFormatDate(comment.created_at, locale)}</span>
                        </div>
                        <p className="text-sm leading-7 theme-text-soft">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </section>

          <aside className="space-y-6 xl:sticky xl:top-28 self-start">
            <div className="glass-panel rounded-[2rem] p-6 xl:p-8">
              <div className="mb-5 text-sm uppercase tracking-[0.22em] theme-text-muted">{t.skillDetail.overview}</div>
              <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
                <div><div className="text-3xl font-bold theme-text">{skill.rating_avg?.toFixed(1) || '0.0'}</div><div className="mt-2 text-sm theme-text-muted">{t.skillDetail.averageRating}</div></div>
                <div><div className="text-3xl font-bold theme-text">{formatCount(skill.rating_count || 0)}</div><div className="mt-2 text-sm theme-text-muted">{t.skillDetail.ratingCount}</div></div>
                <div><div className="text-3xl font-bold theme-text">{formatCount(skill.download_count || 0)}</div><div className="mt-2 text-sm theme-text-muted">{t.skillDetail.downloadCount}</div></div>
                <div><div className="text-3xl font-bold theme-text">{formatCount(skill.favorite_count || 0)}</div><div className="mt-2 text-sm theme-text-muted">{t.skillDetail.favoritesCount}</div></div>
              </div>
              <div className="mt-6 flex flex-col gap-3">
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-3 text-sm theme-text-soft">{t.skillDetail.packageHint}</div>
                <Button onClick={() => {
                  window.open(skill.package?.download_url || `/api/skills/${skill.id}/archive`, '_blank');
                  setSkill((current) => current ? { ...current, download_count: (current.download_count || 0) + 1 } : current);
                }}>{t.skillDetail.downloadPackage}</Button>
                {isAuthenticated ? (
                  <FavoriteButton skillId={skill.id} isFavorite={isFavorite} onToggle={handleFavoriteToggle} />
                ) : (
                  <Button variant="secondary" onClick={() => navigate('/login')}>{t.skillDetail.loginToFavorite}</Button>
                )}
                {isAuthenticated ? (
                  <Button variant="secondary" onClick={() => navigate(`/skills/${skill.id}/versions`)}>{t.skillDetail.versionManagement}</Button>
                ) : (
                  <Button variant="secondary" onClick={() => navigate('/login')}>{t.skillDetail.loginToManageVersions}</Button>
                )}
              </div>
            </div>

            {isAuthenticated ? (
              <RatingForm skillId={skill.id} userRating={userRating || undefined} onSuccess={handleRatingSuccess} />
            ) : (
              <div className="rounded-[2rem] border border-[var(--line)] bg-[var(--panel)] p-6 text-sm leading-7 theme-text-soft">{t.skillDetail.loginToRate}</div>
            )}
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
