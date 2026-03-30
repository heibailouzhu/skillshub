import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSkills, getPopularCategories, getPopularTags } from '../api/skills';
import { Navbar, Footer } from '../components';
import { Button } from '../components';
import type { Skill, PopularCategory, PopularTag } from '../api/skills';

export default function HomePage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [categories, setCategories] = useState<PopularCategory[]>([]);
  const [tags, setTags] = useState<PopularTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [skillsRes, categoriesRes, tagsRes] = await Promise.all([
          getSkills({ page: 1, page_size: 6 }),
          getPopularCategories(),
          getPopularTags(),
        ]);
        setSkills(skillsRes.skills || []);
        setCategories(categoriesRes);
        setTags(tagsRes);
      } catch (err: any) {
        setError('加载数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-3xl font-extrabold sm:text-4xl mb-4">
            发现和分享优秀技能
          </h2>
          <p className="text-xl mb-8">
            SkillShub 是一个技能分享平台，让用户可以轻松发现、分享和使用各种技能。
          </p>
          <div className="flex space-x-4">
            <Link to="/skills">
              <Button variant="secondary" size="lg">
                浏览技能
              </Button>
            </Link>
            <Link to="/skills/create">
              <Button variant="primary" size="lg">
                发布技能
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Hot Skills */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">热门技能</h3>
            <Link to="/skills" className="text-indigo-600 hover:text-indigo-800">
              查看更多 →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {skills.map((skill) => (
              <Link
                key={skill.id}
                to={`/skills/${skill.id}`}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 block"
              >
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  {skill.title}
                </h4>
                <p className="text-gray-600 mb-4 line-clamp-2">
                  {skill.description}
                </p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span className="flex items-center">
                    ⭐ {skill.rating_avg.toFixed(1)} ({skill.rating_count})
                  </span>
                  <span className="flex items-center">
                    📥 {skill.download_count}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Popular Categories */}
        <section className="mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">热门分类</h3>
          <div className="flex flex-wrap gap-2">
            {categories.slice(0, 10).map((category) => (
              <Link
                key={category.category}
                to={`/skills?category=${encodeURIComponent(category.category)}`}
                className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 hover:bg-indigo-200 transition-colors"
              >
                {category.category} ({category.skill_count})
              </Link>
            ))}
          </div>
        </section>

        {/* Popular Tags */}
        <section className="mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">热门标签</h3>
          <div className="flex flex-wrap gap-2">
            {tags.slice(0, 15).map((tag) => (
              <Link
                key={tag.tag}
                to={`/skills?tags=${encodeURIComponent(tag.tag)}`}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
              >
                #{tag.tag} ({tag.skill_count})
              </Link>
            ))}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
