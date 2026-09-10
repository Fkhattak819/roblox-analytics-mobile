# Cursor — Software Engineer, New Grad 2027

Draft for the supplied posting's “short note on a project you're proud of.”
Review the first-person claims against your own contribution before submitting.

> I'm building Roblox Analytics Studio, an iOS analytics workspace for Roblox
> creators. It combines a React Native interface with an AWS backend for
> read-only, authorized experience reports. The hardest work has been making
> the live flow reliable: binding OAuth callbacks to the initiating app,
> handling sign-out races, and keeping stale data distinct from fresh results.
> During simulator testing, live reports failed because the database was
> throttling reads. We traced that to CloudWatch metrics, corrected the capacity
> configuration, and verified the affected reports again. I use AI heavily for
> implementation and debugging, then check the result through tests, clean
> installs, and the actual app. The repository includes a sample-mode demo and
> an engineering walkthrough so you can inspect both the product and the
> reasoning behind it.

Repository: https://github.com/Fkhattak819/roblox-analytics-mobile

Before submission, publish the tested release candidate and add its direct
demo/download link. The current GitHub commit may not include the reviewer
commands until that publication happens.

## Prepare to discuss

- What does PKCE protect, and why are callback state and an atomic exchange
  still necessary? Point to a test that would fail without each check.
- Why does the client read cached snapshots instead of waiting for Roblox?
  What is the tradeoff between freshness, latency, and request volume?
- Why did local tests miss the one-read-capacity limit? What did the live
  measurements establish, and what remains unmeasured?
- Which AI-generated changes did you inspect or revise? Use the actual
  timeout, duplicate-browser, and clean-install failures as examples.
- Which part did you personally design and implement, and where did AI assist?
  Do not claim unaided authorship or production scale without evidence.

The supplied posting also requires Spring 2027 graduation. Confirm that from
your resume separately. Degree, work authorization, and referral answers must
come from you; the project cannot establish them.
