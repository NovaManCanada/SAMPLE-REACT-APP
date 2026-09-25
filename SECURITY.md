# Security Policy

This is a local-only demo/learning project (see [README.md](README.md#security-notes)), not a
production Sapiens system. It still follows Sapiens secure-coding practices, and vulnerability
reports are welcome and taken seriously.

## Reporting a vulnerability

**Do not open a public GitHub issue for a security vulnerability.**

If you work at Sapiens, report it through the internal **AppSec / InfoSec team** channel —
contact details and intake process are on the
[Application Security Portal](https://sapiens-digital.atlassian.net/wiki/spaces/INFOSEC/pages/3865673852)
on Confluence. Do not include exploit code or sensitive data in the initial report; the AppSec
team will provide a secure channel for details if needed.

If you don't have access to that portal, contact the repository owner directly (see the GitHub
repo's contributor/owner list) and mark the message as security-sensitive.

Please include, where possible:

- A description of the vulnerability and its impact.
- Steps to reproduce (or a minimal proof of concept).
- The affected file(s)/endpoint(s) and, if known, the relevant commit.

## Scope

This repo is a sample application (`server/` Express API, `client/` React frontend). In scope:

- Authentication/authorization bypass, JWT/session handling flaws.
- Injection (NoSQL, XSS, header/CRLF injection, etc.).
- Secrets exposure, insecure cryptographic practices.
- Access control issues (e.g. accessing another user's data).

Out of scope: findings that only apply to the specific way this demo is run (e.g. the
unauthenticated local MongoDB instance used for local development, or the console-logged
"dev email" fallback when SMTP isn't configured) — those are documented, intentional
simplifications for a local-only demo, not vulnerabilities in the code itself.

## Supported versions

This is a single-branch demo project — only the latest commit on `main` is supported. There are
no maintained release branches.

## Disclosure

Given this is a non-production sample app, there's no formal embargo/CVE process. Please still
allow a reasonable window to fix a confirmed issue before public disclosure.
