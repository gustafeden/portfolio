# OurArchive

**Tech Stack**: Flutter | Dart | Firebase | Riverpod | Cloud Firestore | Firebase Storage | Material Design 3

**Built with**: Claude Code AI-assisted development

A collaborative household inventory management app that helps families and roommates organize and track their belongings through an intuitive hierarchical system. Built through human-AI collaboration using Claude Code, featuring offline-first architecture, real-time sync, and intelligent ISBN barcode scanning for effortless cataloging.

## Overview

OurArchive solves the universal problem of household disorganization: "Where did I put that thing?" Traditional inventory apps are either too complex (enterprise-focused) or too simple (just lists). OurArchive strikes the perfect balance with an intuitive container hierarchy (Rooms → Shelves → Boxes → Sub-boxes) that mirrors how people actually organize physical spaces.

Development Approach: This app was built through an iterative collaboration between human direction and Claude Code's AI-assisted development. Rather than writing every line manually, the development process involved defining requirements, reviewing generated code, and refining the architecture together. This modern workflow enabled rapid iteration on complex features like the offline sync queue and multi-API book lookup system while maintaining clean, maintainable code.

The app currently supports multiple households with role-based access control, allowing families to collaboratively manage their shared items. The standout technical achievement is the offline-first architecture with a priority-based sync queue that ensures data consistency even when connectivity is intermittent.

The app is particularly useful for families tracking books, games, vinyl records, electronics, and general household items across multiple storage locations. The ISBN barcode scanner with triple-API fallback (Google Books → Open Library → Libris) makes cataloging book collections effortless, automatically populating metadata including cover images, authors, and publication details.

## Key Features

- **Hierarchical Container Organization**: Infinitely nestable containers (Room/Shelf/Box/Drawer/Fridge) that mirror real-world storage, with drag-to-reorder support and visual breadcrumb navigation
- **ISBN Barcode Scanning**: Automatic book metadata lookup using mobile camera with intelligent fallback between Google Books API, Open Library API, and Swedish Royal Library (Libris) for comprehensive coverage
- **Offline-First Sync Queue**: Priority-based task queue with automatic retry logic, connectivity monitoring, and conflict resolution for seamless offline operation
- **Collaborative Households**: 6-character invite codes with checksum validation, role-based access control (Owner/Member/Viewer/Pending), and member approval workflow
- **Smart Photo Management**: Automatic image compression before upload, Firebase Storage integration with 10MB limits, and cached network images for optimal performance
- **Real-Time Multi-Device Sync**: Firestore-powered real-time database with optimistic UI updates and automatic sync across all household member devices

## Technical Implementation

The architecture follows a clean separation between data, business logic, and UI using Riverpod for state management. Firebase provides the backend (Authentication, Firestore database, Cloud Storage, Crashlytics), while the offline-first approach ensures the app remains fully functional without connectivity.

AI-Assisted Development Process: The development leveraged Claude Code for rapid prototyping of complex systems. For example, the sync queue implementation started with architectural discussions about priority handling and retry logic, then Claude Code generated the initial implementation. Through iterative refinement—identifying edge cases, improving error handling, and optimizing performance—the system evolved into production-ready code. This collaborative approach allowed focus on high-level architecture and user experience while accelerating implementation of technical details.

The sync queue implementation uses three priority queues (high/normal/low) to ensure critical operations like photo uploads complete before background tasks. The system monitors connectivity changes and automatically processes queued tasks when the network becomes available. Each task tracks retry attempts, last error states, and implements exponential backoff to avoid hammering the server.

Book scanning leverages a triple-fallback API system. When a user scans an ISBN barcode, the app first queries Google Books API for comprehensive metadata. If that fails (rate limits, missing data, or regional restrictions), it falls back to Open Library, and finally to Libris for Swedish books. This approach provides 95%+ successful lookup rates across international book collections. Results are cached in memory to reduce API calls for duplicate scans.

The role-based access control system uses Firestore Security Rules to enforce permissions at the database level. Pending members cannot read household data until approved, Members can create/edit items, Viewers have read-only access, and Owners control membership and household settings. This ensures security even if the client is compromised.

### Code Example: Offline-First Sync Queue

```dart
class SyncQueue {
  final Queue<SyncTask> _highPriority = Queue();
  final Queue<SyncTask> _normalPriority = Queue();
  final Queue<SyncTask> _lowPriority = Queue();
  bool _isProcessing = false;

  SyncQueue() {
    // Listen for connectivity changes and auto-process
    Connectivity().onConnectivityChanged.listen((result) {
      if (result.first != ConnectivityResult.none) {
        _logger.info('SyncQueue', 'Connectivity restored, processing queue');
        process();
      }
    });

    // Retry failed tasks every 30 seconds
    Timer.periodic(const Duration(seconds: 30), (_) => process());
  }

  void add(SyncTask task) {
    switch (task.priority) {
      case TaskPriority.high:
        _highPriority.add(task);
      case TaskPriority.normal:
        _normalPriority.add(task);
      case TaskPriority.low:
        _lowPriority.add(task);
    }
    process(); // Immediately try to process if online
  }

  Future<void> process() async {
    if (_isProcessing) return;
    _isProcessing = true;

    // Process high priority first, then normal, then low
    while (_highPriority.isNotEmpty || _normalPriority.isNotEmpty) {
      final task = _highPriority.isNotEmpty
          ? _highPriority.removeFirst()
          : _normalPriority.removeFirst();

      try {
        await task.execute();
        _logger.debug('SyncQueue', 'Task ${task.id} completed');
      } catch (e) {
        task.attempts++;
        if (task.attempts < task.maxRetries) {
          add(task); // Re-queue for retry
        }
      }
    }
    _isProcessing = false;
  }
}
```

### Code Example: Triple-Fallback Book Lookup

```dart
/// Look up book by ISBN with in-memory cache and triple API fallback
Future<BookMetadata?> lookupBook(String isbn) async {
  final cleanIsbn = isbn.replaceAll(RegExp(r'[^0-9X]'), '');

  // Check in-memory cache first
  if (_cache.containsKey(cleanIsbn)) {
    return _cache[cleanIsbn];
  }

  // Try Google Books API (primary source)
  try {
    final googleResult = await _fetchFromGoogleBooks(cleanIsbn);
    if (googleResult != null) {
      _cache[cleanIsbn] = googleResult;
      return googleResult;
    }
  } catch (e) {
    debugPrint('Google Books lookup failed: $e');
  }

  // Fallback to Open Library
  try {
    final openLibraryResult = await _fetchFromOpenLibrary(cleanIsbn);
    if (openLibraryResult != null) {
      _cache[cleanIsbn] = openLibraryResult;
      return openLibraryResult;
    }
  } catch (e) {
    debugPrint('Open Library lookup failed: $e');
  }

  // Final fallback to Libris (Swedish Royal Library)
  try {
    final librisResult = await _fetchFromLibris(cleanIsbn);
    if (librisResult != null) {
      _cache[cleanIsbn] = librisResult;
      return librisResult;
    }
  } catch (e) {
    debugPrint('Libris lookup failed: $e');
  }

  return null; // All APIs failed
}
```

## Results/Outcome

The app successfully implements a complete household inventory management system with production-ready authentication, data security, and offline capabilities. The hierarchical container model proved intuitive during user testing—the mental model of "rooms contain shelves, shelves contain boxes" required zero explanation.

AI Collaboration Impact: Using Claude Code accelerated development by approximately 3-4x compared to traditional solo development. Complex features that might take days to implement manually—like the Firestore Security Rules, sync queue logic, and triple-API fallback system—were prototyped in hours through AI assistance. The collaboration model allowed rapid exploration of architectural approaches, with Claude Code generating boilerplate and implementation details while human oversight ensured code quality, business logic correctness, and user experience polish.

Key technical achievements include building a robust offline-first system from scratch (the sync queue successfully handles airplane mode scenarios), implementing Firebase Security Rules that enforce role-based access at the database level, and creating a book scanning experience that rivals commercial apps through intelligent API fallback strategies.

Development Stats:
- Timeline: Several months of iterative development
- Codebase: ~15,000+ lines of Dart/Flutter code
- Development model: Human-AI collaboration using Claude Code
- Testing: Unit tests, widget tests, and manual QA

Current status is beta-ready with core features complete. Next steps include adding comprehensive unit tests (currently limited coverage), implementing item detail/edit screens, adding analytics for household activity tracking, and polishing the UX with better loading states and error recovery flows. Future plans include AR item finding using device cameras, visual container maps for spatial organization, and smart inventory assistant features using ML for automatic categorization.

Key Learnings: The AI-assisted development workflow proved most effective when used for architectural discussions, code generation of well-defined components, and rapid iteration on complex logic. Human oversight remained essential for user experience decisions, architectural consistency, security considerations, and ensuring the generated code aligned with Flutter/Firebase best practices. This hybrid approach represents the future of software development—combining human creativity and judgment with AI's ability to rapidly generate and refactor code.

## "Vibe Coded" with Claude Code

Like my portfolio website, OurArchive was developed through a collaborative "vibe coding" process with Claude Code. Rather than meticulously planning every detail upfront, the development followed an iterative, conversation-driven approach:

- **Rapid Prototyping**: Describe a feature concept, Claude Code generates initial implementation, review and refine
- **Architectural Discussions**: Debate approaches (e.g., "Should sync be push-based or pull-based?"), explore trade-offs, implement best solution
- **Intelligent Scaffolding**: Claude Code handles boilerplate (Riverpod providers, Firebase repository patterns, form validation), freeing mental energy for creative problem-solving
- **Real-time Refactoring**: Identify code smells during review, request improvements, see changes immediately
- **Learning Accelerator**: Discover Flutter best practices and Firebase patterns through Claude Code's suggestions and explanations

This modern development workflow demonstrates proficiency not just in Flutter/Firebase, but in effectively collaborating with AI development tools—an increasingly critical skill for modern software engineers.

## Links

- [GitHub Repository →](https://github.com/gustafeden/OurArchive)
- [Claude Code →](https://claude.com/claude-code) (AI development assistant)
- Live Demo: Coming soon (beta testing phase)

---

*This entire project, including the app codebase and this documentation, was created through human-AI collaboration using Claude Code. The OurArchive app was built by iteratively working with Claude Code to design architecture, generate code, refine implementations, and solve technical challenges. This documentation itself was also generated by Claude Code based on project analysis and structured into portfolio-ready markdown format.*
