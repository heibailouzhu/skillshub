import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFavorites, removeFavorite, type Favorite } from '../api/favorites';
import { Badge, Button, Card, CardBody, Footer, Loading, Navbar } from '../components';
import { useI18n } from '../i18n';

export default function FavoritesPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const fetchFavorites = async () => {
    try {
      const data = await getFavorites({ page, page_size: pageSize });
      setFavorites(data.favorites || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      if (err.response?.status === 401) navigate('/login');
      else setError(err.response?.data?.error || t.favorites.fetchError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [page]);

  const handleRemoveFavorite = async (skillId: string) => {
    try {
      await removeFavorite(skillId);
      await fetchFavorites();
    } catch (err: any) {
      setError(err.response?.data?.error || t.favorites.removeError);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <Loading text={t.favorites.loading} />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col theme-text">
      <Navbar />
      <main className="container-wide page-shell flex-1">
        <section className="grid gap-8 xl:grid-cols-[380px_minmax(0,1fr)] 2xl:grid-cols-[420px_minmax(0,1fr)]">
          <Card className="xl:sticky xl:top-28">
            <CardBody className="space-y-5 p-7">
              <div>
                <div className="text-sm uppercase tracking-[0.24em] theme-text-muted">{t.favorites.title}</div>
                <h1 className="mt-2 text-3xl font-black theme-text">{t.favorites.title}</h1>
                <p className="mt-3 text-sm leading-7 theme-text-soft">{t.favorites.subtitle}</p>
              </div>

              <div className="grid gap-4">
                <div className="rounded-2xl border border-[var(--line)] p-5">
                  <div className="text-3xl font-bold theme-text">{total}</div>
                  <div className="mt-2 text-sm theme-text-muted">{t.favorites.total}</div>
                </div>
                <div className="rounded-2xl border border-[var(--line)] p-5">
                  <div className="text-3xl font-bold theme-text">{page}</div>
                  <div className="mt-2 text-sm theme-text-muted">{t.favorites.currentPage}</div>
                </div>
                <div className="rounded-2xl border border-[var(--line)] p-5">
                  <div className="text-3xl font-bold theme-text">{totalPages}</div>
                  <div className="mt-2 text-sm theme-text-muted">{t.favorites.totalPages}</div>
                </div>
              </div>

              <Button fullWidth onClick={() => navigate('/skills')}>
                {t.favorites.browse}
              </Button>
            </CardBody>
          </Card>

          <div className="space-y-6 xl:min-w-0">
            {error && (
              <div className="rounded-3xl border border-rose-400/20 bg-rose-400/10 p-5 text-rose-500">
                {error}
              </div>
            )}

            {favorites.length === 0 ? (
              <Card>
                <CardBody className="py-16 text-center">
                  <h3 className="text-xl font-semibold theme-text">{t.favorites.empty}</h3>
                  <p className="mt-3 theme-text-soft">{t.favorites.emptyHint}</p>
                  <div className="mt-6">
                    <Button onClick={() => navigate('/skills')}>{t.favorites.browse}</Button>
                  </div>
                </CardBody>
              </Card>
            ) : (
              favorites.map((favorite) => {
                const skill = favorite.skill;
                if (!skill) return null;

                return (
                  <Card key={favorite.id} hover>
                    <CardBody className="flex flex-col gap-5 p-6 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-semibold theme-text">{skill.title}</h3>
                          <Badge>{skill.category || t.market.uncategorized}</Badge>
                        </div>
                        <p className="mt-3 text-sm leading-7 theme-text-soft">{skill.description || t.market.noDescription}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {(skill.tags || []).map((tag) => (
                            <Badge key={tag} variant="primary">{tag}</Badge>
                          ))}
                        </div>
                        <div className="mt-4 text-sm theme-text-muted">
                          {t.messages.rating} {skill.rating_avg?.toFixed(1) || '0.0'} · {skill.rating_count || 0}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-3 lg:w-[180px]">
                        <Button onClick={() => navigate(`/skills/${skill.id}`)}>{t.favorites.viewDetail}</Button>
                        <Button variant="secondary" onClick={() => handleRemoveFavorite(skill.id)}>{t.favorites.remove}</Button>
                      </div>
                    </CardBody>
                  </Card>
                );
              })
            )}

            <div className="flex items-center justify-between rounded-3xl border border-[var(--line)] p-5">
              <Button variant="secondary" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>{t.common.previous}</Button>
              <div className="text-sm theme-text-soft">{page} / {totalPages}</div>
              <Button variant="secondary" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page >= totalPages}>{t.common.next}</Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
