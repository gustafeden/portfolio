# Atelier

**Tech Stack**: Flutter | Dart | Firebase | Riverpod | Apple Sign-In | Cloud Firestore | Firebase Storage

**Built with**: Claude Code AI-assisted development

A portfolio photo CMS for photographers. Manage your portfolio collections and photos from your phone, with real-time sync to your website. Upload a photo, and it's live—no Git, no deploys, no friction.

<div id="atelier-live-stats" class="live-stats-container"></div>

## The Problem

There was no good way to update my portfolio. Every photo meant: optimize the image, add it to the assets folder in GitHub, write the metadata, commit, push. For a single photo. The friction was enough that I'd take photos worth sharing and just... never upload them.

I wanted something dead simple from the start: pull out my phone, pick a photo, upload. Done. Wherever I am—on a train, at a café, waiting for a friend. No laptop, no Git commits, no build pipelines. Just photos to website, instantly.

## How It Works

The app is deliberately simple. You have **collections** (like "Street Photography" or "Portraits") and **photos** within them. Each collection gets a cover, a slug for URLs, and a visibility toggle.

Upload photos from your camera roll or snap new ones directly. The app automatically:
- Optimizes images to 2000px (keeping quality high but file sizes reasonable)
- Extracts EXIF data (camera, lens, aperture, shutter speed, ISO, focal length)
- Creates cover thumbnails at 600px
- Syncs everything to Firebase in real-time

Every photo can have a caption, location, and notes. Toggle whether EXIF data shows on your website—sometimes the technical details add to the story, sometimes they're just noise.

## Apple Sign-In

Went with Apple Sign-In as the only auth method. No passwords to forget, no email verification flows. Just Face ID and you're in.

The implementation was trickier than expected—needed to handle the nonce correctly and pass the `authorizationCode` as `accessToken` to Firebase. A bug that took some internet searching to figure out after Flutter 3.24 updates broke the standard approach.

## Multi-User Ready

Each user manages their own portfolio. The app doesn't assume you're the only photographer in the world—data is scoped by userId, security rules enforce ownership, storage paths are user-prefixed.

Could easily become a platform where multiple photographers manage their portfolios through the same app, all syncing to their own websites.

## The Portfolio Website Connection

This website you're reading now pulls directly from the same Firebase database Atelier writes to. Upload a photo in the app, refresh the portfolio page, it's there. No build step, no deployment, no waiting.

The website queries `portfolio_collections` and `portfolio_photos` from Firestore, falling back to static data if Firebase is unavailable. Public read access means the website works without authentication.

## Technical Architecture

```
Atelier App (Flutter)
    ↓ writes to
Firebase (Firestore + Storage)
    ↓ reads from
Portfolio Website (Vanilla JS)
```

Clean separation. The app handles creation and management. Firebase handles storage and sync. The website handles display. Each part does one thing well.

Built with Riverpod for state management—same pattern as OurArchive but stripped down to just what's needed. Repository pattern for data access, user-scoped queries everywhere.

## Built with Claude Code

Like OurArchive, this was a Claude Code collaboration. But faster this time—patterns were established, Firebase setup was familiar, the architecture decisions were clearer.

Started as "extract portfolio from OurArchive into its own app" at 9am, had a working app with Apple Sign-In, photo uploads, and full CRUD by end of day. Same day: app icon generated, splash screen configured, TestFlight build submitted.

That's the power of AI-assisted development with established patterns. The boring parts (boilerplate, Firebase rules, icon generation) happen in minutes. More time for the interesting problems.

## What I Learned

**Apple Sign-In is particular.** Small details matter—the nonce hash, the authorization code flow, the entitlements file. Firebase docs assume you know iOS development. You'll be reading Stack Overflow.

**Indexes are your friend (and enemy).** Forgot a composite index? Firestore helpfully tells you which query failed. But you'll deploy indexes multiple times before you get them all right.

**Splitting apps is freeing.** OurArchive was getting heavy. Atelier is light. Single purpose apps are easier to maintain and more pleasant to use.

## What's Next

- **Project management** - Write and edit these project posts directly from the app
- Drag-and-drop reordering on the website
- Bulk photo operations (delete multiple, move between collections)
- Blog post support (the markdown parser is ready)
- Maybe Android, if there's demand

## Links

- [GitHub Repository →](https://github.com/gustaf-eden_elux/atelier)
- [OurArchive →](projects/ourarchive) - The app this was extracted from
- [Claude Code →](https://claude.com/claude-code) - AI-assisted development

---

*Built in a day through human-AI collaboration. Now manages the photos you see on this very website.*
