# AGENTS.md

## Project Context

This repository is a React + Vite application for supporting job-hunting workflows.

The app currently focuses on:

- extracting interview or event schedules from pasted text
- generating Google Calendar links and `.ics` files
- providing job-hunting email templates
- saving ES drafts, interview notes, and portfolio links in localStorage

The app is frontend-only. There is no backend, login, database, or server-side storage at this stage.

## Current Direction

Prioritize small, understandable improvements over large rewrites.

The current important themes are:

- split `src/App.jsx` into smaller components and utilities
- improve schedule extraction accuracy
- make localStorage handling safer
- improve document-management UX
- add tests around logic that can break silently
- keep deployment and CI simple until the app needs more operational complexity

Do not introduce login, cloud sync, a database, or backend services without first explaining the tradeoffs.

## Learning-Oriented Development

This project is also used for learning.

When making non-trivial changes, do not only implement the result. Also make the design and tradeoffs understandable.

Prefer this flow:

1. Briefly explain what will change.
2. Make a small, reviewable implementation.
3. Verify it with lint, build, or tests.
4. Summarize what changed and what the user should learn from it.

Avoid hiding important decisions behind "AI just did it." If a change introduces a new concept, name it plainly and explain why it is useful.

Good examples:

- When adding tests, explain what behavior is being protected.
- When refactoring, explain which responsibilities moved where.
- When adding CI, explain what is checked locally versus on GitHub.
- When adding deployment behavior, explain what happens on push, PR, preview, and production release.

## Safety Boundaries

Do not commit, push, merge, create releases, or change remote repository settings unless the user explicitly asks for that action in the current conversation.

Do not read, print, copy, or infer secrets from environment variables, `.env` files, shell history, credential stores, Vercel project files, GitHub tokens, npm tokens, SSH keys, or browser/session files unless the user explicitly authorizes the exact need.

Do not add or modify environment variables, GitHub secrets, Vercel settings, deployment targets, or external service integrations without explaining what data or permissions are involved and getting explicit approval.

When a command may contact external services, change remote state, or expose project metadata, explain the purpose before running it. Prefer read-only local checks when they answer the question.

## Documentation Rules

Keep public repository documentation understandable without private local context.

Do not mention private files, local-only notes, personal download paths, or conversation-specific context in README or docs.

Use:

- `README.md` for the current app description
- `docs/roadmap.md` for product and codebase improvement plans
- `docs/security-maintenance-roadmap.md` for maintenance, deployment, security, and operational maturity plans

Documentation should be useful to someone who opens the repository without knowing the prior conversation.

## CI and Deployment

GitHub Actions is used for CI. The current CI should check:

- dependency installation with `npm ci`
- lint with `npm run lint`
- production build with `npm run build`
- runtime dependency audit with `npm audit --omit=dev --audit-level=high`

Vercel may be used for deployment through its GitHub integration.

Prefer Vercel's normal GitHub integration first. Do not add GitHub Actions-based Vercel deployment unless there is a clear reason, such as needing custom deployment gates, prebuilt artifacts, or stricter control over deployment flow.

## Security and Privacy

The app may store sensitive job-hunting information such as ES drafts, self-PR text, interview notes, and company-related details.

Be careful with:

- localStorage persistence
- user-entered URLs
- calendar export content
- future cloud sync or login features
- accidental exposure in public documentation, logs, commits, or deployment output

Before adding external services, explain what data may leave the browser.

Use GitHub security features such as Dependency graph and Dependabot alerts where appropriate. Treat alerts as signals to review, not as automatic proof that the runtime app is vulnerable.

## Implementation Style

Follow the existing React + Vite + Tailwind structure.

Prefer small files with clear responsibilities:

- components for UI sections
- utilities for parsing and formatting logic
- tests for schedule extraction and other pure logic

Avoid broad rewrites unless explicitly requested.

When editing UI, keep the current app purpose in mind: this is a practical job-hunting tool, not a marketing site. Favor clarity, speed, and confidence over decorative complexity.

## Verification

Before finishing code changes, run the most relevant checks.

Usually:

```bash
npm run lint
npm run build
```

When logic tests exist, run them too.

If a command cannot be run because of local environment issues, explain the reason clearly and distinguish environment failure from source-code failure.
