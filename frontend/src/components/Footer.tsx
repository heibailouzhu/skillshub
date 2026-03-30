export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-800 text-gray-300 py-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-bold text-white mb-4">SkillShub</h3>
            <p className="text-sm">
              技能分享平台，发现、分享和使用优秀的技能。
            </p>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-4">快速链接</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/" className="hover:text-white">
                  首页
                </a>
              </li>
              <li>
                <a href="/skills" className="hover:text-white">
                  技能列表
                </a>
              </li>
              <li>
                <a href="/api/docs/openapi.json" className="hover:text-white">
                  API 文档
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-4">关于我们</h3>
            <p className="text-sm">
              SkillShub 是一个技能分享平台，让用户可以轻松发现、分享和使用各种技能。
            </p>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm">
          <p>&copy; {currentYear} SkillShub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
