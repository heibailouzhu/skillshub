import { useState, type FormEvent } from 'react';
import { createComment } from '../api/comments';
import Button from './Button';

interface CommentFormProps {
  skillId: string;
  onSuccess: () => void;
}

export function CommentForm({ skillId, onSuccess }: CommentFormProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setError('评论内容不能为空');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createComment(skillId, { content });
      setContent('');
      setError('');
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || '评论失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          发表评论
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="写下你的评论..."
          className={`
            block w-full px-3 py-2 rounded-lg border-gray-300 shadow-sm
            focus:border-blue-500 focus:ring-blue-500
            ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
          `}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" variant="primary" loading={loading}>
        发表评论
      </Button>
    </form>
  );
}
