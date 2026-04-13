import { useState } from 'react';
import { addFavorite, removeFavorite } from '../api/favorites';
import { useI18n } from '../i18n';
import Button from './Button';

interface FavoriteButtonProps {
  skillId: string;
  isFavorite: boolean;
  onToggle?: (nextValue: boolean) => void;
}

export default function FavoriteButton({ skillId, isFavorite, onToggle }: FavoriteButtonProps) {
  const { locale } = useI18n();
  const [loading, setLoading] = useState(false);

  const text = locale === 'zh-CN'
    ? {
        removeFailed: '取消收藏失败，请稍后重试。',
        addFailed: '添加收藏失败，请稍后重试。',
        saved: '已收藏',
        save: '加入收藏',
      }
    : {
        removeFailed: 'Failed to remove favorite. Please try again later.',
        addFailed: 'Failed to add favorite. Please try again later.',
        saved: 'Saved',
        save: 'Add to Favorites',
      };

  const handleToggle = async () => {
    if (!skillId) {
      window.alert(isFavorite ? text.removeFailed : text.addFailed);
      return;
    }

    setLoading(true);
    try {
      if (isFavorite) {
        await removeFavorite(skillId);
        onToggle?.(false);
      } else {
        await addFavorite(skillId);
        onToggle?.(true);
      }
    } catch (err) {
      console.error('Favorite toggle failed:', err);
      window.alert(isFavorite ? text.removeFailed : text.addFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant={isFavorite ? 'secondary' : 'primary'} onClick={handleToggle} loading={loading}>
      {isFavorite ? text.saved : text.save}
    </Button>
  );
}
