# Project discussion note

A short, evidence-backed description of this portfolio project:

> I'm building Roblox Analytics Studio, an iOS analytics workspace for Roblox
> creators. It combines a React Native interface with an AWS backend for
> read-only, authorized experience reports. The hardest work has been making
> the live flow reliable: binding OAuth callbacks to the initiating app,
> handling sign-out races, and keeping stale data distinct from fresh results.
> During simulator testing, live reports failed because the database was
> throttling reads. We traced that to CloudWatch metrics, corrected the capacity
> configuration, and verified the affected reports again. AI assisted
> implementation and debugging; I check the result through tests, clean
> installs, and the actual app. The repository includes a sample-mode demo
> and an engineering walkthrough so the product and reasoning can be inspected.

Confirm the first-person contribution statement against your own work before
using it. This repository does not establish graduation date, adoption,
revenue, production scale, or individual authorship of every change.

Questions worth preparing for:

- Why bind the OAuth callback to a local proof and still require one-time exchange?
- Why read cached reports rather than query Roblox while a screen renders?
- What did live DynamoDB throttle measurements establish that local tests missed?
- Which AI-assisted changes were personally reviewed or revised?
- Which design and implementation decisions were yours?
