import { useState } from 'react';
import { createRating, updateRating } from '../api/ratings';

interface RatingFormProps {
  skillId: string;
  userRating?: {
    id: string;
    rating: number;
  };
  onSuccess: () => void;
}

export function RatingForm({ skillId, userRating, onSuccess }: RatingFormProps) {
  const [rating, setRating] = useState(userRating?.rating || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (newRating: number) => {
    setLoading(true);
    setError('');

    try {
      if (userRating) {
        // 更新评分
        await updateRating(userRating.id, { rating: newRating });
      } else {
        // 创建评分
        await createRating(skillId, { rating: newRating });
      }
      setRating(newRating);
      setError('');
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || '评分失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">
        {userRating ? '更新评分' : '给技能评分'}
      </h3>
      {error && (
        <div className="mb-4 text-sm text-red-600">{error}</div>
      )}
      <div className="flex items-center space-x-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={loading}
            onClick={() => handleSubmit(star)}
            className={`text-4xl transition-all ${
              star <= rating
                ? 'text-yellow-400 cursor-pointer hover:text-yellow-500'
                : 'text-gray-300 cursor-pointer hover:text-yellow-400'
            }`}
            title={`${star} 星`}
          >
            ★
          </button>
        ))}
      </div>
      {rating > 0 && !loading && (
        <p className="mt-2 text-sm text-gray-600">
          当前评分: {rating} 星
        </p>
      )}
    </div>
  );
}
