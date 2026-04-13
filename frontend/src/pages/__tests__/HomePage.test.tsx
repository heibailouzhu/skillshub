import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HomePage from '../HomePage';
import { I18nProvider } from '../../i18n';
import * as skills from '../../api/skills';

vi.mock('../../api/skills', () => ({
  getSkills: vi.fn(),
  getPopularCategories: vi.fn(),
  getPopularTags: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Link: ({ children, to, ...props }: any) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

function renderPage() {
  return render(
    <I18nProvider>
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    </I18nProvider>,
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('renders Chinese homepage content by default for zh locale', async () => {
    window.localStorage.setItem('skillshub-locale', 'zh-CN');
    vi.mocked(skills.getSkills).mockResolvedValue({ skills: [], total: 0, page: 1, page_size: 6 });
    vi.mocked(skills.getPopularCategories).mockResolvedValue([]);
    vi.mocked(skills.getPopularTags).mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('用更专业的方式展示、发现并沉淀你的技能资产')).toBeInTheDocument();
      expect(screen.getByText('进入技能市场')).toBeInTheDocument();
      expect(screen.getByText('热门技能推荐')).toBeInTheDocument();
    });
  });

  it('renders English homepage content for en locale', async () => {
    window.localStorage.setItem('skillshub-locale', 'en-US');
    vi.mocked(skills.getSkills).mockResolvedValue({ skills: [], total: 0, page: 1, page_size: 6 });
    vi.mocked(skills.getPopularCategories).mockResolvedValue([]);
    vi.mocked(skills.getPopularTags).mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Showcase, discover, and grow your skills in a more professional way')).toBeInTheDocument();
      expect(screen.getByText('Explore Marketplace')).toBeInTheDocument();
      expect(screen.getByText('Featured Skills')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    vi.mocked(skills.getSkills).mockReturnValue(new Promise(() => {}));
    vi.mocked(skills.getPopularCategories).mockReturnValue(new Promise(() => {}));
    vi.mocked(skills.getPopularTags).mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByText('正在加载首页内容...')).toBeInTheDocument();
  });

  it('displays popular categories and tags', async () => {
    vi.mocked(skills.getSkills).mockResolvedValue({ skills: [], total: 0, page: 1, page_size: 6 });
    vi.mocked(skills.getPopularCategories).mockResolvedValue([
      { category: 'AI', skill_count: 10 },
      { category: 'DevOps', skill_count: 8 },
    ]);
    vi.mocked(skills.getPopularTags).mockResolvedValue([
      { tag: 'React', skill_count: 15 },
      { tag: 'Python', skill_count: 10 },
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('AI')).toBeInTheDocument();
      expect(screen.getByText('DevOps')).toBeInTheDocument();
      expect(screen.getByText(/#React/i)).toBeInTheDocument();
      expect(screen.getByText(/#Python/i)).toBeInTheDocument();
    });
  });

  it('displays skill cards', async () => {
    vi.mocked(skills.getSkills).mockResolvedValue({
      skills: [
        {
          id: '1',
          title: 'Test Skill 1',
          description: 'Description 1',
          author_username: 'user1',
          rating_avg: 4.5,
          download_count: 100,
          category: 'AI',
          tags: ['React'],
          version: '1.0.0',
          is_published: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      page_size: 6,
    });
    vi.mocked(skills.getPopularCategories).mockResolvedValue([]);
    vi.mocked(skills.getPopularTags).mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('Test Skill 1').length).toBeGreaterThan(0);
      expect(screen.getByText('Description 1')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    vi.mocked(skills.getSkills).mockRejectedValue(new Error('API Error'));
    vi.mocked(skills.getPopularCategories).mockResolvedValue([]);
    vi.mocked(skills.getPopularTags).mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('首页数据加载失败，请稍后重试。')).toBeInTheDocument();
    });
  });

  it('navigates to skill list and skill creation', async () => {
    vi.mocked(skills.getSkills).mockResolvedValue({ skills: [], total: 0, page: 1, page_size: 6 });
    vi.mocked(skills.getPopularCategories).mockResolvedValue([]);
    vi.mocked(skills.getPopularTags).mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('进入技能市场').closest('a')).toHaveAttribute('href', '/skills');
      expect(screen.getByText('发布我的技能').closest('a')).toHaveAttribute('href', '/skills/create');
    });
  });
});
