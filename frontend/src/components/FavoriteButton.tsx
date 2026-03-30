import { useState } from 'react';
import { addFavorite, removeFavorite } from '../api/favorites';
import Button from './Button';

interface FavoriteButtonProps {
  skillId: string;
  isFavorite: boolean;
  onToggle: () => void;
}

export function FavoriteButton({ skillId, isFavorite, onToggle }: FavoriteButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);

    try {
      if (isFavorite) {
        await removeFavorite(skillId);
      } else {
        await addFavorite(skillId);
      }
      onToggle();
    } catch (err: any) {
      console.error('收藏操作失败:', err);
      alert(isFavorite ? '取消收藏失败' : '添加收藏失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={isFavorite ? 'danger' : 'secondary'}
      size="md"
      onClick={handleToggle}
      loading={loading}
    >
      {isFavorite ? '❤️ 已收藏' : '🤍 收藏'}
    </Button>
  );
}
