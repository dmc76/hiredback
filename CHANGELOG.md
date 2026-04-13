# HiredBack — Changelog

All notable changes to HiredBack are documented here.
Versions are dated releases. Files are kept in GitHub — revert via commit history if needed.

---

## v1.1.0 — 13 April 2026

### Added
- **Skill contextualisation** — Core Skills bullets now include a short evidence-based clause after an em dash, grounding each skill in real experience from the CV or Q&A answers (e.g. "Project Management — delivered cross-functional rollouts across 3 enterprise clients"). If no specific evidence exists, the skill is listed without a clause rather than fabricating context.
- **CV Style selector** — dropdown on the results screen with four options:
  - Standard — clean and professional (default)
  - Executive — leadership and seniority focused
  - Modern — action-led, suits tech and creative roles
  - Graduate — transferable skills and potential led
- **Regenerate button** — re-runs the CV rewrite with the selected style without navigating away from results and without deducting a credit. CV output fades while regenerating and shows a confirmation on completion.

### Changed
- `qaAnswers` now stored at module level so regenerate has access to Q&A answers from the original session.
- `runRewrite` now accepts `style` and `billCredit` parameters.

---

## v1.0.0 — 10 April 2026 (Launch)

### Core app
- Full flow: welcome → licence → upload → job ad → processing → Q&A → results
- Mobile-first responsive design, dark mode throughout
- ATS score rings with before/after animation
- Diagnostic breakdown with impact badges
- Modern CV Guide screen
- Processing screen with rotating messages

### AI & Analysis
- Anthropic API via Netlify Edge Functions (streaming, no timeout)
- Robust JSON sanitisation with repair fallback
- No-fabrication prompt rules — builds from CV outward
- Context-specific tool usage
- Q&A gap filling — detects missing skills, asks targeted questions, feeds into rewrite
- 5 most significant roles by time served, all earlier roles as one-liners
- 2 page maximum enforced
- Low ATS score warning
- Honest diagnostic when role is a poor match

### Payments & Credits
- Gumroad licence key system
- Four pricing tiers: £4 / £15 / £30 / £50
- Server-side credit tracking via Gumroad API
- Cache-safe credit storage
- Credits displayed on licence screen with key pre-filled
- Correct credit deduction after analysis

### Output
- Word (.docx) download via html-docx-js
- Professional formatting — name, headings, bullets, spacing
- Copy text button
- Download diagnostic report as .txt
- Disclaimer on CV output panel

### Infrastructure
- Netlify hosting — app.hiredback.co.uk
- GitHub auto-deploy
- Demo site — demo.hiredback.co.uk with password gate
- Landing page — hiredback.co.uk
- Feedback form — feedback.hiredback.co.uk
- Favicon across all sites
- Custom domain via Fasthosts
- Environment variables: ANTHROPIC_API_KEY, GUMROAD_ACCESS_TOKEN
