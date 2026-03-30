import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSkill, getRatingStats } from '../api/skills';
import { getComments } from '../api/comments';
import { getRatings } from '../api/ratings';
import { getFavorites } from '../api/favorites';
import { Navbar, Footer, CommentForm, RatingForm, FavoriteButton } from '../components';
import { Button } from '../components';
import type { Skill, SkillRatingStats } from '../api/skills';
import type { Comment } from '../api/comments';
import type { Rating } from '../api/ratings';
import type { Favorite } from '../api/favorites';

export default function SkillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [skill, setSkill] = useState<Skill | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [ratingStats, setRatingStats] = useState<SkillRatingStats | null>(null);
  const [userRating, setUserRating] = useState<Rating | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUserRating = async (ratings: Rating[]) => {
    const skillRating = ratings.find((r) => r.skill_id === id);
    setUserRating(skillRating || null);
  };

  const loadFavoriteStatus = async (favorites: Favorite[]) => {
    const isFav = favorites.some((f) => f.skill && f.skill.id === id);
    setIsFavorite(isFav);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const token = localStorage.getItem('token');

        const [skillRes, commentsRes, ratingRes] = await Promise.all([
          getSkill(id),
          getComments(id, { page: 1, page_size: 10 }),
          getRatingStats(id),
        ]);

        setSkill(skillRes);
        setComments(commentsRes.comments || []);
        setRatingStats(ratingRes);

        // 如果用户已登录，加载用户评分和收藏状态
        if (token) {
          try {
            const [ratingsRes, favoritesRes] = await Promise.all([
              getRatings({ page: 1, page_size: 100 }),
              getFavorites({ page: 1, page_size: 100 }),
            ]);

            await loadUserRating(ratingsRes.ratings);
            await loadFavoriteStatus(favoritesRes.favorites);
          } catch (err) {
            console.error('加载用户数据失败:', err);
          }
        }
      } catch (err: any) {
        setError('加载技能详情失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleCommentSuccess = async () => {
    if (!id) return;
    try {
      const commentsRes = await getComments(id, { page: 1, page_size: 10 });
      setComments(commentsRes.comments || []);
    } catch (err) {
      console.error('加载评论失败:', err);
    }
  };

  const handleRatingSuccess = async () => {
    if (!id) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const ratingsRes = await getRatings({ page: 1, page_size: 100 });
      await loadUserRating(ratingsRes.ratings);

      const ratingRes = await getRatingStats(id);
      setRatingStats(ratingRes);

      const skillRes = await getSkill(id);
      setSkill(skillRes);
    } catch (err) {
      console.error('加载评分失败:', err);
    }
  };

  const handleFavoriteToggle = async () => {
    if (!id) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const favoritesRes = await getFavorites({ page: 1, page_size: 100 });
      await loadFavoriteStatus(favoritesRes.favorites);

      const skillRes = await getSkill(id);
      setSkill(skillRes);
    } catch (err) {
      console.error('加载收藏状态失败:', err);
    }
  };

  const handleDownload = async () => {
    if (!skill) return;
    // 下载功能 - 这里可以添加实际的下载逻辑
    alert(`下载技能: ${skill.title}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !skill) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-600">{error || '技能不存在'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Skill Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {skill.title}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                <span>作者: {skill.author_username || '匿名'}</span>
                <span>分类: {skill.category}</span>
                <span>版本: {skill.version}</span>
              </div>
              <p className="text-gray-700 mb-4">{skill.description}</p>
              {skill.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {skill.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="text-right flex flex-col items-end space-y-2">
              <div className="text-3xl font-bold text-indigo-600 mb-2">
                ⭐ {skill.rating_avg.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">
                👍 {skill.rating_count} 人评分
              </div>
              <FavoriteButton
                skillId={skill.id}
                isFavorite={isFavorite}
                onToggle={handleFavoriteToggle}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/skills/${skill.id}/versions`)}
                className="mt-2"
              >
                📋 版本管理
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDownload}
                className="mt-2"
              >
                📥 下载
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-indigo-600 mb-2">
              {ratingStats?.total_ratings || 0}
            </div>
            <div className="text-gray-600">总评分</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-indigo-600 mb-2">
              {skill.download_count}
            </div>
            <div className="text-gray-600">下载次数</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-indigo-600 mb-2">
              {skill.rating_avg.toFixed(1)}
            </div>
            <div className="text-gray-600">平均评分</div>
          </div>
        </div>

        {/* Rating Form */}
        <RatingForm
          skillId={skill.id}
          userRating={userRating || undefined}
          onSuccess={handleRatingSuccess}
        />

        {/* Skill Content */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">技能内容</h2>
          <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto whitespace-pre-wrap">
            {skill.content}
          </pre>
        </div>

        {/* Rating Distribution */}
        {ratingStats && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">评分分布</h2>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((score) => {
                const count = ratingStats.distribution[score] || 0;
                const percentage = ratingStats.total_ratings > 0
                  ? (count / ratingStats.total_ratings) * 100
                  : 0;
                return (
                  <div key={score} className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600 w-8">{score} 星</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            评论 ({comments.length})
          </h2>
          <CommentForm skillId={skill.id} onSuccess={handleCommentSuccess} />
          {comments.length === 0 ? (
            <p className="text-gray-600">暂无评论</p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="border-b border-gray-200 pb-4 last:border-0"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      {comment.user_username || '匿名'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(comment.created_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  <p className="text-gray-700">{comment.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
