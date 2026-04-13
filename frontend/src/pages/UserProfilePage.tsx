import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFavorites } from '../api/favorites';
import { getRatings, type Rating } from '../api/ratings';
import { Badge, Button, Card, CardBody, Footer, Navbar } from '../components';
import { useI18n } from '../i18n';
import type { Favorite } from '../api/favorites';

export default function UserProfilePage() {
  const { locale, t } = useI18n();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'favorites' | 'ratings'>('favorites');

  const user = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [favoritesRes, ratingsRes] = await Promise.all([
          getFavorites({ page: 1, page_size: 20 }),
          getRatings({ page: 1, page_size: 20 }),
        ]);
        setFavorites(favoritesRes.favorites || []);
        setRatings(ratingsRes.ratings || []);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const totalFavorites = favorites.length;
  const totalRatings = ratings.length;
  const avgRating = totalRatings > 0
    ? ratings.reduce((sum, item) => sum + item.rating, 0) / totalRatings
    : 0;

  return (
    <div className="min-h-screen flex flex-col theme-text">
      <Navbar />
      <main className="container-wide page-shell flex-1">
        <section className="grid gap-8 xl:grid-cols-[380px_minmax(0,1fr)] 2xl:grid-cols-[420px_minmax(0,1fr)]">
          <Card className="xl:sticky xl:top-28">
            <CardBody className="space-y-6 p-7 xl:p-8">
              <div>
                <div className="text-sm uppercase tracking-[0.24em] theme-text-muted">{t.common.profile}</div>
                <h1 className="mt-2 text-3xl font-black theme-text">{t.profile.title}</h1>
                <p className="mt-3 text-sm leading-7 theme-text-soft">{t.profile.subtitle}</p>
              </div>

              <div className="rounded-3xl px-6 py-5" style={{ backgroundColor: 'var(--brand-soft)' }}>
                <div className="text-xl font-semibold theme-text">{user.username || t.profile.userFallback}</div>
                <div className="mt-1 text-sm theme-text-soft">{user.email || t.profile.emailUnset}</div>
                {user.is_admin && <div className="mt-2 text-sm text-[var(--brand)]">{t.navbar.adminAccount}</div>}
              </div>

              <div className="grid gap-4">
                <div className="rounded-2xl border border-[var(--line)] p-5 text-center">
                  <div className="text-3xl font-bold theme-text">{totalFavorites}</div>
                  <div className="mt-2 text-sm theme-text-soft">{t.favorites.title}</div>
                </div>
                <div className="rounded-2xl border border-[var(--line)] p-5 text-center">
                  <div className="text-3xl font-bold theme-text">{totalRatings}</div>
                  <div className="mt-2 text-sm theme-text-soft">{t.profile.ratings}</div>
                </div>
                <div className="rounded-2xl border border-[var(--line)] p-5 text-center">
                  <div className="text-3xl font-bold theme-text">{avgRating.toFixed(1)}</div>
                  <div className="mt-2 text-sm theme-text-soft">{t.profile.avgRating}</div>
                </div>
              </div>
            </CardBody>
          </Card>

          <div className="space-y-6 xl:min-w-0">
            <div className="flex gap-3">
              <Button variant={activeTab === 'favorites' ? 'primary' : 'secondary'} onClick={() => setActiveTab('favorites')}>
                {t.profile.myFavorites} ({totalFavorites})
              </Button>
              <Button variant={activeTab === 'ratings' ? 'primary' : 'secondary'} onClick={() => setActiveTab('ratings')}>
                {t.profile.myRatings} ({totalRatings})
              </Button>
            </div>

            {loading ? (
              <div className="glass-panel rounded-[2rem] p-8 theme-text-soft">{t.profile.loading}</div>
            ) : activeTab === 'favorites' ? (
              favorites.length === 0 ? (
                <Card>
                  <CardBody className="py-14 text-center">
                    <p className="theme-text-soft">{t.profile.emptyFavorites}</p>
                    <div className="mt-5">
                      <Link to="/skills"><Button>{t.favorites.browse}</Button></Link>
                    </div>
                  </CardBody>
                </Card>
              ) : (
                <div className="space-y-4">
                  {favorites.map((fav) => (
                    <Link key={fav.id} to={`/skills/${fav.skill?.id}`}>
                      <Card hover>
                        <CardBody className="flex flex-col gap-4 p-6 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <h3 className="text-xl font-semibold theme-text">{fav.skill?.title}</h3>
                            <p className="mt-2 text-sm leading-7 theme-text-soft">{fav.skill?.description || t.market.noDescription}</p>
                            <div className="mt-3 flex items-center gap-3">
                              <Badge>{fav.skill?.category || t.market.uncategorized}</Badge>
                              <span className="text-sm theme-text-muted">
                                {t.messages.rating} {fav.skill?.rating_avg?.toFixed(1) || '0.0'} ({fav.skill?.rating_count || 0})
                              </span>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    </Link>
                  ))}
                </div>
              )
            ) : ratings.length === 0 ? (
              <Card>
                <CardBody className="py-14 text-center">
                  <p className="theme-text-soft">{t.profile.emptyRatings}</p>
                  <div className="mt-5">
                    <Link to="/skills"><Button>{t.favorites.browse}</Button></Link>
                  </div>
                </CardBody>
              </Card>
            ) : (
              <div className="space-y-4">
                {ratings.map((rating) => (
                  <Link key={rating.id} to={`/skills/${rating.skill?.id}`}>
                    <Card hover>
                      <CardBody className="flex flex-col gap-4 p-6 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <h3 className="text-xl font-semibold theme-text">{rating.skill?.title}</h3>
                          <p className="mt-2 text-sm leading-7 theme-text-soft">{rating.skill?.description || t.market.noDescription}</p>
                          <div className="mt-3 flex items-center gap-3">
                            <Badge variant="primary">{rating.rating} {t.profile.starsSuffix}</Badge>
                            <span className="text-sm theme-text-muted">{new Date(rating.created_at).toLocaleDateString(locale)}</span>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
