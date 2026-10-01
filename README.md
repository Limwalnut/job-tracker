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
- Generate interview preparation from the next scheduled interview, then choose which checklist suggestions to add.

### AI interview preparation

The authenticated `POST /api/ai/interview-preparation` endpoint powers the Dashboard's **Prepare for next interview** dialog. Select **Generate preparation** to request a concise plan and practice questions. Checklist suggestions remain proposals until selected and added; the application checklist API checks ownership and avoids saving titles already on the checklist.

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
