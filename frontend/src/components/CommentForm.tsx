import { useState } from 'react';
import { createComment } from '../api/comments';
import { useI18n } from '../i18n';
import Button from './Button';

interface CommentFormProps {
  skillId: string;
  onSuccess?: () => void;
}

export default function CommentForm({ skillId, onSuccess }: CommentFormProps) {
  const { locale } = useI18n();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const text = locale === 'zh-CN'
    ? {
        empty: '评论内容不能为空。',
        failed: '评论提交失败，请重试。',
        label: '发表评论',
        placeholder: '写下你的使用体验、问题或建议...',
        submit: '发布评论',
      }
    : {
        empty: 'Comment content cannot be empty.',
        failed: 'Failed to submit comment. Please try again.',
        label: 'Post a Comment',
        placeholder: 'Share your experience, questions, or suggestions...',
        submit: 'Post Comment',
      };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.trim()) {
      setError(text.empty);
      return;
    }

    setLoading(true);
    setError('');
    try {
      await createComment(skillId, { content: content.trim() });
      setContent('');
      onSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.message || text.failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="mb-6" onSubmit={handleSubmit}>
      <label className="mb-2 block text-sm font-medium text-slate-200">{text.label}</label>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400/40"
        placeholder={text.placeholder}
      />
      {error && <div className="mt-3 text-sm text-rose-300">{error}</div>}
      <div className="mt-4 flex justify-end">
        <Button type="submit" loading={loading}>{text.submit}</Button>
      </div>
    </form>
  );
}
