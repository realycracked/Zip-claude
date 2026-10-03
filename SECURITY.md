# Security policy

## Reporting a vulnerability

If you find a security issue in Zip Browser, please **do not open a public
GitHub issue**.

Instead:

1. Open a private security advisory via the repository's "Security" tab, or
2. Email the maintainers directly if listed in `MAINTAINERS.md`.

Include:

* The browser version (`npm start -- --version` on the prototype, or the
  commit hash of your `firefox-fork/mozilla-unified/` HEAD).
* The platform (OS and version).
* A proof-of-concept, or at minimum reproduction steps.

We aim to acknowledge reports within 72 hours and ship a fix as soon as the
severity warrants it.

## Scope

In scope:

* Code in this repository.
* Patches under `firefox-fork/patches/` (upstream Firefox bugs should be
  reported to Mozilla).
* Bundled block lists (if they can be weaponised, e.g. collisions).

Out of scope:

* Vulnerabilities in Electron, Chromium or Gecko that have an upstream fix
  (please report upstream first).
* Social-engineering reports against individual contributors.

## Hall of fame

Reporters who help us ship a security fix are credited in release notes
unless they ask to stay anonymous.
