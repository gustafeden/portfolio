# Bifrost

**Tech Stack**: Go | Firebase | Firestore | Cloud Storage | React | TypeScript | launchd

**Built with**: Claude Code AI-assisted development

A self-hosted compute platform for running functions and services on your own hardware. Deploy code, schedule jobs, manage services—all without cloud vendor lock-in. Firebase acts as the control plane, accessible from anywhere.

<div id="bifrost-live-stats" class="live-stats-container"></div>

## The Problem

Cloud functions are great until you see the bill. Or realize your simple cron job needs a VPC, IAM roles, and three YAML files just to run. And if you already have a Mac mini sitting under your desk, why pay for compute you don't need?

I wanted something that feels like Cloud Functions but runs on hardware I own. No public API to secure, no cold starts, no egress charges. Just deploy from anywhere, execute on my machine, see logs in real-time.

## How It Works

Bifrost has two parts: a CLI for developers and an agent that runs on your hardware.

The **CLI** handles deployments, scheduling, and monitoring:
```bash
# Deploy a function
bifrost deploy function daily-backup ./src

# Schedule it
bifrost schedule add nightly daily-backup "0 3 * * *"

# Check what's running
bifrost status
```

The **Agent** runs as a daemon on your Mac mini (or Raspberry Pi, or Linux server). It watches Firestore for work, downloads artifacts, executes functions, and streams logs back.

```
┌─────────────────────────────────────────┐
│              Firebase Cloud             │
│  ┌───────────┐  ┌───────────────────┐  │
│  │ Firestore │  │ Firebase Storage  │  │
│  │ (control  │  │  (artifacts)      │  │
│  │  plane)   │  │                   │  │
│  └─────┬─────┘  └────────┬──────────┘  │
└────────┼─────────────────┼─────────────┘
         │                 │
 ┌───────┴─────────────────┴───────┐
 │         Firestore SDK           │
 └───────┬─────────────────┬───────┘
         │                 │
 ┌───────┴───────┐ ┌───────┴───────┐
 │  bifrost CLI  │ │ bifrost-agent │
 │  (developer)  │ │   (Mac mini)  │
 └───────────────┘ └───────────────┘
```

Firebase is the control plane—Firestore stores function definitions, schedules, events, and logs. Storage holds compiled artifacts. The CLI and agent never talk directly; everything flows through Firebase.

## Functions and Services

Bifrost supports two execution models:

**Functions** are run-to-completion jobs. Deploy a compiled Dart binary or Python script, trigger it manually or via schedule, capture the output. Great for backups, data sync, notifications.

**Services** are long-running processes. The agent supervises them—health checks, auto-restart on crash, rolling updates when you deploy a new version. Like a tiny version of systemd that syncs across machines.

Both support environment variables, encrypted secrets (AES-256-GCM), and per-target public API keys for external invocation.

## Scheduling

Cron schedules live in Firestore. The agent checks every minute, creates events for due schedules, processes them. Simple and reliable.

```bash
# Run every hour
bifrost schedule add hourly-check my-function "0 * * * *"

# Run at 9am Stockholm time
bifrost schedule add morning-report my-function "0 9 * * *" --timezone Europe/Stockholm
```

## The Admin UI

A React web app for managing everything without the CLI. See agents online, enable/disable functions, view logs, manage schedules. Deployed to GitHub Pages, talks directly to Firestore.

The dashboard shows at a glance: which agents are online, what functions exist, recent invocations and their status, upcoming scheduled runs.

## Technical Architecture

The agent is built in Go—single binary, cross-compiles to macOS and Linux. It runs multiple goroutines:

- **Heartbeat**: Updates Firestore every 30s with instance status
- **Deployment watcher**: Polls for pending deploys, downloads artifacts, installs them
- **Scheduler**: Creates events from cron schedules
- **Worker**: Processes events, executes functions, captures logs
- **Service manager**: Supervises long-running services

Leases prevent multiple agents from processing the same work. If an agent crashes mid-execution, the lease expires and another agent (or the same one after restart) picks it up.

Log batching keeps Firestore costs down—lines are collected and written in batches rather than one document per line.

## Built with Claude Code

This was an ambitious project for AI-assisted development. Multi-package Go codebase, Firestore integration, cross-platform builds, daemon management, React admin UI.

Started with "I want my own serverless platform" and built incrementally. Claude handled the boilerplate (Firestore CRUD, CLI scaffolding, React components) while I focused on the tricky parts—lease logic, graceful shutdown, artifact versioning.

The codebase grew to ~15,000 lines of Go and ~3,000 lines of TypeScript. Would have taken months solo. Instead, it was a week of evenings, with an AI partner that never forgets the codebase structure.

## What I Learned

**Firestore is surprisingly good for this.** Real-time listeners, transactions, TTL policies—it handles the control plane elegantly. The query limitations force you to think about data modeling upfront.

**Leases are hard to get right.** Race conditions, stale leases, agent crashes mid-processing. Had to think carefully about what happens when things fail halfway through.

**Services are harder than functions.** Functions run and exit. Services need supervision—what happens when they crash, how do you update them without downtime, how do you handle orphaned processes after agent restart.

**Go's simplicity pays off.** Single binary, fast compilation, great concurrency primitives. The agent is ~500KB and starts instantly.

## What's Next

- Traffic splitting and canary deployments
- Firestore/Storage triggers (run functions on document changes)
- Webhook triggers with signature validation (Stripe, GitHub events)
- Container isolation via Podman for untrusted code
- ESP32 edge agents for IoT (WASM functions on microcontrollers)

I'm also working on **Bifrost Server**—a Rust-based backend that replaces Firebase entirely. PostgreSQL for state, MinIO for artifacts, WebSockets for real-time. One `docker-compose up` and you're fully self-hosted, no Google account needed.

## Links

- [GitHub Repository](https://github.com/gustafeden/bifrost)
- [Admin UI](https://bifrost-admin-ui.web.app)
- [Atelier](projects/atelier) - Uses Bifrost for scheduled tasks
- [Claude Code](https://claude.com/claude-code) - AI-assisted development

---

*Your own little corner of the cloud, running on hardware you actually own.*
