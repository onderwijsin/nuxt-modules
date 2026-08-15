# Security policy

## Supported versions

Packages in this monorepo are independently versioned. Only the latest published version of each
`@onderwijsin/*` package is actively supported for security fixes. Older versions may receive fixes
at maintainer discretion but are not guaranteed security support; this policy does not imply that
older releases are known to be vulnerable.

Please upgrade to the latest release before reporting an issue that may already be fixed there.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting flow for this repository. Do not open a public GitHub
issue for a suspected vulnerability.

Include the affected package and version, impact, prerequisites, reproduction steps or proof of
concept, and any known mitigations. Avoid accessing, modifying, or retaining data that is not needed
to demonstrate the issue. Private reporting lets maintainers coordinate a fix and disclosure before
technical details are published.

Reports may cover published `@onderwijsin/*` packages, repository-owned CI or release tooling whose
compromise could affect published packages, and repository-managed integrations or configuration
where the vulnerability originates in this repository's code. Vulnerabilities in upstream
dependencies or third-party services should normally be reported to their upstream owner unless this
repository introduces an exploitable integration-specific issue.

## Fix and disclosure

Maintainers will privately validate and triage reports, prepare and validate fixes through the
normal package/release pipeline where applicable, release affected packages, and may publish a
GitHub Security Advisory or equivalent disclosure after remediation when appropriate. Not every
report will result in a CVE.
