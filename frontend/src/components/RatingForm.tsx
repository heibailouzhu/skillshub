import { useEffect, useState } from 'react';
import { createRating, updateRating } from '../api/ratings';
import { useI18n } from '../i18n';
import type { Rating } from '../api/ratings';

interface RatingFormProps {
  skillId: string;
  userRating?: Rating;
  onSuccess?: () => void;
}

export default function RatingForm({ skillId, userRating, onSuccess }: RatingFormProps) {
  const { locale } = useI18n();
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const text = locale === 'zh-CN'
    ? {
        failed: '评分失败，请稍后重试。',
        update: '更新评分',
        create: '为技能评分',
        hint: '点击星级立即提交评分，系统会自动刷新当前统计。',
        current: '当前评分：',
        star: '星',
      }
    : {
        failed: 'Failed to submit rating. Please try again later.',
        update: 'Update Rating',
        create: 'Rate This Skill',
        hint: 'Click a star to submit immediately. The latest stats refresh automatically.',
        current: 'Current rating:',
        star: 'star',
      };

  useEffect(() => {
    setRating(userRating?.rating || 0);
  }, [userRating]);

  const handleRate = async (value: number) => {
    try {
      setLoading(true);
      setError('');
      if (userRating?.id) {
        await updateRating(userRating.id, { rating: value });
      } else {
        await createRating(skillId, { rating: value });
      }
      setRating(value);
      onSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.message || text.failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[2rem] border border-white/8 bg-white/5 p-6">
      <h3 className="text-xl font-semibold text-white">{userRating ? text.update : text.create}</h3>
      <p className="mt-2 text-sm text-slate-400">{text.hint}</p>
      {error && <div className="mt-4 text-sm text-rose-300">{error}</div>}
      <div className="mt-5 flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`text-3xl transition ${star <= rating ? 'text-amber-400' : 'text-slate-600 hover:text-amber-300'}`}
            onClick={() => handleRate(star)}
            disabled={loading}
            title={`${star} ${text.star}`}
          >
            ★
          </button>
        ))}
      </div>
      {rating > 0 && !loading && <p className="mt-3 text-sm text-slate-400">{text.current} {rating} {text.star}</p>}
    </div>
  );
}
