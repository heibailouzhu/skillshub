import { useI18n } from '../i18n';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { locale } = useI18n();

  const footerText = locale === 'zh-CN'
    ? {
        intro: '面向开发者、团队与创作者的技能共享平台，用更清晰的结构展示能力、版本与社区反馈。',
        quickLinks: '快速入口',
        home: '首页',
        market: '技能市场',
        apiDocs: 'API 文档',
        principles: '体验原则',
        principleText: '更高信息密度、更稳定对比度、更明确状态反馈，兼顾发布、浏览与互动路径。',
        builtWith: '基于 UI Pro refresh 构建。',
      }
    : {
        intro: 'A skill sharing platform for developers, teams, and creators, with clearer structure for capabilities, versions, and community feedback.',
        quickLinks: 'Quick Links',
        home: 'Home',
        market: 'Marketplace',
        apiDocs: 'API Docs',
        principles: 'Design Principles',
        principleText: 'Higher information density, steadier contrast, and clearer state feedback across publishing, browsing, and interaction flows.',
        builtWith: 'Built with UI Pro refresh.',
      };

  return (
    <footer className="mt-auto border-t border-[var(--line)] bg-slate-950/70">
      <div className="container-wide py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr_1fr]">
          <div>
            <h3 className="mb-4 text-xl font-semibold text-white">SkillShub</h3>
            <p className="max-w-xl text-sm leading-7 text-slate-400">{footerText.intro}</p>
          </div>
          <div>
            <h3 className="mb-4 text-lg font-semibold text-white">{footerText.quickLinks}</h3>
            <div className="space-y-3 text-sm text-slate-400">
              <a href="/">{footerText.home}</a>
              <a href="/skills">{footerText.market}</a>
              <a href="/api/docs/openapi.json">{footerText.apiDocs}</a>
            </div>
          </div>
          <div>
            <h3 className="mb-4 text-lg font-semibold text-white">{footerText.principles}</h3>
            <p className="max-w-md text-sm leading-7 text-slate-400">{footerText.principleText}</p>
          </div>
        </div>
        <div className="mt-10 border-t border-white/10 pt-6 text-sm text-slate-500">
          © {currentYear} SkillShub. {footerText.builtWith}
        </div>
      </div>
    </footer>
  );
}
