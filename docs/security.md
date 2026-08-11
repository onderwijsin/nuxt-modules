# Repository security

GitHub security features provide an additional layer of protection for this repository. They
complement the local validation and CI checks described in [Workspace and tooling](workspace.md).
Read this article when work affects dependencies, lockfiles, workflows, permissions, secrets,
security reports, Dependabot, CodeQL, or a security boundary in a published module.

## Dependabot

The repository has the dependency graph, Dependabot security alerts, and Dependabot security updates
enabled. Dependabot security updates may open pull requests when GitHub identifies a vulnerable
dependency and a compatible remediation is available. General dependency version updates remain a
separate concern.

Treat every Dependabot security alert as a finding that requires triage:

- patch genuine vulnerabilities as soon as practical;
- dismiss an alert only when it is a false positive or demonstrably non-exploitable, and record a
  clear reason in GitHub;
- do not dismiss alerts merely to keep the repository or pull request green; and
- require security-update pull requests to pass the normal CI, package validation, and review
  process.

Keep the repository's package-manager and lockfile workflow intact when reviewing or updating a
Dependabot pull request. Use the pinned pnpm version and the frozen lockfile install documented in
[Workspace and tooling](workspace.md).

## CodeQL

GitHub CodeQL default setup is enabled for the repository's JavaScript and TypeScript code. CodeQL
runs on pushes and pull requests targeting `main`, with a weekly scheduled scan. Findings are
available in GitHub code scanning and should be triaged rather than suppressed solely to make a
check pass.

CodeQL is a security analysis check, not a replacement for formatting, linting, type checking,
tests, builds, or package validation. Keep those checks in the normal CI workflow.

When a finding concerns generated output, fixtures, playground output, or another deliberately
excluded path, document and review that exclusion carefully. Do not exclude source code simply to
silence a legitimate finding.

## GitHub Actions security

Actions workflows should use the minimum permissions needed for each job. GitHub-maintained and
third-party actions must be pinned to full immutable commit SHAs, retaining the corresponding
release or tag in an inline comment. Avoid adding broad write permissions unrelated to the job's
purpose.

Report suspected vulnerabilities through the repository's configured GitHub security reporting
channel rather than opening a public issue with sensitive details.
