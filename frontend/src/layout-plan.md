# Frontend Layout Refresh Plan

## Goals
- Expand desktop layouts so the product feels more premium and less cramped.
- Establish one sitewide layout system instead of page-by-page spacing decisions.
- Strengthen visual hierarchy: hero > workspace > supporting panels > low-priority metadata.
- Standardize page shells across marketing, list, form, detail, and dashboard views.

## Current Issues
- Global container width is conservative at `80rem`, making wide screens feel underused.
- Many pages reuse centered single-column shells even when content would benefit from multi-column desktop layouts.
- Hero panels, content panels, and utility panels use similar weights, reducing hierarchy.
- Shared navigation/footer widths match the narrow content shell, limiting overall presence.
- Repeated ad-hoc paddings and grid decisions lead to uneven rhythm across pages.

## Proposed System

### 1. Global Shell
- Increase base content width for desktop screens.
- Introduce a wider shell variant for primary product pages.
- Keep mobile and tablet spacing disciplined; spend width mostly on large desktop screens.
- Make navbar/footer align with the new shell so the whole site feels coherent.

### 2. Page Templates
- Marketing pages: large hero + secondary insight rail/cards.
- Workspace/form pages: main content + optional side context on desktop.
- Listing pages: top summary band + filter band + roomy content grid.
- Detail/profile pages: content column + stats/action side rail.
- Admin pages: stable dashboard shell with stronger content width and calmer chrome.

### 3. Visual Hierarchy Rules
- Use `glass-panel-strong` only for hero/primary sections.
- Use `glass-panel` for standard content surfaces.
- Use simpler bordered surfaces for low-priority containers.
- Standardize section spacing and card padding at each breakpoint.

## Rollout Phases
1. Upgrade global shell primitives (`container-custom`, spacing helpers, navbar, footer).
2. Refresh primary pages (`HomePage`, `SkillListPage`, `SkillCreatePage`, `SkillEditPage`).
3. Refresh detail/workspace pages (`SkillDetailPage`, `UserProfilePage`, `FavoritesPage`, `SkillVersionPage`).
4. Refresh auth/admin shells (`LoginPage`, `RegisterPage`, `AdminLayout`).
5. Run a consistency pass for spacing, hierarchy, and density.

## Key Files
- `frontend/src/index.css`
- `frontend/src/components/Navbar.tsx`
- `frontend/src/components/Footer.tsx`
- `frontend/src/components/AdminLayout.tsx`
- `frontend/src/pages/HomePage.tsx`
- `frontend/src/pages/SkillListPage.tsx`
- `frontend/src/pages/SkillCreatePage.tsx`
- `frontend/src/pages/SkillEditPage.tsx`
- `frontend/src/pages/SkillDetailPage.tsx`
- `frontend/src/pages/UserProfilePage.tsx`
- `frontend/src/pages/FavoritesPage.tsx`
- `frontend/src/pages/SkillVersionPage.tsx`
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/pages/RegisterPage.tsx`
