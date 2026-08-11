# Simple rate limiter

Read this decision before changing rate-limit storage, scope, proxy handling, guarantees, security
positioning, or use around sensitive flows. It defines the module's intended protection boundary.

The simple rate limiter is intentionally a small, best-effort abuse-control utility rather than a
general-purpose application security module. Mature Nuxt security modules already provide broader
security features, and the controls that must withstand deliberate abuse belong at the
infrastructure boundary: for example, a CDN, WAF, API gateway, load balancer, or a rate-limit
service with atomic storage operations.

The module provides per-IP, path-scoped limits through Nitro storage, with an opt-in global limit.
This is useful for reducing casual abuse and shaping traffic on low-risk endpoints. Its storage
updates are non-atomic, so concurrent or distributed requests can exceed a configured limit.
Deployment topology and client IP handling also affect its behaviour: in-memory storage is local to
one runtime instance, and forwarded IP headers are trusted only when the application explicitly opts
in behind a trusted proxy.

Consequently, the limiter is not a security boundary and must not be the sole protection for
authentication, password recovery, account enumeration, privileged or costly operations, or any
other flow requiring strict enforcement. Those flows need infrastructure-level protection or a
purpose-built, atomically coordinated limiter.

The Directus module's authentication routes do not change this decision. They are thin Nuxt-side
wrappers around a Directus instance; Directus remains the service that authenticates requests and
enforces its own security policy. Rate limiting around those wrappers may reduce incidental abuse,
but the authoritative security boundary is the Directus deployment and the infrastructure in front
of it.
