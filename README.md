<p align="center">
  <img src="frontend/public/app-logo-120.png" alt="Applyline logo" width="88" height="88" />
</p>

<h1 align="center">Applyline</h1>

<p align="center">
  Keep every opportunity moving.
</p>

<p align="center">
  <a href="https://applyline.app">Open Applyline</a>
  ·
  <a href="https://applyline.app/privacy">Privacy</a>
  ·
  <a href="https://applyline.app/terms">Terms</a>
</p>

## About Applyline

Applyline is a focused workspace for managing a job search. It brings applications, interviews, assessments, follow-ups, notes, and contacts into one clear view, so the next step for every opportunity is easy to find.

The experience is designed for both desktop and mobile, with a simple interface that keeps attention on the application process rather than administrative work.

## Application tracking

- Record the company, role, application date, job description, and recruiter contact details.
- Move an opportunity through Applied, Screening, Assessment, Interviewing, Offer, Accepted, Rejected, or Withdrawn.
- Separate active applications from completed outcomes while preserving useful history.
- Search, filter, sort, and browse applications from one workspace.
- Review each application's current status and previous status changes.
- Add private notes and keep the original job description available for reference.

## Interviews and scheduling

- Schedule interviews, assessments, and follow-ups from an application.
- Record interview rounds, stages, locations, meeting links, and outcomes.
- View upcoming events in a calendar or inside the related application.
- Edit or remove events when plans change.
- Keep scheduling separate from the application status timeline for a clearer history.

## Dashboard

- See total applications and the size of the active pipeline.
- Review status distribution across the job search.
- Open recent applications and upcoming events quickly.
- Use the same workspace comfortably on desktop, tablet, and mobile.
- Generate interview preparation from an application's details and any scheduled interview, then choose which checklist suggestions to add.

### AI interview preparation

The authenticated `POST /api/applications/{applicationId}/interview-preparation` endpoint powers **Prepare for interview** in an application's detail view. Preparation can use the application's job details and notes even when no interview is scheduled. Select **Generate preparation** to request a concise plan and practice questions. Checklist suggestions remain proposals until selected and added; the application checklist API checks ownership and avoids saving titles already on the checklist.

Agent runs are limited to five per user per UTC day by default. Set `AiAgentQuota__DailyRunLimit` to a positive integer to change the limit. A quota response uses HTTP 429 and includes the reset time.

Configure the production OpenAI credential through the secret environment variable `OpenAI__ApiKey`; do not put credential values in configuration files. The endpoint requires the `AiAgentRuns` table, so apply the `AddAiAgentRuns` migration before enabling the feature in an existing production database.

## Account and access

- Sign in with email and password or a Google account.
- Recover access through the password reset flow.
- Update a display name, password, and connected sign-in methods.
- Keep each user's applications, notes, contacts, and events private to their account.

## Administration

- Review platform activity and account growth.
- Search and inspect registered user accounts.
- See application and event usage totals without exposing private application content.
- Disable or restore account access when needed.
- Keep a record of administrator account actions.

## Automated PM review fixes

The GitHub Actions workflow `.github/workflows/review-autofix.yml` can prepare and push a validated fix to an existing PR after a qualifying PM review. It runs only for an open, non-draft PR authored by `Limwalnut`, from a same-repository `codex/req-###` branch into `main`, when the latest PM review refers to a `REQ-###` identifier present in the PR title or description and requests changes on the current head commit. The workflow rejects PRs that change workflow, execution, deployment, agent instruction, secret-bearing, or generated paths, so it cannot modify its own controls.

Before enabling it, merge the workflow into `main` and add the repository Actions secret `OPENAI_API_KEY`. The workflow declares its required `GITHUB_TOKEN` permissions per job. The Codex model defaults to `gpt-6-luna` at medium effort; set the repository Actions variable `CODEX_MODEL` to override it. The workflow pins the official Codex GitHub Action, its CLI version, and GitHub Actions dependencies.

Use a standalone verdict line in each PM review body, for example:

```text
## Review: REQ-001

<review findings>

**Verdict: changes requested.**
```

Only one standalone verdict is accepted: `Verdict: changes requested` or `Verdict: ready`, optionally surrounded by `**` and ending with a period. Missing, conflicting, quoted, or prose-appended verdicts are ignored. Reviews submitted before this workflow is enabled are not replayed; submit a new review after activation to start an attempt.

Each qualifying review reserves one durable attempt before the model runs. Failed model or validation runs count too. A PR gets at most three attempts over its lifetime; a later qualifying review after the limit receives one handoff comment for manual follow-up. Codex receives no GitHub write token. A separate credential-free job validates the patch, and trusted publish code rechecks the review and head before a normal non-force push. Each reserved attempt receives a fixed-template status comment when the workflow finishes. The workflow never merges or deploys. A `GITHUB_TOKEN` push does not trigger other workflows, so the PM review process must wait for the pushed head and request another review if changes remain. A new submitted review is the only trigger; the workflow does not watch or replay existing reviews automatically.
