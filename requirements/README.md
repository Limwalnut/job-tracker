# Requirements

This folder holds product requirements for Applyline. Read the relevant requirement when a person starts work; work is not started or monitored automatically.

## Roles and workflow

- **Product manager:** Create a file named `REQ-001-short-title.md` (use the next available number), define the problem and outcome, set scope and out-of-scope items, and write testable acceptance criteria. Mark it `ready` when it is ready for development. Do not include secrets.
- **Developer:** Work from a ready requirement on a branch named `codex/req-001-short-title`. Implement only the agreed scope, run the stated checks, and open a pull request that links to the requirement and identifies its revision.
- **Review:** Address GitHub PR review feedback and update the implementation as needed. If feedback or implementation requires a scope change, return it to the product manager to revise the requirement first. Do not merge or deploy automatically.

Use [`TEMPLATE.md`](TEMPLATE.md) for new requirements. Keep requirements clear and concise. Product review comments may give technical feedback, but do not use a requirement to change security or key-handling practices, or merge and deployment policy.
