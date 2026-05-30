// class BooksRecommendationScreen extends ConsumerStatefulWidget {
//   const BooksRecommendationScreen({super.key});

//   @override
//   ConsumerState<BooksRecommendationScreen> createState() =>
//       _BooksRecommendationScreenState();
// }

// class _BooksRecommendationScreenState
//     extends ConsumerState<BooksRecommendationScreen> {
//   final TextEditingController _searchController = TextEditingController();
//   String _searchQuery = '';

//   /// Only update sidebar if Books is the active screen
//   void _syncSidebarSubNav(
//       List<BookSectionEntity> sections, int selectedIndex) {
//     if (!kIsWeb && !Responsive.isDesktop(context)) return;

//     WidgetsBinding.instance.addPostFrameCallback((_) {
//       if (!mounted) return;

//       final activeScreen = ref.read(activeScreenProvider);

//       // Guard: Only sync if Books owns the sidebar
//       if (activeScreen != SubNavOwner.books) {
//         return;
//       }

//       final current = ref.read(sidebarProvider);

//       final newItems = List.generate(
//         sections.length,
//         (i) => SidebarSubNavItem(
//           label: sections[i].title,
//           isSelected: i == selectedIndex,
//           onTap: () => ref.read(booksProvider.notifier).selectSection(i),
//         ),
//       );

//       // Skip update if nothing changed
//       final same = current.owner == SubNavOwner.books &&
//           current.items.length == newItems.length &&
//           current.items.asMap().entries.every((e) =>
//               e.value.label == newItems[e.key].label &&
//               e.value.isSelected == newItems[e.key].isSelected);

//       if (same) return;

//       ref.read(sidebarProvider.notifier).setSubNav(SubNavOwner.books, newItems);
//     });
//   }

//   @override
//   void initState() {
//     super.initState();
//     // Mark Books as the active screen
//     WidgetsBinding.instance.addPostFrameCallback((_) {
//       ref.read(activeScreenProvider.notifier).state = SubNavOwner.books;
//     });

//     final booksState = ref.read(booksProvider);
//     _syncSidebarSubNav(booksState.sections, booksState.selectedSectionIndex);
//   }

//   @override
//   void dispose() {
//     _searchController.dispose();
//     // Only clear if Books still owns the sub-nav
//     WidgetsBinding.instance.addPostFrameCallback((_) {
//       ref.read(sidebarProvider.notifier).clearSubNav(SubNavOwner.books);
//     });
//     super.dispose();
//   }

//   /// Filter sections by search query
//   List<BookSectionEntity> _filterSections(
//     List<BookSectionEntity> sections,
//     String query,
//   ) {
//     if (query.isEmpty) return sections;
//     final q = query.toLowerCase();
//     return sections
//         .map((section) => BookSectionEntity(
//               title: section.title,
//               bookInfo: section.bookInfo
//                   .where((b) =>
//                       b.bookTitle.toLowerCase().contains(q) ||
//                       b.bookAuthor.toLowerCase().contains(q) ||
//                       (b.bookDescription?.toLowerCase().contains(q) ?? false))
//                   .toList(),
//             ))
//         .where((s) => s.bookInfo.isNotEmpty)
//         .toList();
//   }

//   @override
//   Widget build(BuildContext context) {
//     final theme = Theme.of(context);
//     final booksState = ref.watch(booksProvider);
//     final isMobile = Responsive.isMobile(context);

//     final filteredSections =
//         _filterSections(booksState.sections, _searchQuery);

//     // Clamp selected index to filtered list
//     final safeIndex = booksState.selectedSectionIndex
//         .clamp(0, filteredSections.isEmpty ? 0 : filteredSections.length - 1);

//     final currentSection =
//         filteredSections.isEmpty ? null : filteredSections[safeIndex];

//     // Sync sidebar only once per stable state (not every build)
//     _syncSidebarSubNav(filteredSections, safeIndex);

//     return Scaffold(
//       backgroundColor: theme.colorScheme.surface,
//       body: !isMobile
//           ? _buildWebLayout(context, theme, booksState, filteredSections,
//               safeIndex, currentSection)
//           : _buildMobileLayout(
//               context, theme, booksState, filteredSections),
//     );
//   }

//   // ─── Web layout ──────────────────────────────────────────────────────────

//   Widget _buildWebLayout(
//     BuildContext context,
//     ThemeData theme,
//     BooksState booksState,
//     List<BookSectionEntity> filteredSections,
//     int safeIndex,
//     BookSectionEntity? currentSection,
//   ) {
//     return Column(
//       children: [
//         // ── Top bar ────────────────────────────────────────────────────────
//         Container(
//           padding: const EdgeInsets.fromLTRB(40, 32, 40, 16),
//           child: Row(
//             children: [
//               Expanded(
//                 child: Column(
//                   crossAxisAlignment: CrossAxisAlignment.start,
//                   children: [
//                     Text(
//                       currentSection?.title ?? 'Reading List',
//                       style: theme.textTheme.headlineSmall?.copyWith(
//                         fontWeight: FontWeight.w800,
//                         letterSpacing: -0.5,
//                       ),
//                     ),
//                     if (currentSection != null)
//                       Text(
//                         '${currentSection.bookInfo.length} books',
//                         style: theme.textTheme.bodySmall?.copyWith(
//                           color: theme.colorScheme.outline,
//                         ),
//                       ),
//                   ],
//                 ),
//               ),

//               // Search
//               SizedBox(
//                 width: 260,
//                 child: CustomSearchField(
//                   onChanged: (String p1) {
//                     setState(() {
//                       _searchQuery = p1;
//                     });
//                   },
//                   searchController: _searchController,
//                   hintText: "Search books...",
//                   searchQuery: _searchQuery,
//                   theme: theme,
//                   onPressed: (String p1) {
//                     setState(() => _searchQuery = '');
//                   },
//                 ),
//               ),

//               const SizedBox(width: 12),

//               // Sort
//               if (booksState.sections.isNotEmpty)
//                 PopupMenuButton<String>(
//                   onSelected: (v) =>
//                       ref.read(booksProvider.notifier).sort(v),
//                   icon: Icon(Icons.sort_rounded,
//                       color: theme.colorScheme.onSurface),
//                   itemBuilder: (_) => const [
//                     PopupMenuItem(
//                         value: 'rating', child: Text('Sort by Rating')),
//                     PopupMenuItem(
//                         value: 'year', child: Text('Sort by Year')),
//                     PopupMenuItem(
//                         value: 'pages', child: Text('Sort by Pages')),
//                   ],
//                 ),

//               IconButton(
//                 onPressed: () =>
//                     ref.read(booksProvider.notifier).fetch(),
//                 icon: Icon(Icons.refresh_rounded,
//                     color: theme.colorScheme.onSurface),
//               ),
//             ],
//           ),
//         ),

//         Divider(
//           height: 1,
//           color: theme.colorScheme.outlineVariant.withOpacity(0.4),
//         ),

//         // ── Body ───────────────────────────────────────────────────────────
//         Expanded(
//           child: booksState.isLoading
//               ? BuildLoading(
//                   message: 'Curating your reading list...',
//                   theme: theme,
//                 )
//               : booksState.error != null
//                   ? BuildError(
//                       theme: theme,
//                       message: 'Could not load news',
//                       error: booksState.error!,
//                       retry: () =>
//                           ref.read(booksProvider.notifier).fetch(),
//                       context: context,
//                     )
//                   : currentSection == null ||
//                           currentSection.bookInfo.isEmpty
//                       ? BuildEmpty(
//                           theme: theme,
//                           message: 'No books found',
//                         )
//                       : RefreshIndicator(
//                           onRefresh: () =>
//                               ref.read(booksProvider.notifier).fetch(),
//                           child: WebGridView(
//                             context: context,
//                             section: currentSection,
//                             theme: theme,
//                           ),
//                         ),
//         ),
//       ],
//     );
//   }

//   // ─── Mobile layout ────────────────────────────────────────────────────────

//   Widget _buildMobileLayout(
//     BuildContext context,
//     ThemeData theme,
//     BooksState booksState,
//     List<BookSectionEntity> filteredSections,
//   ) {
//     final isTablet = Responsive.isTablet(context);

//     return NestedScrollView(
//       headerSliverBuilder: (context, innerBoxIsScrolled) => [
//         // App bar
//         SliverAppBar(
//           expandedHeight: 100,
//           floating: true,
//           snap: true,
//           pinned: true,
//           backgroundColor: theme.colorScheme.surface,
//           surfaceTintColor: Colors.transparent,
//           elevation: 0,
//           flexibleSpace: FlexibleSpaceBar(
//             titlePadding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
//             title: Row(
//               crossAxisAlignment: CrossAxisAlignment.end,
//               children: [
//                 Expanded(
//                   child: Column(
//                     mainAxisAlignment: MainAxisAlignment.end,
//                     crossAxisAlignment: CrossAxisAlignment.start,
//                     children: [
//                       Text(
//                         'READING LIST',
//                         style: TextStyle(
//                           fontWeight: FontWeight.w900,
//                           letterSpacing: 2,
//                           fontSize: 16,
//                           color: theme.colorScheme.primary,
//                         ),
//                       ),
//                       Text(
//                         'Curated for your profession',
//                         style: theme.textTheme.labelSmall?.copyWith(
//                           color: theme.colorScheme.outline,
//                           fontSize: 10,
//                         ),
//                       ),
//                     ],
//                   ),
//                 ),
//                 if (booksState.sections.isNotEmpty)
//                   PopupMenuButton<String>(
//                     onSelected: (v) =>
//                         ref.read(booksProvider.notifier).sort(v),
//                     icon: Icon(Icons.sort_rounded,
//                         size: 20, color: theme.colorScheme.onSurface),
//                     itemBuilder: (_) => const [
//                       PopupMenuItem(
//                           value: 'rating', child: Text('Sort by Rating')),
//                       PopupMenuItem(
//                           value: 'year', child: Text('Sort by Year')),
//                       PopupMenuItem(
//                           value: 'pages', child: Text('Sort by Pages')),
//                     ],
//                   ),
//               ],
//             ),
//           ),
//         ),

//         // Search bar
//         SliverToBoxAdapter(
//           child: Padding(
//             padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
//             child: CustomSearchField(
//               onChanged: (String p1) {
//                 setState(() {
//                   _searchQuery = p1;
//                 });
//               },
//               searchController: _searchController,
//               hintText: "Search books...",
//               searchQuery: _searchQuery,
//               theme: theme,
//               onPressed: (String p1) {
//                 setState(() => _searchQuery = '');
//               },
//             ),
//           ),
//         ),
//       ],

//       // Scrollable body — sections with horizontal book scrolls
//       body: booksState.isLoading
//           ? BuildLoading(
//               message: 'Curating your reading list...',
//               theme: theme,
//             )
//           : booksState.error != null
//               ? BuildError(
//                   theme: theme,
//                   message: 'Could not load Books',
//                   error: booksState.error!,
//                   retry: () =>
//                       ref.read(booksProvider.notifier).fetch(),
//                   context: context,
//                 )
//               : filteredSections.isEmpty
//                   ? BuildEmpty(
//                       theme: theme,
//                       message: 'No books found',
//                     )
//                   : RefreshIndicator(
//                       onRefresh: () =>
//                           ref.read(booksProvider.notifier).fetch(),
//                       child: ListView.builder(
//                         padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
//                         itemCount: filteredSections.length,
//                         itemBuilder: (_, sectionIndex) {
//                           final section = filteredSections[sectionIndex];
//                           final visibleCount = isTablet ? 3 : 3;

//                           return Column(
//                             crossAxisAlignment: CrossAxisAlignment.start,
//                             children: [
//                               MobileSectionHeader(
//                                 theme: theme,
//                                 section: section,
//                                 context: context,
//                                 ref: ref,
//                               ),
//                               // Horizontal scroll
//                               SizedBox(
//                                 height: 200,
//                                 child: ListView.builder(
//                                   scrollDirection: Axis.horizontal,
//                                   itemCount: section.bookInfo.length
//                                       .clamp(0, visibleCount),
//                                   itemBuilder: (_, i) => SizedBox(
//                                     width: MediaQuery.of(context).size.width *
//                                         0.70,
//                                     child: Padding(
//                                       padding:
//                                           const EdgeInsets.only(right: 12),
//                                       child: BooksCard(
//                                           book: section.bookInfo[i]),
//                                     ),
//                                   ),
//                                 ),
//                               ),

//                               if (section.bookInfo.length > visibleCount)
//                                 TextButton.icon(
//                                   onPressed: () => Navigator.push(
//                                     context,
//                                     MaterialPageRoute(
//                                       builder: (_) =>
//                                           ShowMoreScreen(section: section),
//                                     ),
//                                   ),
//                                   icon: Icon(Icons.grid_view_rounded,
//                                       size: 16,
//                                       color: theme.colorScheme.primary),
//                                   label: Text(
//                                     'See all ${section.bookInfo.length} books',
//                                     style: TextStyle(
//                                         color: theme.colorScheme.primary,
//                                         fontSize: 13),
//                                   ),
//                                 ),
//                             ],
//                           );
//                         },
//                       ),
//                     ),
//     );
//   }
// }

// class ShowMoreScreen extends StatelessWidget {
//   final BookSectionEntity section;
//   const ShowMoreScreen({super.key, required this.section});

//   @override
//   Widget build(BuildContext context) {
//     final theme = Theme.of(context);
//     final crossAxisCount = Responsive.gridCrossAxisCount(context);

//     return Scaffold(
//       appBar: AppBar(
//         title: Text(section.title),
//         backgroundColor: theme.colorScheme.surface,
//         surfaceTintColor: Colors.transparent,
//         elevation: 0,
//       ),
//       body: Center(
//         child: ConstrainedBox(
//           constraints: BoxConstraints(
//             maxWidth: Responsive.contentMaxWidth(context),
          
//           ),
//           child: GridView.builder(
//             padding: Responsive.pagePadding(context),
//             itemCount: section.bookInfo.length,
//             gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
//               crossAxisCount: crossAxisCount,
//               childAspectRatio:
//                   crossAxisCount == 1 ? 2.0 : 2.2,
//               crossAxisSpacing: 16,
//               mainAxisSpacing: 16,
//             ),
//             itemBuilder: (_, i) =>
//                 BooksCard(book: section.bookInfo[i]),
//           ),
//         ),
//       ),
//     );
//   }
// }

// class BooksCard extends StatelessWidget {
//   final BookEntity book;
//   const BooksCard({super.key, required this.book});

//   @override
//   Widget build(BuildContext context) {
//     final theme = Theme.of(context);
//     final isDesktop = Responsive.isDesktop(context);
//     // Narrower image on desktop since cards are in a grid
//     final imageWidth = isDesktop ? 150.0 : 100.0;
//     print(isDesktop);

//     return GestureDetector(
//       onTap: () =>
//        Navigator.push(
//         context,
//         MaterialPageRoute(
//           builder: (_) => BookChatScreen(
//             bookTitle: book.bookTitle,
//             bookDescription: book.bookDescription,
//             bookCover: book.bookCover,
//           ),
//         ),
//       ),
//       child: Container(
//         margin: const EdgeInsets.symmetric(vertical: 4),
//         decoration: BoxDecoration(
//           color: theme.colorScheme.surface,
//           borderRadius: BorderRadius.circular(16),
//           border: Border.all(
//               color: theme.colorScheme.outlineVariant.withOpacity(0.5)),
//           boxShadow: [
//             BoxShadow(
//               color: Colors.black.withOpacity(0.05),
//               blurRadius: 10,
//               offset: const Offset(0, 3),
//             ),
//           ],
//         ),
//         child: Row(
//           children: [
//             // Cover
//             ClipRRect(
//               borderRadius:
//                   const BorderRadius.horizontal(left: Radius.circular(16)),
//               child: book.bookCover != null
//                   ? Image.network(
//                       book.bookCover!,
//                       webHtmlElementStrategy:kIsWeb? WebHtmlElementStrategy.prefer:WebHtmlElementStrategy.never,
//                       width: imageWidth,
//                       height: double.infinity,
//                       fit: BoxFit.cover,
//                       errorBuilder: (_, __, ___) =>
//                           _placeholder(theme, imageWidth),
//                     )
//                   : _placeholder(theme, imageWidth),
//             ),

//             // Details
//             Expanded(
//               child: Padding(
//                 padding: EdgeInsets.all(isDesktop ? 10 : 12),
//                 child: Column(
//                   crossAxisAlignment: CrossAxisAlignment.start,
//                   mainAxisAlignment: MainAxisAlignment.spaceEvenly,
//                   children: [
//                     Text(
//                       book.bookTitle,
//                       style: theme.textTheme.titleSmall?.copyWith(
//                         fontWeight: FontWeight.w700,
//                         height: 1.2,
//                         fontSize: isDesktop ? 13 : null,
//                       ),
//                       maxLines: 2,
//                       overflow: TextOverflow.ellipsis,
//                     ),
//                     Text(
//                       'By ${book.bookAuthor}',
//                       style: theme.textTheme.bodySmall?.copyWith(
//                         color: theme.colorScheme.primary,
//                         fontWeight: FontWeight.w500,
//                         fontSize: isDesktop ? 11 : null,
//                       ),
//                       maxLines: 1,
//                       overflow: TextOverflow.ellipsis,
//                     ),
//                     if (book.bookDescription != null)
//                       Text(
//                         book.bookDescription!,
//                         style: theme.textTheme.bodySmall?.copyWith(
//                           color: theme.colorScheme.onSurfaceVariant,
//                           height: 1.4,
//                           fontSize: isDesktop ? 11 : null,
//                         ),
//                         maxLines: 2,
//                         overflow: TextOverflow.ellipsis,
//                       ),
//                     CustomStarRating(value: book.starRating ?? 0),
//                     Row(
//                       children: [
//                         Icon(
//                           Icons.visibility,
//                           //Icons.chat_bubble_outline_rounded,
//                             size: 11, color: theme.colorScheme.outline),
//                         const SizedBox(width: 3),
//                         Text(
//                           '${book.numberOfReviews}',
//                           style: theme.textTheme.labelSmall?.copyWith(
//                               color: theme.colorScheme.outline,
//                               fontSize: isDesktop ? 10 : null),
//                         ),
//                         const Spacer(),
//                         Icon(
//                           Icons.menu_book,

//                           //Icons.auto_stories_rounded,
//                             size: 11, color: theme.colorScheme.tertiary),
//                         const SizedBox(width: 3),
//                         Text(
//                           '${book.bookPageCount ?? '?'} ',
//                           style: theme.textTheme.labelSmall?.copyWith(
//                               fontSize: isDesktop ? 10 : null),
//                         ),
//                         const SizedBox(width: 10),
//                         Icon(
//                          Icons.calendar_today,

//                           //Icons.auto_stories_rounded,
//                             size: 11, color: theme.colorScheme.tertiary),
//                         const SizedBox(width: 3),
//                         Text(
//                           '${book.bookYear ?? ''}',
//                           style: theme.textTheme.labelSmall?.copyWith(
//                             fontWeight: FontWeight.w700,
//                             fontSize: isDesktop ? 10 : null,
//                           ),
                          
//                         ),
//                         const SizedBox(width: 3),
//                       ],
//                     ),
//                   ],
//                 ),
//               ),
//             ),


//           ],
//         ),
//       ),
//     );
//   }

//   Widget _placeholder(ThemeData theme, double width) => Container(
//         width: width,
//         color: theme.colorScheme.surfaceVariant,
//         child:
//             Icon(Icons.book_rounded, color: theme.colorScheme.outline, size: 28),
//       );
// }

// class MobileSectionHeader extends StatelessWidget {
//  final ThemeData theme;
//    final BookSectionEntity section;
//    final  BuildContext context;
//    final WidgetRef ref;
//   const MobileSectionHeader({super.key, required this.theme, required this.section, required this.context,required this.ref});

//   @override
//   Widget build(BuildContext context) =>Padding(
//       padding: const EdgeInsets.fromLTRB(0, 20, 0, 12),
//       child: Row(
//         children: [
//           Container(
//             width: 4,
//             height: 20,
//             decoration: BoxDecoration(
//               color: theme.colorScheme.primary,
//               borderRadius: BorderRadius.circular(2),
//             ),
//           ),
//           const SizedBox(width: 10),
//           Expanded(
//             child: Text(
//               section.title,
//               style: theme.textTheme.titleMedium
//                   ?.copyWith(fontWeight: FontWeight.w700),
//             ),
//           ),
//           Text(
//             '${section.bookInfo.length} books',
//             style: theme.textTheme.labelSmall
//                 ?.copyWith(color: theme.colorScheme.outline),
//           ),
//         ],
//       ),
//     );
// }
// class WebGridView extends StatelessWidget {
//   final  BuildContext context;
//   final   ThemeData theme;
//   final  BookSectionEntity section;
//     const WebGridView({super.key,required this.context,required this.section,required this.theme});

//   @override
//   Widget build(BuildContext context) =>GridView.builder(
//       padding: const EdgeInsets.fromLTRB(40, 24, 40, 40),
//       gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
//         crossAxisCount: 2,
//         // Books cards are horizontal so use a wide aspect ratio
//         childAspectRatio: 2.2,
//         crossAxisSpacing: 20,
//         mainAxisSpacing: 20,
//       ),
//       itemCount: section.bookInfo.length,
//       itemBuilder: (_, i) => BooksCard(book: section.bookInfo[i]),
//     );
// }

// class MainChatScreen extends ConsumerStatefulWidget {

//   const MainChatScreen({super.key});

//   @override
//   ConsumerState<MainChatScreen> createState() => _MainChatScreenState();
// }

// class _MainChatScreenState extends ConsumerState<MainChatScreen> {
//   final TextEditingController _controller = TextEditingController();
//   final ScrollController _scrollController = ScrollController();


//   void _scrollToBottom() {
//     if (_scrollController.hasClients) {
//       _scrollController.animateTo(
//         _scrollController.position.maxScrollExtent,
//         duration: const Duration(milliseconds: 300),
//         curve: Curves.easeOut,
//       );
//     }
//   }

//   void _sendMessage() {
//     final text = _controller.text.trim();
//     if (text.isEmpty) return;
//     _controller.clear();
//    // ref.read(chatbotProvider.notifier).addNewMessage(Message(text: text, isUser: true, timestamp: DateTime.now()));
//     ref.read(chatbotProvider.notifier).sendUserMessage(
//   Message(
//     text: text,
//     isUser: true,
//     timestamp: DateTime.now(),
//   ),
// );
//     _scrollToBottom();
//   }

//   @override
// Widget build(BuildContext context) {
//   final chatState = ref.watch(chatbotProvider);
//   final theme = Theme.of(context);

//   return Scaffold(
//     appBar: AppBar(title: const Text("AI Consultation")),
//     body: Column(
//       children: [
//         Expanded(
//           child: chatState.when(
//             data: (chatStateValue) {
//               if (chatStateValue.messages.isNotEmpty) {
//                 WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());

//                 return ListView.builder(
//                   controller: _scrollController,
//                   padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
//                   itemCount: chatStateValue.messages.length + (chatStateValue.isTyping ? 1 : 0),
//                   itemBuilder: (_, i) {
//                     if (i == chatStateValue.messages.length && chatStateValue.isTyping) {
//                       return _buildTypingIndicator(theme);
//                     }
//                     return _buildMessageBubble(chatStateValue.messages[i], theme);
//                   },
//                 );
//               } else {
//                 return const IntroChatScreen();
//               }
//             },
//             loading: () => const Center(child: CircularProgressIndicator()),
//             error: (err, stack) => Center(child: Text("Error: $err")),
//           ),
//         ),

//         // if (chatState.isTyping) const LinearProgressIndicator(),

//         _buildInputBar(theme),
//       ],
//     ),
//   );
// }
  

//   // --- Extracted Chat Bubble Widget ---
//   Widget _buildChatBubble(Message msg) {
//     return Padding(
//       padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
//       child: Row(
//         mainAxisAlignment: msg.isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
//         crossAxisAlignment: CrossAxisAlignment.end,
//         children: [
//           if (!msg.isUser)
//             Padding(
//               padding: const EdgeInsets.only(right: 8, bottom: 4),
//               child: CircleAvatar(
//                 radius: 16,
//                 backgroundColor: Colors.transparent,
//                 child: Image.asset('assets/images/chat.png'),
//               ),
//             ),
//           Flexible(
//             child: Container(
//               padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
//               decoration: BoxDecoration(
//                 color: msg.isUser
//                     ? Theme.of(context).colorScheme.primary
//                     : Theme.of(context).colorScheme.surfaceVariant,
//                 borderRadius: BorderRadius.only(
//                   topLeft: const Radius.circular(16),
//                   topRight: const Radius.circular(16),
//                   bottomLeft: Radius.circular(msg.isUser ? 16 : 0),
//                   bottomRight: Radius.circular(msg.isUser ? 0 : 16),
//                 ),
//               ),
//               child: Text(
//                 msg.text,
//                 style: TextStyle(
//                   color: msg.isUser ? Colors.white : Colors.black87,
//                   fontSize: 15,
//                 ),
//               ),
//             ),
//           ),
//           if (msg.isUser)
//             Padding(
//               padding: const EdgeInsets.only(left: 8, bottom: 4),
//               child: CircleAvatar(
//                 radius: 16,
//                 backgroundColor: Theme.of(context).colorScheme.primaryContainer,
//                 child: const Icon(Icons.person_rounded, size: 18),
//               ),
//             ),
//         ],
//       ),
//     );
//   }



//   // ─── Message bubble ───────────────────────────────────────────────────────

//   Widget _buildMessageBubble(Message msg, ThemeData theme) {
//     final isUser = msg.isUser;

//     return Padding(
//       padding: const EdgeInsets.only(bottom: 12),
//       child: Row(
//         mainAxisAlignment:
//             isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
//         crossAxisAlignment: CrossAxisAlignment.end,
//         children: [
//           // AI avatar
//           if (!isUser)
//             Container(
//               width: 32,
//               height: 32,
//               margin: const EdgeInsets.only(right: 8, bottom: 2),
//               decoration: BoxDecoration(
//                 gradient: LinearGradient(
//                   colors: [
//                     theme.colorScheme.primary,
//                     theme.colorScheme.tertiary,
//                   ],
//                 ),
//                 shape: BoxShape.circle,
//               ),
//               child: const Icon(
//                 Icons.auto_awesome_rounded,
//                 size: 16,
//                 color: Colors.white,
//               ),
//             ),

//           // Bubble
//           Flexible(
//             child: Container(
//               padding: const EdgeInsets.symmetric(
//                 horizontal: 16,
//                 vertical: 12,
//               ),
//               decoration: BoxDecoration(
//                 color: isUser
//                     ? theme.colorScheme.primary
//                     : theme.colorScheme.surfaceVariant,
//                 borderRadius: BorderRadius.only(
//                   topLeft: const Radius.circular(18),
//                   topRight: const Radius.circular(18),
//                   bottomLeft: Radius.circular(isUser ? 18 : 4),
//                   bottomRight: Radius.circular(isUser ? 4 : 18),
//                 ),
//                 boxShadow: [
//                   BoxShadow(
//                     color: Colors.black.withOpacity(0.04),
//                     blurRadius: 8,
//                     offset: const Offset(0, 2),
//                   ),
//                 ],
//               ),
//               child: Text(
//                 msg.text,
//                 style: theme.textTheme.bodyMedium?.copyWith(
//                   color: isUser
//                       ? Colors.white
//                       : theme.colorScheme.onSurfaceVariant,
//                   height: 1.5,
//                 ),
//               ),
//             ),
//           ),

//           // User avatar
//           if (isUser)
//             Container(
//               width: 32,
//               height: 32,
//               margin: const EdgeInsets.only(left: 8, bottom: 2),
//               decoration: BoxDecoration(
//                 color: theme.colorScheme.primaryContainer,
//                 shape: BoxShape.circle,
//               ),
//               child: Icon(
//                 Icons.person_rounded,
//                 size: 18,
//                 color: theme.colorScheme.primary,
//               ),
//             ),
//         ],
//       ),
//     );
//   }

//   // ─── Typing indicator ─────────────────────────────────────────────────────

//   Widget _buildTypingIndicator(ThemeData theme) {
//     return Padding(
//       padding: const EdgeInsets.only(bottom: 12),
//       child: Row(
//         children: [
//           Container(
//             width: 32,
//             height: 32,
//             margin: const EdgeInsets.only(right: 8),
//             decoration: BoxDecoration(
//               gradient: LinearGradient(
//                 colors: [
//                   theme.colorScheme.primary,
//                   theme.colorScheme.tertiary,
//                 ],
//               ),
//               shape: BoxShape.circle,
//             ),
//             child: const Icon(
//               Icons.auto_awesome_rounded,
//               size: 16,
//               color: Colors.white,
//             ),
//           ),
//           Container(
//             padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
//             decoration: BoxDecoration(
//               color: theme.colorScheme.surfaceVariant,
//               borderRadius: const BorderRadius.only(
//                 topLeft: Radius.circular(18),
//                 topRight: Radius.circular(18),
//                 bottomRight: Radius.circular(18),
//                 bottomLeft: Radius.circular(4),
//               ),
//             ),
//             child: Row(
//               mainAxisSize: MainAxisSize.min,
//               children: List.generate(3, (i) => 
//               Dot(delay: i * 200,)
//               // _Dot(delay: i * 200)),
//             ),
//           ),
//       )
//       ],
//       ),
//     );
//   }


// // ─── Input bar ────────────────────────────────────────────────────────────

//   Widget _buildInputBar(ThemeData theme) {
//     return Container(
//       padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
//       decoration: BoxDecoration(
//         color: theme.colorScheme.surface,
//         border: Border(
//           top: BorderSide(
//             color: theme.colorScheme.outlineVariant.withOpacity(0.5),
//           ),
//         ),
//       ),
//       child: Row(
//         children: [
//           Expanded(
//             child: TextField(
//               controller: _controller,
//               maxLines: 4,
//               minLines: 1,
//               textInputAction: TextInputAction.send,
//               onSubmitted: (_) => _sendMessage(),
//               style: theme.textTheme.bodyMedium,
//               decoration: InputDecoration(
//                 hintText: 'Ask about ...',
//                 hintStyle: TextStyle(
//                   color: theme.colorScheme.outline,
//                   fontSize: 14,
//                 ),
//                 filled: true,
//                 fillColor:
//                     theme.colorScheme.surfaceVariant.withOpacity(0.5),
//                 border: OutlineInputBorder(
//                   borderRadius: BorderRadius.circular(24),
//                   borderSide: BorderSide.none,
//                 ),
//                 contentPadding: const EdgeInsets.symmetric(
//                   horizontal: 20,
//                   vertical: 12,
//                 ),
//               ),
//             ),
//           ),
//           const SizedBox(width: 10),
//           Consumer(
//   builder: (_, ref, __) {
//     final chatAsync = ref.watch(chatbotProvider);

//     final isTyping = chatAsync.maybeWhen(
//       data: (data) => data.isTyping,
//       orElse: () => false,
//     );

//     return AnimatedContainer(
//       duration: const Duration(milliseconds: 200),
//       child: FloatingActionButton.small(
//         onPressed: isTyping ? null : _sendMessage,
//         backgroundColor: isTyping
//             ? theme.colorScheme.surfaceVariant
//             : theme.colorScheme.primary,
//         elevation: 0,
//         child: Icon(
//           isTyping
//               ? Icons.hourglass_top_rounded
//               : Icons.send_rounded,
//           size: 18,
//           color: isTyping
//               ? theme.colorScheme.outline
//               : Colors.white,
//         ),
//       ),
//     );
//   },
// ),
//         ],
//       ),
//     );
//   }
// }
// class IntroChatScreen extends StatelessWidget {
//   const IntroChatScreen({super.key});



//   @override
//   Widget build(BuildContext context) {
//     return Align(
//           alignment: Alignment.center,
//           child: Column(
//             mainAxisAlignment: MainAxisAlignment.center,
//             crossAxisAlignment: .center,

//             children: [

//               Image.asset('assets/images/chat.png', height: 150), // Ensure path is in pubspec.yaml
//               const SizedBox(height: 24),
//               Text("Professional AI Assistant", style: Theme.of(context).textTheme.headlineMedium),
//               const Padding(
//                 padding: EdgeInsets.symmetric(horizontal: 40, vertical: 10),
//                 child: Text("How can I help you with your professional tasks today?", textAlign: TextAlign.center),
//               ),

//             ],
//           ),
//         );
//   }
// }

// class ChatInputField extends StatelessWidget {
//   final TextEditingController controller;
//   final VoidCallback onSend;

//   const ChatInputField({super.key, required this.controller, required this.onSend});

//   @override
//   Widget build(BuildContext context) {
//     return Padding(
//       padding: const EdgeInsets.all(16.0),
//       child: Row(
//         children: [
//           Expanded(
//             child: TextField(
//               controller: controller,
//               decoration: InputDecoration(
//                 hintText: "Type your query...",
//                 border: OutlineInputBorder(borderRadius: BorderRadius.circular(30)),
//                 filled: true,
//               ),
//             ),
//           ),
//           const SizedBox(width: 8),
//           CircleAvatar(
//             backgroundColor: Theme.of(context).colorScheme.primary,
//             child: IconButton(
//               icon: const Icon(Icons.send, color: Colors.white),
//               onPressed: onSend,
//             ),
//           )
//         ],
//       ),
//     );
//   }
// }
// class Dot extends StatefulWidget {
//   final int delay;
//   const Dot({required this.delay});

//   @override
//   State<Dot> createState() => _DotState();
// }

// class _DotState extends State<Dot> with SingleTickerProviderStateMixin {
//   late AnimationController _ctrl;
//   late Animation<double> _anim;

//   @override
//   void initState() {
//     super.initState();
//     _ctrl = AnimationController(
//       vsync: this,
//       duration: const Duration(milliseconds: 600),
//     );
//     Future.delayed(Duration(milliseconds: widget.delay), () {
//       if (mounted) _ctrl.repeat(reverse: true);
//     });
//     _anim = Tween<double>(begin: 0, end: -6).animate(
//       CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut),
//     );
//   }

//   @override
//   void dispose() {
//     _ctrl.dispose();
//     super.dispose();
//   }

//   @override
//   Widget build(BuildContext context) {
//     return AnimatedBuilder(
//       animation: _anim,
//       builder: (_, __) => Transform.translate(
//         offset: Offset(0, _anim.value),
//         child: Container(
//           width: 7,
//           height: 7,
//           margin: const EdgeInsets.symmetric(horizontal: 2),
//           decoration: BoxDecoration(
//             color: Theme.of(context).colorScheme.outline,
//             shape: BoxShape.circle,
//           ),
//         ),
//       ),
//     );
//   }
// }

// class JobsScreen extends ConsumerStatefulWidget {
//   const JobsScreen({super.key});

//   @override
//   ConsumerState<JobsScreen> createState() => _JobsScreenState();
// }

// class _JobsScreenState extends ConsumerState<JobsScreen> {
//   @override
//   void initState() {
//     super.initState();
//     WidgetsBinding.instance.addPostFrameCallback((_) {
//       ref.read(jobsProvider.notifier).fetch();
//     });
//   }

//   void _openJob(JobEntity job) async {
//     final uri = Uri.parse(job.url);
//     await launchUrl(uri, mode: LaunchMode.externalApplication);
//   }

//   @override
//   Widget build(BuildContext context) {
//     final theme = Theme.of(context);
//     final jobsState = ref.watch(jobsProvider);

//     return Scaffold(
//       backgroundColor: theme.colorScheme.surface,
//       appBar: AppBar(
//         backgroundColor: theme.colorScheme.surface,
//         surfaceTintColor: Colors.transparent,
//         elevation: 0,
//         title: Column(
//           crossAxisAlignment: CrossAxisAlignment.start,
//           children: [
//             Text(
//               'JOB SEARCH',
//               style: TextStyle(
//                 fontWeight: FontWeight.w900,
//                 letterSpacing: 2,
//                 fontSize: 16,
//                 color: theme.colorScheme.primary,
//               ),
//             ),
//             Text(
//               'Matched to your CV profile',
//               style: theme.textTheme.labelSmall
//                   ?.copyWith(color: theme.colorScheme.outline),
//             ),
//           ],
//         ),
//         actions: [
//           IconButton(
//             onPressed: () => ref.read(jobsProvider.notifier).fetch(),
//             icon: Icon(Icons.refresh_rounded,
//                 color: theme.colorScheme.onSurface),
//           ),
//         ],
//       ),
//       body: jobsState.profileRequired
//           ? _buildProfileRequired(theme)
//           : jobsState.isLoading
//               ? _buildLoading(theme)
//               : jobsState.error != null
//                   ? _buildError(theme, jobsState.error!)
//                   : jobsState.sections.isEmpty
//                       ? _buildEmpty(theme)
//                       : _buildJobList(theme, jobsState.sections),
//     );
//   }

//   Widget _buildProfileRequired(ThemeData theme) {
//     return Center(
//       child: Padding(
//         padding: const EdgeInsets.all(32),
//         child: Column(
//           mainAxisSize: MainAxisSize.min,
//           children: [
//             Container(
//               padding: const EdgeInsets.all(24),
//               decoration: BoxDecoration(
//                 color: theme.colorScheme.primaryContainer.withOpacity(0.3),
//                 shape: BoxShape.circle,
//               ),
//               child: Icon(
//                 Icons.upload_file_rounded,
//                 size: 48,
//                 color: theme.colorScheme.primary,
//               ),
//             ),
//             const SizedBox(height: 20),
//             Text(
//               'Upload Your CV First',
//               style: theme.textTheme.titleMedium
//                   ?.copyWith(fontWeight: FontWeight.w700),
//             ),
//             const SizedBox(height: 8),
//             Text(
//               'To access personalised job recommendations, upload your CV so our AI can match you with relevant opportunities.',
//               textAlign: TextAlign.center,
//               style: theme.textTheme.bodySmall?.copyWith(
//                 color: theme.colorScheme.onSurfaceVariant,
//                 height: 1.5,
//               ),
//             ),
//             const SizedBox(height: 24),
//             FilledButton.icon(
//               onPressed: () =>
//                   Navigator.pushNamed(context, '/add-cv'),
//               icon: const Icon(Icons.upload_rounded, size: 18),
//               label: const Text('Upload CV'),
//             ),
//           ],
//         ),
//       ),
//     );
//   }

//   Widget _buildJobList(
//       ThemeData theme, List<JobSectionEntity> sections) {
//     return ListView.builder(
//       padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
//       itemCount: sections.fold(
//           0, (sum, s) => (sum)! + s.jobs.length + 1), // +1 for header
//       itemBuilder: (_, globalIndex) {
//         // Flatten sections into a single list with headers
//         int cursor = 0;
//         for (final section in sections) {
//           if (globalIndex == cursor) {
//             return _buildSectionHeader(theme, section.category,
//                 section.jobs.length);
//           }
//           cursor++;
//           for (final job in section.jobs) {
//             if (globalIndex == cursor) {
//               return _buildJobCard(theme, job);
//             }
//             cursor++;
//           }
//         }
//         return const SizedBox.shrink();
//       },
//     );
//   }

//   Widget _buildSectionHeader(
//       ThemeData theme, String category, int count) {
//     return Padding(
//       padding: const EdgeInsets.fromLTRB(0, 20, 0, 12),
//       child: Row(
//         children: [
//           Container(
//             width: 4,
//             height: 20,
//             decoration: BoxDecoration(
//               color: theme.colorScheme.primary,
//               borderRadius: BorderRadius.circular(2),
//             ),
//           ),
//           const SizedBox(width: 10),
//           Expanded(
//             child: Text(
//               category,
//               style: theme.textTheme.titleMedium
//                   ?.copyWith(fontWeight: FontWeight.w700),
//             ),
//           ),
//           Text(
//             '$count jobs',
//             style: theme.textTheme.labelSmall
//                 ?.copyWith(color: theme.colorScheme.outline),
//           ),
//         ],
//       ),
//     );
//   }

//   Widget _buildJobCard(ThemeData theme, JobEntity job) {
//     return GestureDetector(
//       onTap: () => _openJob(job),
//       child: Container(
//         margin: const EdgeInsets.only(bottom: 12),
//         padding: const EdgeInsets.all(16),
//         decoration: BoxDecoration(
//           color: theme.colorScheme.surface,
//           borderRadius: BorderRadius.circular(16),
//           border: Border.all(
//             color: theme.colorScheme.outlineVariant.withOpacity(0.5),
//           ),
//           boxShadow: [
//             BoxShadow(
//               color: Colors.black.withOpacity(0.04),
//               blurRadius: 10,
//               offset: const Offset(0, 3),
//             ),
//           ],
//         ),
//         child: Column(
//           crossAxisAlignment: CrossAxisAlignment.start,
//           children: [
//             Row(
//               children: [
//                 Expanded(
//                   child: Text(
//                     job.jobTitle,
//                     style: theme.textTheme.titleSmall?.copyWith(
//                       fontWeight: FontWeight.w700,
//                       height: 1.2,
//                     ),
//                     maxLines: 2,
//                     overflow: TextOverflow.ellipsis,
//                   ),
//                 ),
//                 if (job.isRemote)
//                   Container(
//                     padding: const EdgeInsets.symmetric(
//                         horizontal: 8, vertical: 3),
//                     decoration: BoxDecoration(
//                       color: Colors.green.withOpacity(0.12),
//                       borderRadius: BorderRadius.circular(6),
//                     ),
//                     child: Text(
//                       'REMOTE',
//                       style: theme.textTheme.labelSmall?.copyWith(
//                         color: Colors.green[700],
//                         fontWeight: FontWeight.w700,
//                         fontSize: 9,
//                       ),
//                     ),
//                   ),
//               ],
//             ),
//             const SizedBox(height: 6),
//             Text(
//               job.company,
//               style: theme.textTheme.bodySmall?.copyWith(
//                 color: theme.colorScheme.primary,
//                 fontWeight: FontWeight.w600,
//               ),
//             ),
//             const SizedBox(height: 8),
//             Row(
//               children: [
//                 Icon(Icons.location_on_outlined,
//                     size: 13, color: theme.colorScheme.outline),
//                 const SizedBox(width: 4),
//                 Text(
//                   job.location,
//                   style: theme.textTheme.labelSmall
//                       ?.copyWith(color: theme.colorScheme.outline),
//                 ),
//                 if (job.salary != null) ...[
//                   const SizedBox(width: 16),
//                   Icon(Icons.attach_money_rounded,
//                       size: 13, color: theme.colorScheme.outline),
//                   const SizedBox(width: 2),
//                   Text(
//                     job.salary!,
//                     style: theme.textTheme.labelSmall?.copyWith(
//                       color: theme.colorScheme.outline,
//                     ),
//                   ),
//                 ],
//                 const Spacer(),
//                 Icon(Icons.arrow_forward_rounded,
//                     size: 14, color: theme.colorScheme.primary),
//               ],
//             ),
//             if (job.description != null) ...[
//               const SizedBox(height: 8),
//               Text(
//                 job.description!,
//                 style: theme.textTheme.bodySmall?.copyWith(
//                   color: theme.colorScheme.onSurfaceVariant,
//                   height: 1.4,
//                 ),
//                 maxLines: 2,
//                 overflow: TextOverflow.ellipsis,
//               ),
//             ],
//           ],
//         ),
//       ),
//     );
//   }

//   Widget _buildLoading(ThemeData theme) => Center(
//         child: Column(
//           mainAxisSize: MainAxisSize.min,
//           children: [
//             CircularProgressIndicator(
//                 color: theme.colorScheme.primary, strokeWidth: 2),
//             const SizedBox(height: 16),
//             Text('Finding jobs for you...',
//                 style: theme.textTheme.bodySmall
//                     ?.copyWith(color: theme.colorScheme.outline)),
//           ],
//         ),
//       );

//   Widget _buildError(ThemeData theme, String error) => Center(
//         child: Padding(
//           padding: const EdgeInsets.all(32),
//           child: Column(
//             mainAxisSize: MainAxisSize.min,
//             children: [
//               Icon(Icons.wifi_off_rounded,
//                   size: 40, color: theme.colorScheme.error),
//               const SizedBox(height: 16),
//               Text(error,
//                   textAlign: TextAlign.center,
//                   style: theme.textTheme.bodySmall),
//               const SizedBox(height: 16),
//               FilledButton(
//                 onPressed: () => ref.read(jobsProvider.notifier).fetch(),
//                 child: const Text('Retry'),
//               ),
//             ],
//           ),
//         ),
//       );

//   Widget _buildEmpty(ThemeData theme) => Center(
//         child: Column(
//           mainAxisSize: MainAxisSize.min,
//           children: [
//             Icon(Icons.work_off_rounded,
//                 size: 48, color: theme.colorScheme.outline),
//             const SizedBox(height: 16),
//             Text('No jobs found',
//                 style: theme.textTheme.titleMedium
//                     ?.copyWith(color: theme.colorScheme.outline)),
//           ],
//         ),
//       );
// }

// class NewsScreen extends ConsumerStatefulWidget {
//   const NewsScreen({super.key});

//   @override
//   ConsumerState<NewsScreen> createState() => _NewsScreenState();
// }

// class _NewsScreenState extends ConsumerState<NewsScreen> {
//   final TextEditingController _searchController = TextEditingController();
//   String _searchQuery = '';

//   /// Only update sidebar if News is the active screen
//   void _syncSidebarSubNav(List<String> tabLabels, int safeTabIndex) {
//     if (!kIsWeb && !Responsive.isDesktop(context)) return;

//     WidgetsBinding.instance.addPostFrameCallback((_) {
//       if (!mounted) return;

//       final activeScreen = ref.read(activeScreenProvider);
      
//       // Guard: Only sync if News owns the sidebar
//       if (activeScreen != SubNavOwner.news) {
//         return;
//       }

//       final current = ref.read(sidebarProvider);

//       final newItems = List.generate(
//         tabLabels.length,
//         (i) => SidebarSubNavItem(
//           label: tabLabels[i],
//           isSelected: i == safeTabIndex,
//           onTap: () => ref.read(newsTabIndexProvider.notifier).state = i,
//         ),
//       );

//       // Skip update if nothing changed
//       final same = current.owner == SubNavOwner.news &&
//           current.items.length == newItems.length &&
//           current.items.asMap().entries.every((e) =>
//               e.value.label == newItems[e.key].label &&
//               e.value.isSelected == newItems[e.key].isSelected);

//       if (same) return;

//       ref.read(sidebarProvider.notifier).setSubNav(SubNavOwner.news, newItems);
//     });
//   }

//   @override
//   void initState() {
//     super.initState();
//     // Mark News as the active screen
//     WidgetsBinding.instance.addPostFrameCallback((_) {
//       ref.read(activeScreenProvider.notifier).state = SubNavOwner.news;
//     });

//     final newsState = ref.read(newsProvider);
//     _syncSidebarSubNav(
//       newsState.sections.map((s) => s.sectionHeading).toList(),
//       newsState.selectedSectionIndex ?? 0,
//     );
//   }

//   @override
//   void dispose() {
//     _searchController.dispose();
//     // Only clear if News still owns the sub-nav
//     WidgetsBinding.instance.addPostFrameCallback((_) {
//       ref.read(sidebarProvider.notifier).clearSubNav(SubNavOwner.news);
//     });
//     super.dispose();
//   }

//   void _openArticle(NewsArticleEntity article) async {
//     if (kIsWeb) {
//       final uri = Uri.parse(article.newsUrl);
//       await launchUrl(uri, mode: LaunchMode.externalApplication);
//     } else {
//       Navigator.push(
//         context,
//         MaterialPageRoute(
//           builder: (_) => NewsWebviewScreen(
//             url: article.newsUrl,
//             title: article.newsTitle,
//             source: article.newsSource,
//           ),
//         ),
//       );
//     }
//   }

//   List<NewsSectionEntity> _filterSections(
//     List<NewsSectionEntity> sections,
//     String query,
//   ) {
//     if (query.isEmpty) return sections;
//     final q = query.toLowerCase();
//     return sections
//         .map((section) => NewsSectionEntity(
//               sectionHeading: section.sectionHeading,
//               content: section.content
//                   .where((a) =>
//                       a.newsTitle.toLowerCase().contains(q) ||
//                       a.newsSummary.toLowerCase().contains(q) ||
//                       a.newsSource.toLowerCase().contains(q) ||
//                       a.newsCategory.any((c) => c.toLowerCase().contains(q)))
//                   .toList(),
//             ))
//         .where((s) => s.content.isNotEmpty)
//         .toList();
//   }

//   @override
//   Widget build(BuildContext context) {
//     final theme = Theme.of(context);
//     final newsState = ref.watch(newsProvider);
//     final tabIndex = ref.watch(newsTabIndexProvider);
//     final isDesktop = Responsive.isDesktop(context);

//     final filteredSections = _filterSections(newsState.sections, _searchQuery);
//     final tabLabels = filteredSections.map((s) => s.sectionHeading).toList();
//     final safeTabIndex =
//         tabIndex.clamp(0, tabLabels.isEmpty ? 0 : tabLabels.length - 1);
//     final currentSection =
//         filteredSections.isEmpty ? null : filteredSections[safeTabIndex];

//     // Sync sidebar only once per stable state (not every build)
//     _syncSidebarSubNav(tabLabels, safeTabIndex);

//     return Scaffold(
//       backgroundColor: theme.colorScheme.surface,
//       body: isDesktop
//           ? _buildDesktopLayout(
//               context, theme, newsState, tabLabels,
//               safeTabIndex, currentSection)
//           : _buildMobileLayout(
//               context, theme, newsState, tabLabels,
//               safeTabIndex, currentSection),
//     );
//   }

//   // ─── Desktop: sidebar tabs + main content ────────────────────────────────

//   Widget _buildDesktopLayout(
//     BuildContext context,
//     ThemeData theme,
//     NewsState newsState,
//     List<String> tabLabels,
//     int safeTabIndex,
//     NewsSectionEntity? currentSection,
//   ) {
//     return Row(
//       children: [
//         // Main content area
//         Expanded(
//           child: newsState.isLoading
//               ? BuildLoading(
//                   message: 'Curating your news list...',
//                   theme: theme,
//                 )
//               : newsState.error != null
//                   ? BuildError(
//                       theme: theme,
//                       message: 'Could not load news',
//                       error: newsState.error!,
//                       retry: () => ref.read(newsProvider.notifier).fetch(),
//                       context: context,
//                     )
//                   : currentSection == null || currentSection.content.isEmpty
//                       ? BuildEmpty(
//                           theme: theme,
//                           message: 'No News found',
//                         )
//                       : WebArticleGridView(
//                           context: context,
//                           theme: theme,
//                           section: currentSection,
//                           onRefresh: () =>
//                               ref.read(newsProvider.notifier).fetch(),
//                           onTap: (NewsArticleEntity article) {
//                             _openArticle(article);
//                           },
//                         ),
//         ),
//       ],
//     );
//   }

//   // ─── Mobile: NestedScrollView with sliver header ──────────────────────────

//   Widget _buildMobileLayout(
//     BuildContext context,
//     ThemeData theme,
//     NewsState newsState,
//     List<String> tabLabels,
//     int safeTabIndex,
//     NewsSectionEntity? currentSection,
//   ) {
//     return NestedScrollView(
//       headerSliverBuilder: (context, innerBoxIsScrolled) => [
//         SliverAppBar(
//           expandedHeight: 110,
//           floating: true,
//           snap: true,
//           pinned: true,
//           backgroundColor: theme.colorScheme.surface,
//           surfaceTintColor: Colors.transparent,
//           elevation: 0,
//           flexibleSpace: FlexibleSpaceBar(
//             titlePadding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
//             title: Row(
//               crossAxisAlignment: CrossAxisAlignment.end,
//               children: [
//                 Expanded(
//                   child: Column(
//                     mainAxisAlignment: MainAxisAlignment.end,
//                     crossAxisAlignment: CrossAxisAlignment.start,
//                     children: [
//                       Text(
//                         'PROFEED',
//                         style: TextStyle(
//                           fontWeight: FontWeight.w900,
//                           letterSpacing: 2,
//                           fontSize: 18,
//                           color: theme.colorScheme.primary,
//                         ),
//                       ),
//                       Text(
//                         TimeUtils.getTodayDate(),
//                         style: theme.textTheme.labelSmall?.copyWith(
//                           color: theme.colorScheme.outline,
//                           fontSize: 10,
//                         ),
//                       ),
//                     ],
//                   ),
//                 ),
//                 GestureDetector(
//                   onTap: () => ref.read(newsProvider.notifier).fetch(),
//                   child: Container(
//                     width: 34,
//                     height: 34,
//                     decoration: BoxDecoration(
//                       shape: BoxShape.circle,
//                       border: Border.all(
//                           color: theme.colorScheme.outlineVariant),
//                     ),
//                     child: const CircleAvatar(
//                       radius: 16,
//                       backgroundImage:
//                           NetworkImage('https://picsum.photos/200'),
//                       backgroundColor: Colors.transparent,
//                     ),
//                   ),
//                 ),
//               ],
//             ),
//           ),
//         ),
//         SliverToBoxAdapter(
//           child: Padding(
//             padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
//             child: CustomSearchField(
//               onChanged: (String p1) {
//                 setState(() {
//                   _searchQuery = p1;
//                 });
//               },
//               searchController: _searchController,
//               hintText: "Search news...",
//               searchQuery: _searchQuery,
//               theme: theme,
//               onPressed: (String p1) {
//                 setState(() => _searchQuery = '');
//               },
//             ),
//           ),
//         ),
//         if (tabLabels.isNotEmpty)
//           SliverPersistentHeader(
//             pinned: true,
//             delegate: TabBarDelegate(
//               tabs: tabLabels,
//               selectedIndex: safeTabIndex,
//               onTabSelected: (i) =>
//                   ref.read(newsTabIndexProvider.notifier).state = i,
//               theme: theme,
//             ),
//           ),
//       ],
//       body: newsState.isLoading
//           ? BuildLoading(
//               message: 'Curating your news list...',
//               theme: theme,
//             )
//           : newsState.error != null
//               ? BuildError(
//                   theme: theme,
//                   message: 'Could not load news',
//                   error: newsState.error!,
//                   retry: () => ref.read(newsProvider.notifier).fetch(),
//                   context: context,
//                 )
//               : currentSection == null || currentSection.content.isEmpty
//                   ? BuildEmpty(
//                       theme: theme,
//                       message: 'No News found',
//                     )
//                   : RefreshIndicator(
//                       onRefresh: () =>
//                           ref.read(newsProvider.notifier).fetch(),
//                       child: ListView.builder(
//                         padding:
//                             const EdgeInsets.fromLTRB(20, 16, 20, 100),
//                         itemCount: currentSection.content.length,
//                         itemBuilder: (_, i) => NewsCards(
//                           article: currentSection.content[i],
//                           onTap: () =>
//                               _openArticle(currentSection.content[i]),
//                         ),
//                       ),
//                     ),
//     );
//   }
// }

// class NewsCards extends StatelessWidget {
//   final NewsArticleEntity article;
//   final VoidCallback onTap;

//   const NewsCards({super.key, required this.article, required this.onTap});

//   @override
//   Widget build(BuildContext context) {
//     final theme = Theme.of(context);
//     final isDesktop = Responsive.isDesktop(context);
//     // Desktop grid cells are shorter — use smaller image
//     final imageHeight = isDesktop ? 140.0 : 180.0;

//     return GestureDetector(
//       onTap: onTap,
//       child: Container(
//         margin: const EdgeInsets.only(bottom: 16),
//         decoration: BoxDecoration(
//           color: theme.colorScheme.surface,
//           borderRadius: BorderRadius.circular(20),
//           border: Border.all(
//               color: theme.colorScheme.outlineVariant.withOpacity(0.5)),
//           boxShadow: [
//             BoxShadow(
//               color: Colors.black.withOpacity(0.06),
//               blurRadius: 16,
//               offset: const Offset(0, 4),
//             ),
//           ],
//         ),
//         child: Column(
//           crossAxisAlignment: CrossAxisAlignment.start,
//           children: [
//             if (article.newsImageUrl != null)
//               ClipRRect(
//                 borderRadius:
//                     const BorderRadius.vertical(top: Radius.circular(20)),
//                 child: Stack(
//                   children: [
//                     Image.network(
                      
            
//                       article.newsImageUrl.toString(),
//                       webHtmlElementStrategy:kIsWeb? WebHtmlElementStrategy.prefer:WebHtmlElementStrategy.never,
//                       height: imageHeight,
//                       width: double.infinity,
//                       fit: BoxFit.fill,
//                       errorBuilder: (_, __, ___) => Container(
//                         height: imageHeight,
//                         color: theme.colorScheme.surfaceVariant,
//                         child: Icon(Icons.image_not_supported_outlined,
//                             color: theme.colorScheme.outline, size: 40),
//                       ),
//                     ),
//                     Positioned(
//                       bottom: 0,
//                       left: 0,
//                       right: 0,
//                       child: Container(
//                         height: 60,
//                         decoration: BoxDecoration(
//                           gradient: LinearGradient(
//                             begin: Alignment.bottomCenter,
//                             end: Alignment.topCenter,
//                             colors: [
//                               theme.colorScheme.surface,
//                               Colors.transparent
//                             ],
//                           ),
//                         ),
//                       ),
//                     ),
//                     Positioned(
//                       top: 10,
//                       left: 10,
//                       child: Wrap(
//                         spacing: 6,
//                         children: article.newsCategory.take(2).map((cat) {
//                           return Container(
//                             padding: const EdgeInsets.symmetric(
//                                 horizontal: 10, vertical: 4),
//                             decoration: BoxDecoration(
//                               color: Colors.black.withOpacity(0.55),
//                               borderRadius: BorderRadius.circular(20),
//                               border: Border.all(
//                                   color: Colors.white.withOpacity(0.15)),
//                             ),
//                             child: Text(
//                               cat.toUpperCase(),
//                               style: const TextStyle(
//                                 color: Colors.white,
//                                 fontSize: 9,
//                                 fontWeight: FontWeight.w700,
//                                 letterSpacing: 0.8,
//                               ),
//                             ),
//                           );
//                         }).toList(),
//                       ),
//                     ),
//                   ],
//                 ),
//               ),
//             Padding(
//               padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
//               child: Column(
//                 crossAxisAlignment: CrossAxisAlignment.start,
//                 children: [
//                   Text(
//                     article.newsTitle,
//                     style: theme.textTheme.titleSmall?.copyWith(
//                       fontWeight: FontWeight.w700,
//                       height: 1.3,
//                       letterSpacing: -0.2,
//                     ),
//                     maxLines: 2,
//                     overflow: TextOverflow.ellipsis,
//                   ),
//                   const SizedBox(height: 6),
//                   Text(
//                     article.newsSummary,
//                     style: theme.textTheme.bodySmall?.copyWith(
//                       color: theme.colorScheme.onSurfaceVariant,
//                       height: 1.5,
//                     ),
//                     maxLines: isDesktop ? 2 : 3,
//                     overflow: TextOverflow.ellipsis,
//                   ),
//                   const SizedBox(height: 12),
//                   Row(
//                     children: [
//                       if (article.newsLogoUrl.isNotEmpty)
//                         Container(
//                           width: 24,
//                           height: 24,
//                           margin: const EdgeInsets.only(right: 8),
//                           decoration: BoxDecoration(
//                             shape: BoxShape.circle,
//                             border: Border.all(
//                                 color: theme.colorScheme.outlineVariant),
//                           ),
//                           child: ClipOval(
//                             child: Image.network(
//                                ImageUtils.proxiedUrl(article.newsLogoUrl),

//                               fit: BoxFit.cover,
//                               errorBuilder: (_, __, ___) => Icon(
//                                   Icons.public,
//                                   size: 14,
//                                   color: theme.colorScheme.outline),
//                             ),
//                           ),
//                         ),
//                       Expanded(
//                         child: Text(
//                           article.newsSource,
//                           style: theme.textTheme.labelSmall?.copyWith(
//                             fontWeight: FontWeight.w600,
//                             color: theme.colorScheme.primary,
//                           ),
//                         ),
//                       ),
//                       Text(
//                         article.newsDate,
//                         style: theme.textTheme.labelSmall
//                             ?.copyWith(color: theme.colorScheme.outline),
//                       ),
//                       const SizedBox(width: 8),
//                       // Container(
//                       //   padding: const EdgeInsets.all(5),
//                       //   decoration: BoxDecoration(
//                       //     color: theme.colorScheme.primaryContainer,
//                       //     shape: BoxShape.circle,
//                       //   ),
//                       //   child: Icon(Icons.arrow_forward_rounded,
//                       //       size: 12, color: theme.colorScheme.primary),
//                       // ),
//                     ],
//                   ),
//                 ],
//               ),
//             ),
//           ],
//         ),
//       ),
//     );
//   }
// }
// class WebArticleGridView extends StatelessWidget {
//    final BuildContext context;
//     final ThemeData theme;
//     final NewsSectionEntity section;
//     final Future<void> Function() onRefresh;
//     final void Function(NewsArticleEntity) onTap;
//   const WebArticleGridView({super.key, required this.context, required this.theme, required this.section, required this.onRefresh, required this.onTap});
// //ref.read(newsProvider.notifier).fetch()
// //_openArticle(section.content[i])
//   @override
//   Widget build(BuildContext context) =>Column(
//       crossAxisAlignment: CrossAxisAlignment.start,
//       children: [
//         Padding(
//           padding: const EdgeInsets.fromLTRB(40, 32, 40, 16),
//           child: Text(
//             section.sectionHeading,
//             style: theme.textTheme.headlineSmall?.copyWith(
//               fontWeight: FontWeight.w800,
//               letterSpacing: -0.5,
//             ),
//           ),
//         ),
//         Expanded(
//           child: RefreshIndicator(
//             onRefresh: () async => onRefresh,
//             child: GridView.builder(
//               padding: const EdgeInsets.fromLTRB(40, 0, 40, 40),
//               gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
//                 crossAxisCount: 2,
//                 childAspectRatio: 1.6,
//                 crossAxisSpacing: 20,
//                 mainAxisSpacing: 20,
//               ),
//               itemCount: section.content.length,
//               itemBuilder: (_, i) => NewsCards(
//                 article: section.content[i],
//                 onTap: () => onTap(section.content[i]),
//               ),
//             ),
//           ),
//         ),
//       ],
//     );
// }

// class TabBarDelegate extends SliverPersistentHeaderDelegate {
//   final List<String> tabs;
//   final int selectedIndex;
//   final ValueChanged<int> onTabSelected;
//   final ThemeData theme;

//   TabBarDelegate({
//     required this.tabs,
//     required this.selectedIndex,
//     required this.onTabSelected,
//     required this.theme,
//   });

//   @override
//   double get minExtent => 52;
//   @override
//   double get maxExtent => 52;

//   @override
//   Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
//     return Container(
//       color: theme.colorScheme.surface,
//       child: ListView.builder(
//         scrollDirection: Axis.horizontal,
//         padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
//         itemCount: tabs.length,
//         itemBuilder: (_, i) {
//           final isSelected = i == selectedIndex;
//           return GestureDetector(
//             onTap: () => onTabSelected(i),
//             child: AnimatedContainer(
//               duration: const Duration(milliseconds: 250),
//               curve: Curves.easeOut,
//               margin: const EdgeInsets.only(right: 8),
//               padding:
//                   const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
//               decoration: BoxDecoration(
//                 color: isSelected
//                     ? theme.colorScheme.primary
//                     : theme.colorScheme.surfaceVariant.withOpacity(0.5),
//                 borderRadius: BorderRadius.circular(20),
//                 border: Border.all(
//                   color: isSelected
//                       ? theme.colorScheme.primary
//                       : theme.colorScheme.outlineVariant.withOpacity(0.5),
//                 ),
//               ),
//               child:Center(child:  Text(
                
//                 tabs[i],
//                 style: theme.textTheme.labelMedium?.copyWith(
//                   color: isSelected
//                       ? theme.colorScheme.onPrimary
//                       : theme.colorScheme.onSurfaceVariant,
//                   fontWeight:
//                       isSelected ? FontWeight.w600 : FontWeight.w400,
//                 ),)
//               ),
//             ),
//           );
//         },
//       ),
//     );
//   }

//   @override
//   bool shouldRebuild(TabBarDelegate oldDelegate) =>
//       oldDelegate.selectedIndex != selectedIndex ||
//       oldDelegate.tabs != tabs;
// }

// class AddCvScreen extends ConsumerStatefulWidget {
//   const AddCvScreen({super.key});

//   @override
//   ConsumerState<AddCvScreen> createState() => _AddCvScreenState();
// }

// class _AddCvScreenState extends ConsumerState<AddCvScreen> {
//   String? _fileName;
//   List<int>? _fileBytes;

//   Future<void> _pickFile() async {
//     final result = await FilePicker.platform.pickFiles(
//       type: FileType.custom,
//       allowedExtensions: ['pdf'],
//       withData: true,
//     );

//     if (result != null && result.files.single.bytes != null) {
//       setState(() {
//         _fileName = result.files.single.name;
//         _fileBytes = result.files.single.bytes!.toList();
//       });
//     }
//   }

//   Future<void> _uploadCv() async {
//     if (_fileBytes == null || _fileName == null) return;

//     final success = await ref
//         .read(cvProvider.notifier)
//         .uploadCv(_fileBytes!, _fileName!);
// print(success);
// print(mounted);
//     if (success && mounted) {
//       // Navigate to profile screen
//       // Navigator.pushReplacementNamed(context, '/ProfileScreen');
// // context.go('/ProfileScreen');
// context.go('/ProfileScreen');
//     }
//   }

//   @override
//   Widget build(BuildContext context) {
//     final theme = Theme.of(context);
//     final cvState = ref.watch(cvProvider);
//     final isAnalyzing = cvState.status == CvStatus.analyzing;

//     return Scaffold(
//       backgroundColor: theme.colorScheme.surface,
//       appBar: AppBar(
//         backgroundColor: theme.colorScheme.surface,
//         surfaceTintColor: Colors.transparent,
//         elevation: 0,
//         title: Text(
//           'Add Your CV',
//           style: theme.textTheme.titleMedium
//               ?.copyWith(fontWeight: FontWeight.w700),
//         ),
//       ),
//       body: Padding(
//         padding: const EdgeInsets.all(24),
//         child: Column(
//           crossAxisAlignment: CrossAxisAlignment.start,
//           children: [
//             const SizedBox(height: 20),

//             // Header
//             Text(
//               'Unlock Job Search',
//               style: theme.textTheme.headlineSmall?.copyWith(
//                 fontWeight: FontWeight.w800,
//                 letterSpacing: -0.5,
//               ),
//             ),
//             const SizedBox(height: 8),
//             Text(
//               'Upload your CV and our AI will extract your skills, experience, and generate personalised job recommendations.',
//               style: theme.textTheme.bodyMedium?.copyWith(
//                 color: theme.colorScheme.onSurfaceVariant,
//                 height: 1.5,
//               ),
//             ),

//             const SizedBox(height: 40),

//             // Upload area
//             GestureDetector(
//               onTap: isAnalyzing ? null : _pickFile,
//               child: AnimatedContainer(
//                 duration: const Duration(milliseconds: 200),
//                 width: double.infinity,
//                 padding: const EdgeInsets.symmetric(
//                     vertical: 40, horizontal: 24),
//                 decoration: BoxDecoration(
//                   color: _fileBytes != null
//                       ? theme.colorScheme.primaryContainer.withOpacity(0.3)
//                       : theme.colorScheme.surfaceVariant.withOpacity(0.4),
//                   borderRadius: BorderRadius.circular(20),
//                   border: Border.all(
//                     color: _fileBytes != null
//                         ? theme.colorScheme.primary
//                         : theme.colorScheme.outlineVariant,
//                     width: _fileBytes != null ? 2 : 1,
//                     strokeAlign: BorderSide.strokeAlignInside,
//                   ),
//                 ),
//                 child: Column(
//                   children: [
//                     Icon(
//                       _fileBytes != null
//                           ? Icons.picture_as_pdf_rounded
//                           : Icons.upload_file_rounded,
//                       size: 48,
//                       color: _fileBytes != null
//                           ? theme.colorScheme.primary
//                           : theme.colorScheme.outline,
//                     ),
//                     const SizedBox(height: 16),
//                     Text(
//                       _fileBytes != null
//                           ? _fileName ?? 'File selected'
//                           : 'Tap to select your CV',
//                       style: theme.textTheme.titleSmall?.copyWith(
//                         fontWeight: FontWeight.w600,
//                         color: _fileBytes != null
//                             ? theme.colorScheme.primary
//                             : theme.colorScheme.onSurfaceVariant,
//                       ),
//                     ),
//                     const SizedBox(height: 4),
//                     Text(
//                       'PDF files only • Max 10MB',
//                       style: theme.textTheme.labelSmall?.copyWith(
//                         color: theme.colorScheme.outline,
//                       ),
//                     ),
//                   ],
//                 ),
//               ),
//             ),

//             if (cvState.error != null) ...[
//               const SizedBox(height: 16),
//               Container(
//                 padding: const EdgeInsets.symmetric(
//                     horizontal: 16, vertical: 12),
//                 decoration: BoxDecoration(
//                   color: theme.colorScheme.errorContainer.withOpacity(0.3),
//                   borderRadius: BorderRadius.circular(12),
//                 ),
//                 child: Row(
//                   children: [
//                     Icon(Icons.error_outline_rounded,
//                         color: theme.colorScheme.error, size: 18),
//                     const SizedBox(width: 8),
//                     Expanded(
//                       child: Text(
//                         cvState.error!,
//                         style: theme.textTheme.labelSmall?.copyWith(
//                           color: theme.colorScheme.error,
//                         ),
//                       ),
//                     ),
//                   ],
//                 ),
//               ),
//             ],

//             const Spacer(),

//             // Analyze button
//             SizedBox(
//               width: double.infinity,
//               height: 54,
//               child: FilledButton(
//                 onPressed: (_fileBytes == null || isAnalyzing)
//                     ? null
//                     : _uploadCv,
//                 style: FilledButton.styleFrom(
//                   shape: RoundedRectangleBorder(
//                     borderRadius: BorderRadius.circular(14),
//                   ),
//                 ),
//                 child: isAnalyzing
//                     ? Row(
//                         mainAxisAlignment: MainAxisAlignment.center,
//                         children: [
//                           SizedBox(
//                             width: 18,
//                             height: 18,
//                             child: CircularProgressIndicator(
//                               strokeWidth: 2,
//                               color: theme.colorScheme.onPrimary,
//                             ),
//                           ),
//                           const SizedBox(width: 12),
//                           const Text('AI is analysing your CV...'),
//                         ],
//                       )
//                     : const Text(
//                         'Analyse CV',
//                         style: TextStyle(
//                             fontSize: 16, fontWeight: FontWeight.w600),
//                       ),
//               ),
//             ),

//             const SizedBox(height: 24),
//           ],
//         ),
//       ),
//     );
//   }
// }

// class ProfileScreen extends ConsumerStatefulWidget {
//   const ProfileScreen({super.key});

//   @override
//   ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
// }

// class _ProfileScreenState extends ConsumerState<ProfileScreen> {
//   bool _isEditing = false;

//   // Edit controllers
//   late TextEditingController _nameController;
//   late TextEditingController _locationController;
//   late TextEditingController _rolesController;
//   late TextEditingController _skillsController;

//   @override
//   void initState() {
//     super.initState();
//     final profile = ref.read(cvProvider).profile;
//     _nameController =
//         TextEditingController(text: profile?.name ?? '');
//     _locationController =
//         TextEditingController(text: profile?.location ?? '');
//     _rolesController =
//         TextEditingController(text: profile?.roles.join(', ') ?? '');
//     _skillsController =
//         TextEditingController(text: profile?.skills.join(', ') ?? '');
//   }

//   @override
//   void dispose() {
//     _nameController.dispose();
//     _locationController.dispose();
//     _rolesController.dispose();
//     _skillsController.dispose();
//     super.dispose();
//   }

//   Future<void> _saveEdits() async {
//     final updates = {
//       'name': _nameController.text.trim(),
//       'location': _locationController.text.trim(),
//       'roles': _rolesController.text
//           .split(',')
//           .map((e) => e.trim())
//           .where((e) => e.isNotEmpty)
//           .toList(),
//       'skills': _skillsController.text
//           .split(',')
//           .map((e) => e.trim())
//           .where((e) => e.isNotEmpty)
//           .toList(),
//     };

//     final success =
//         await ref.read(cvProvider.notifier).updateProfile(updates);
//     if (success) setState(() => _isEditing = false);
//   }
//   Future<void> _repersonalize() async {
//   final confirmed = await showDialog<bool>(
//     context: context,
//     builder: (_) => AlertDialog(
//       title: const Text('Repersonalize Feed'),
//       content: const Text(
//         'This will re-fetch your news, books, and jobs using your CV keywords combined with your profession. Your feed will update in the background.',
//       ),
//       actions: [
//         TextButton(
//           onPressed: () => Navigator.pop(context, false),
//           child: const Text('Cancel'),
//         ),
//         FilledButton(
//           onPressed: () => Navigator.pop(context, true),
//           child: const Text('Repersonalize'),
//         ),
//       ],
//     ),
//   );

//   if (confirmed != true || !mounted) return;

//   // Call backend repe
//   //rsonalize endpoint
//   try {
//     await DioClient.ensureTokenAttached();
//     await DioClient.instance.post('/cv/repersonalize');

//     if (!mounted) return;

//     ScaffoldMessenger.of(context).showSnackBar(
//       const SnackBar(
//         content: Text('Repersonalization started — your feed will update shortly'),
//         behavior: SnackBarBehavior.floating,
//       ),
//     );

//     // Refresh all three providers after a short delay
//     // (backend runs in background, give it 15s head start)
//     // Future.delayed(const Duration(seconds: 15), () {
      
//     // });
//     if (mounted) {
//         ref.read(newsProvider.notifier).fetch();
//         ref.read(booksProvider.notifier).fetch();
//         ref.read(jobsProvider.notifier).fetch();
//       }
//   } catch (e) {
//     if (!mounted) return;
//     ScaffoldMessenger.of(context).showSnackBar(
//       SnackBar(
//         content: Text('Failed: ${e.toString()}'),
//         backgroundColor: Theme.of(context).colorScheme.error,
//         behavior: SnackBarBehavior.floating,
//       ),
//     );
//   }
// }


//   @override
//   Widget build(BuildContext context) {
//     final theme = Theme.of(context);
//     final cvState = ref.watch(cvProvider);
//     final profile = cvState.profile;

//     if (profile == null) {
//       return const Scaffold(
//         body: Center(child: CircularProgressIndicator()),
//       );
//     }

//     return Scaffold(
//       backgroundColor: theme.colorScheme.surface,
//       appBar: AppBar(
//         backgroundColor: theme.colorScheme.surface,
//         surfaceTintColor: Colors.transparent,
//         elevation: 0,
//         title: Text(
//           'My Profile',
//           style: theme.textTheme.titleMedium
//               ?.copyWith(fontWeight: FontWeight.w700),
//         ),
//         actions: [
//           if (!_isEditing)
//             IconButton(
//               onPressed: () => setState(() => _isEditing = true),
//               icon: const Icon(Icons.edit_rounded),
//             )
//           else ...[
//             TextButton(
//               onPressed: () => setState(() => _isEditing = false),
//               child: const Text('Cancel'),
//             ),
//             TextButton(
//               onPressed: _saveEdits,
//               child: const Text('Save'),
//             ),
//           ],
//         ],
//       ),
//       body: SingleChildScrollView(
//         padding: const EdgeInsets.all(24),
//         child: Column(
//           crossAxisAlignment: CrossAxisAlignment.start,
//           children: [
//             // ── Profile header ───────────────────────────────────────────
//             _buildProfileHeader(theme, profile, cvState),

//             const SizedBox(height: 24),

//             // ── Repersonalize button ──────────────────────────────────────
//             SizedBox(
//               width: double.infinity,
//               child: OutlinedButton.icon(
//                 onPressed: _repersonalize,
//                 icon: const Icon(Icons.auto_awesome_rounded, size: 18),
//                 label: const Text('Repersonalize My Feed'),
//                 style: OutlinedButton.styleFrom(
//                   padding: const EdgeInsets.symmetric(vertical: 14),
//                   shape: RoundedRectangleBorder(
//                     borderRadius: BorderRadius.circular(12),
//                   ),
//                 ),
//               ),
//             ),

//             const SizedBox(height: 32),

//             // ── Fields ────────────────────────────────────────────────────
//             _buildSection(
//               theme,
//               title: 'Roles',
//               icon: Icons.work_outline_rounded,
//               child: _isEditing
//                   ? _buildTextField(_rolesController,
//                       hint: 'e.g. Data Scientist, ML Engineer')
//                   : _buildChips(theme, profile.roles,
//                       color: theme.colorScheme.primaryContainer),
//             ),

//             _buildSection(
//               theme,
//               title: 'Skills',
//               icon: Icons.code_rounded,
//               child: _isEditing
//                   ? _buildTextField(_skillsController,
//                       hint: 'e.g. Python, TensorFlow, SQL')
//                   : _buildChips(theme, profile.skills,
//                       color: theme.colorScheme.secondaryContainer),
//             ),

//             _buildSection(
//               theme,
//               title: 'Experience Level',
//               icon: Icons.bar_chart_rounded,
//               child: _buildInfoRow(
//                   theme, profile.experienceLevel ?? 'Not detected'),
//             ),

//             _buildSection(
//               theme,
//               title: 'Domain',
//               icon: Icons.category_outlined,
//               child: Column(
//                 crossAxisAlignment: CrossAxisAlignment.start,
//                 children: [
//                   if (profile.domains.primary != null)
//                     _buildInfoRow(theme, profile.domains.primary!,
//                         isPrimary: true),
//                   if (profile.domains.secondary.isNotEmpty)
//                     _buildChips(theme, profile.domains.secondary,
//                         color: theme.colorScheme.tertiaryContainer),
//                 ],
//               ),
//             ),

//             _buildSection(
//               theme,
//               title: 'Location',
//               icon: Icons.location_on_outlined,
//               child: _isEditing
//                   ? _buildTextField(_locationController,
//                       hint: 'e.g. United Kingdom')
//                   : _buildInfoRow(
//                       theme, profile.location ?? 'Not detected'),
//             ),

//             _buildSection(
//               theme,
//               title: 'Job Type Preference',
//               icon: Icons.apartment_rounded,
//               child: _buildInfoRow(
//                   theme, profile.preferredJobType ?? 'Any'),
//             ),

//             const SizedBox(height: 24),

//             // ── Keywords ──────────────────────────────────────────────────
//             _buildKeywordsSection(theme, profile),

//             const SizedBox(height: 24),

//             // ── Re-upload CV ──────────────────────────────────────────────
//             TextButton.icon(
//               onPressed: () =>
//                   Navigator.pushNamed(context, '/add-cv'),
//               icon: const Icon(Icons.upload_file_rounded, size: 16),
//               label: const Text('Re-upload CV'),
//             ),

//             const SizedBox(height: 40),
//           ],
//         ),
//       ),
//     );
//   }

//   Widget _buildProfileHeader(
//       ThemeData theme, profile, CvState cvState) {
//     return Row(
//       children: [
//         CircleAvatar(
//           radius: 32,
//           backgroundColor: theme.colorScheme.primaryContainer,
//           child: Text(
//             (profile.name?.substring(0, 1) ?? '?').toUpperCase(),
//             style: TextStyle(
//               fontSize: 24,
//               fontWeight: FontWeight.w700,
//               color: theme.colorScheme.primary,
//             ),
//           ),
//         ),
//         const SizedBox(width: 16),
//         Expanded(
//           child: Column(
//             crossAxisAlignment: CrossAxisAlignment.start,
//             children: [
//               _isEditing
//                   ? TextField(
//                       controller: _nameController,
//                       style: theme.textTheme.titleLarge
//                           ?.copyWith(fontWeight: FontWeight.w700),
//                       decoration: const InputDecoration(
//                         border: InputBorder.none,
//                         hintText: 'Your name',
//                       ),
//                     )
//                   : Text(
//                       profile.name ?? 'Unknown',
//                       style: theme.textTheme.titleLarge
//                           ?.copyWith(fontWeight: FontWeight.w700),
//                     ),
//               if (profile.lastAnalyzedAt != null)
//                 Text(
//                   'Last analysed: ${_formatDate(profile.lastAnalyzedAt!)}',
//                   style: theme.textTheme.labelSmall?.copyWith(
//                     color: theme.colorScheme.outline,
//                   ),
//                 ),
//             ],
//           ),
//         ),
//       ],
//     );
//   }

//   Widget _buildSection(ThemeData theme,
//       {required String title,
//       required IconData icon,
//       required Widget child}) {
//     return Padding(
//       padding: const EdgeInsets.only(bottom: 24),
//       child: Column(
//         crossAxisAlignment: CrossAxisAlignment.start,
//         children: [
//           Row(
//             children: [
//               Icon(icon, size: 16, color: theme.colorScheme.primary),
//               const SizedBox(width: 8),
//               Text(
//                 title.toUpperCase(),
//                 style: theme.textTheme.labelSmall?.copyWith(
//                   fontWeight: FontWeight.w700,
//                   letterSpacing: 1.2,
//                   color: theme.colorScheme.outline,
//                 ),
//               ),
//             ],
//           ),
//           const SizedBox(height: 10),
//           child,
//         ],
//       ),
//     );
//   }

//   Widget _buildChips(ThemeData theme, List<String> items,
//       {required Color color}) {
//     if (items.isEmpty) {
//       return Text('Not detected',
//           style: theme.textTheme.bodySmall
//               ?.copyWith(color: theme.colorScheme.outline));
//     }
//     return Wrap(
//       spacing: 8,
//       runSpacing: 8,
//       children: items
//           .map((item) => Container(
//                 padding: const EdgeInsets.symmetric(
//                     horizontal: 12, vertical: 6),
//                 decoration: BoxDecoration(
//                   color: color.withOpacity(0.6),
//                   borderRadius: BorderRadius.circular(20),
//                 ),
//                 child: Text(item,
//                     style: theme.textTheme.labelMedium
//                         ?.copyWith(fontWeight: FontWeight.w500)),
//               ))
//           .toList(),
//     );
//   }

//   Widget _buildInfoRow(ThemeData theme, String value,
//       {bool isPrimary = false}) {
//     return Text(
//       value,
//       style: isPrimary
//           ? theme.textTheme.titleSmall
//               ?.copyWith(fontWeight: FontWeight.w600)
//           : theme.textTheme.bodyMedium,
//     );
//   }

//   Widget _buildTextField(TextEditingController controller,
//       {String? hint}) {
//     return TextField(
//       controller: controller,
//       decoration: InputDecoration(
//         hintText: hint,
//         hintStyle: TextStyle(
//             color: Theme.of(context).colorScheme.outline, fontSize: 13),
//         border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
//         contentPadding:
//             const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
//       ),
//     );
//   }

//   Widget _buildKeywordsSection(ThemeData theme, profile) {
//     return Column(
//       crossAxisAlignment: CrossAxisAlignment.start,
//       children: [
//         Text(
//           'GENERATED KEYWORDS',
//           style: theme.textTheme.labelSmall?.copyWith(
//             fontWeight: FontWeight.w700,
//             letterSpacing: 1.2,
//             color: theme.colorScheme.outline,
//           ),
//         ),
//         const SizedBox(height: 12),
//         _buildKeywordRow(theme, 'News',
//             Icons.newspaper_rounded, profile.keywords.news),
//         const SizedBox(height: 8),
//         _buildKeywordRow(theme, 'Books',
//             Icons.book_rounded, profile.keywords.books),
//         const SizedBox(height: 8),
//         _buildKeywordRow(theme, 'Jobs',
//             Icons.work_rounded, profile.keywords.jobs),
//       ],
//     );
//   }

//   Widget _buildKeywordRow(
//       ThemeData theme, String label, IconData icon, List<String> kws) {
//     return Container(
//       padding: const EdgeInsets.all(12),
//       decoration: BoxDecoration(
//         color: theme.colorScheme.surfaceVariant.withOpacity(0.4),
//         borderRadius: BorderRadius.circular(12),
//       ),
//       child: Row(
//         crossAxisAlignment: CrossAxisAlignment.start,
//         children: [
//           Icon(icon, size: 16, color: theme.colorScheme.primary),
//           const SizedBox(width: 10),
//           Expanded(
//             child: Column(
//               crossAxisAlignment: CrossAxisAlignment.start,
//               children: [
//                 Text(label,
//                     style: theme.textTheme.labelSmall
//                         ?.copyWith(fontWeight: FontWeight.w600)),
//                 const SizedBox(height: 4),
//                 Text(
//                   kws.isEmpty ? 'None generated' : kws.join(' • '),
//                   style: theme.textTheme.bodySmall?.copyWith(
//                     color: theme.colorScheme.onSurfaceVariant,
//                   ),
//                 ),
//               ],
//             ),
//           ),
//         ],
//       ),
//     );
//   }

//   String _formatDate(DateTime dt) {
//     const months = [
//       'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
//       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
//     ];
//     return '${dt.day} ${months[dt.month - 1]} ${dt.year}';
//   }
// }

// class Responsive {
//   static bool isMobile(BuildContext context) =>
//       MediaQuery.of(context).size.width < 600;

//   static bool isTablet(BuildContext context) =>
//       MediaQuery.of(context).size.width >= 600 &&
//       MediaQuery.of(context).size.width < 1024;

//   static bool isDesktop(BuildContext context) =>
//       MediaQuery.of(context).size.width >= 1024;

//   static double cardWidth(BuildContext context) {
//     final w = MediaQuery.of(context).size.width;
//     if (w >= 1024) return 380;
//     if (w >= 600) return 340;
//     return w * 0.85;
//   }

//   static int gridCrossAxisCount(BuildContext context) {
//     final w = MediaQuery.of(context).size.width;
//     if (w >= 1024) return 3;
//     if (w >= 600) return 2;
//     return 1;
//   }

//   static double contentMaxWidth(BuildContext context) {
//     final w = MediaQuery.of(context).size.width;
//     if (w >= 1024) return 1100;
//     return w;
//   }

//   static EdgeInsets pagePadding(BuildContext context) {
//     if (isDesktop(context)) {
//       return const EdgeInsets.symmetric(horizontal: 48, vertical: 16);
//     }
//     if (isTablet(context)) {
//       return const EdgeInsets.symmetric(horizontal: 32, vertical: 12);
//     }
//     return const EdgeInsets.symmetric(horizontal: 20, vertical: 8);
//   }
// }
// class AppShell extends ConsumerWidget {
//   final StatefulNavigationShell navigationShell;
//   const AppShell({super.key, required this.navigationShell});

//   @override
//   Widget build(BuildContext context, WidgetRef ref) {
//     if (kIsWeb || Responsive.isDesktop(context)) {
//       return _WebShell(navigationShell: navigationShell);
//     }
//     return _MobileShell(navigationShell: navigationShell);
//   }
// }

// // ─── Web shell ────────────────────────────────────────────────────────────────

// class _WebShell extends ConsumerWidget {
//   final StatefulNavigationShell navigationShell;
//   const _WebShell({required this.navigationShell});

//   static const _navItems = [
//     _NavItem(icon: CupertinoIcons.globe, label: 'News', path: '/NewsScreen'),
//     _NavItem(
//         icon: CupertinoIcons.book_fill, label: 'Books', path: '/BooksScreen'),
//         _NavItem(
//         icon: CupertinoIcons.chat_bubble, label: 'Chatbot', path: '/ChatbotScreen'),
//          _NavItem(icon: CupertinoIcons.briefcase, label: 'Jobs', path: '/JobsScreen'),
//   ];

//   int _currentIndex(String location) {
//     for (int i = 0; i < _navItems.length; i++) {
//       if (location.startsWith(_navItems[i].path)) return i;
//     }
//     return 0;
//   }

//   @override
//   Widget build(BuildContext context, WidgetRef ref) {
//     final theme = Theme.of(context);
//     final location = GoRouterState.of(context).matchedLocation;
//     final currentIndex = _currentIndex(location);
//     final user = ref.watch(authProvider).user;
//     final sidebarState = ref.watch(sidebarProvider);
// final subNavItems = sidebarState.items; 
//     final isExpanded = Responsive.isDesktop(context);

//     return Scaffold(
//       backgroundColor: theme.colorScheme.surface,
//       body: Row(
//         children: [
//           // ── Sidebar ───────────────────────────────────────────────────────
//           AnimatedContainer(
//             duration: const Duration(milliseconds: 250),
//             width: isExpanded ? 240 : 72,
//             decoration: BoxDecoration(
//               color: theme.colorScheme.surface,
//               border: Border(
//                 right: BorderSide(
//                   color: theme.colorScheme.outlineVariant.withOpacity(0.4),
//                 ),
//               ),
//             ),
//             child: Column(
//               crossAxisAlignment: CrossAxisAlignment.start,
//               children: [
//                 const SizedBox(height: 32),

//                 // ── App name ───────────────────────────────────────────────
//                 Padding(
//                   padding: EdgeInsets.symmetric(
//                       horizontal: isExpanded ? 24 : 16),
//                   child: isExpanded
//                       ? Column(
//                           crossAxisAlignment: CrossAxisAlignment.start,
//                           children: [
//                             Text(
//                               'PROFEED',
//                               style: TextStyle(
//                                 fontWeight: FontWeight.w900,
//                                 letterSpacing: 2.5,
//                                 fontSize: 20,
//                                 color: theme.colorScheme.primary,
//                               ),
//                             ),
//                             Text(
//                               'Your professional feed',
//                               style: theme.textTheme.labelSmall?.copyWith(
//                                 color: theme.colorScheme.outline,
//                               ),
//                             ),
//                           ],
//                         )
//                       : Icon(
//                           Icons.auto_stories_rounded,
//                           color: theme.colorScheme.primary,
//                           size: 28,
//                         ),
//                 ),

//                 const SizedBox(height: 24),
//                 _divider(theme, isExpanded),
//                 const SizedBox(height: 12),

//                 // ── Main nav items ─────────────────────────────────────────
//                 Padding(
//                   padding: EdgeInsets.symmetric(
//                       horizontal: isExpanded ? 12 : 8),
//                   child: Column(
//                     children: List.generate(_navItems.length, (i) {
//                       final item = _navItems[i];
//                       final isSelected = i == currentIndex;
//                       return _SidebarNavItem(
//                         item: item,
//                         isSelected: isSelected,
//                         isExpanded: isExpanded,
//                         onTap: () {
//                           navigationShell.goBranch(i);
//                           print("befor");
//                           context.go(item.path);
//                           print(item.label);
//                           if (item.label == 'News') {
//                             ref.read(activeScreenProvider.notifier).state =
//                                 SubNavOwner.news;
//                           } else if (item.label == 'Books') {
//                             ref.read(activeScreenProvider.notifier).state =
//                                 SubNavOwner.books;
//                           } else if (item.label == 'Chatbot') {
//                             // ref.read(activeScreenProvider.notifier).state =
//                             //     SubNavOwner.chatbot;
                                
//                         }
//                     });
//                     }),
//                   ),
//                 ),

//                 // ── Sub-nav section (context-aware tabs) ───────────────────
//                 if (subNavItems.isNotEmpty && isExpanded) ...[
//                   const SizedBox(height: 16),
//                   _divider(theme, isExpanded),
//                   const SizedBox(height: 12),

//                   Padding(
//                     padding: const EdgeInsets.symmetric(horizontal: 24),
//                     child: Text(
//                       'SECTIONS',
//                       style: theme.textTheme.labelSmall?.copyWith(
//                         color: theme.colorScheme.outline,
//                         fontWeight: FontWeight.w700,
//                         letterSpacing: 1.2,
//                         fontSize: 10,
//                       ),
//                     ),
//                   ),

//                   const SizedBox(height: 8),

//                   Expanded(
//                     child: ListView.builder(
//                       padding: const EdgeInsets.symmetric(horizontal: 12),
//                       itemCount: subNavItems.length,
//                       itemBuilder: (_, i) {
//                         final sub = subNavItems[i];
//                         return _SubNavItem(
//                           label: sub.label,
//                           isSelected: sub.isSelected,
//                           onTap: sub.onTap,
//                           theme: theme,
//                         );
//                       },
//                     ),
//                   ),
//                 ] else
//                   // No sub-nav — spacer pushes bottom section down
//                   const Expanded(child: SizedBox()),

//                 // ── Bottom: user + logout ──────────────────────────────────
//                 _divider(theme, isExpanded),
//                 const SizedBox(height: 12),

//                 // Padding(
//                 //   padding: EdgeInsets.symmetric(
//                 //       horizontal: isExpanded ? 16 : 8),
//                 //   child: isExpanded
//                 //       ? _UserInfoTile(user: user, theme: theme)
//                 //       : _UserAvatar(theme: theme),
//                 // ),
//                 Padding(
//   padding: EdgeInsets.symmetric(horizontal: isExpanded ? 16 : 8),
//   child: GestureDetector(
//     onTap: () {
//       final cvState = ref.read(cvProvider);
//       if (cvState.hasProfile) {
//         context.go('/ProfileScreen');
//       } else {
//         context.go('/AddCvScreen');
//       }
//     },
//     child: isExpanded
//         ? _UserInfoTile(user: user, theme: theme)
//         : _UserAvatar(theme: theme),
//   ),
// ),

//                 const SizedBox(height: 8),

//                 Padding(
//                   padding: EdgeInsets.symmetric(
//                       horizontal: isExpanded ? 12 : 8),
//                   child: _SidebarNavItem(
//                     item: const _NavItem(
//                       icon: Icons.logout_rounded,
//                       label: 'Logout',
//                       path: '__logout__',
//                     ),
//                     isSelected: false,
//                     isExpanded: isExpanded,
//                     isDestructive: true,
//                     onTap: () =>
//                         ref.read(authProvider.notifier).logout(),
//                   ),
//                 ),

//                 const SizedBox(height: 24),
//               ],
//             ),
//           ),

//           // ── Main content ──────────────────────────────────────────────────
//           Expanded(child: navigationShell),
//         ],
//       ),
//     );
//   }

//   Widget _divider(ThemeData theme, bool isExpanded) => Divider(
//         color: theme.colorScheme.outlineVariant.withOpacity(0.4),
//         height: 1,
//         indent: isExpanded ? 24 : 16,
//         endIndent: isExpanded ? 24 : 16,
//       );
// }

// // ─── Mobile shell ─────────────────────────────────────────────────────────────

// class _MobileShell extends StatelessWidget {
//   final StatefulNavigationShell navigationShell;
//   const _MobileShell({required this.navigationShell});

//   @override
//   Widget build(BuildContext context) {
//     return PersistentTabView.router(
//       navigationShell: navigationShell,
//       backgroundColor: Theme.of(context).colorScheme.surface,
//       navBarBuilder: (navBarConfig) =>
//           Style6BottomNavBar(navBarConfig: navBarConfig),
//       tabs: [
//         PersistentRouterTabConfig(
//           item: ItemConfig(
//             icon: const Icon(CupertinoIcons.globe),
//             title: 'News',
//             activeColorSecondary: CupertinoColors.activeBlue,
//           ),
//         ),
//         PersistentRouterTabConfig(
//           item: ItemConfig(
//             icon: const Icon(CupertinoIcons.book_fill),
//             title: 'Books',
//             activeColorSecondary: CupertinoColors.activeBlue,
//           ),
//         ),
//         PersistentRouterTabConfig(
//   item: ItemConfig(
//     icon: const Icon(CupertinoIcons.briefcase),
//     title: 'Jobs',
//     activeColorSecondary: CupertinoColors.activeBlue,
//   ),
// ),
//         PersistentRouterTabConfig(
//           item: ItemConfig(
//             icon: const Icon(CupertinoIcons.chat_bubble),
//             title: 'Chatbot',
//             activeColorSecondary: CupertinoColors.activeBlue,
//           ),
//         ),
//       ],
//     );
//   }
// }

// // ─── Sub nav item ─────────────────────────────────────────────────────────────

// class _SubNavItem extends StatelessWidget {
//   final String label;
//   final bool isSelected;
//   final VoidCallback onTap;
//   final ThemeData theme;

//   const _SubNavItem({
//     required this.label,
//     required this.isSelected,
//     required this.onTap,
//     required this.theme,
//   });

//   @override
//   Widget build(BuildContext context) {
//     return GestureDetector(
//       onTap: onTap,
//       child: AnimatedContainer(
//         duration: const Duration(milliseconds: 200),
//         margin: const EdgeInsets.only(bottom: 2),
//         padding:
//             const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
//         decoration: BoxDecoration(
//           color: isSelected
//               ? theme.colorScheme.primary.withOpacity(0.08)
//               : Colors.transparent,
//           borderRadius: BorderRadius.circular(10),
//         ),
//         child: Row(
//           children: [
//             // Dot indicator
//             AnimatedContainer(
//               duration: const Duration(milliseconds: 200),
//               width: 6,
//               height: 6,
//               margin: const EdgeInsets.only(right: 12),
//               decoration: BoxDecoration(
//                 shape: BoxShape.circle,
//                 color: isSelected
//                     ? theme.colorScheme.primary
//                     : theme.colorScheme.outlineVariant,
//               ),
//             ),
//             Expanded(
//               child: Text(
//                 label,
//                 style: theme.textTheme.bodySmall?.copyWith(
//                   color: isSelected
//                       ? theme.colorScheme.primary
//                       : theme.colorScheme.onSurfaceVariant,
//                   fontWeight: isSelected
//                       ? FontWeight.w600
//                       : FontWeight.w400,
//                 ),
//                 overflow: TextOverflow.ellipsis,
//               ),
//             ),
//           ],
//         ),
//       ),
//     );
//   }
// }

// // ─── Sidebar nav item ─────────────────────────────────────────────────────────

// class _SidebarNavItem extends StatelessWidget {
//   final _NavItem item;
//   final bool isSelected;
//   final bool isExpanded;
//   final bool isDestructive;
//   final VoidCallback onTap;

//   const _SidebarNavItem({
//     required this.item,
//     required this.isSelected,
//     required this.isExpanded,
//     required this.onTap,
//     this.isDestructive = false,
//   });

//   @override
//   Widget build(BuildContext context) {
//     final theme = Theme.of(context);
//     final color = isDestructive
//         ? theme.colorScheme.error
//         : isSelected
//             ? theme.colorScheme.primary
//             : theme.colorScheme.onSurfaceVariant;

//     return Tooltip(
//       message: isExpanded ? '' : item.label,
//       preferBelow: false,
//       child: GestureDetector(
//         onTap: onTap,
//         child: AnimatedContainer(
//           duration: const Duration(milliseconds: 200),
//           margin: const EdgeInsets.only(bottom: 4),
//           padding: EdgeInsets.symmetric(
//             horizontal: isExpanded ? 16 : 12,
//             vertical: 12,
//           ),
//           decoration: BoxDecoration(
//             color: isSelected
//                 ? theme.colorScheme.primary.withOpacity(0.1)
//                 : Colors.transparent,
//             borderRadius: BorderRadius.circular(12),
//           ),
//           child: Row(
//             mainAxisAlignment: isExpanded
//                 ? MainAxisAlignment.start
//                 : MainAxisAlignment.center,
//             children: [
//               if (isSelected && isExpanded)
//                 Container(
//                   width: 3,
//                   height: 18,
//                   margin: const EdgeInsets.only(right: 12),
//                   decoration: BoxDecoration(
//                     color: theme.colorScheme.primary,
//                     borderRadius: BorderRadius.circular(2),
//                   ),
//                 ),
//               Icon(item.icon, size: 20, color: color),
//               if (isExpanded) ...[
//                 const SizedBox(width: 14),
//                 Expanded(
//                   child: Text(
//                     item.label,
//                     style: theme.textTheme.bodyMedium?.copyWith(
//                       color: color,
//                       fontWeight: isSelected
//                           ? FontWeight.w700
//                           : FontWeight.w400,
//                     ),
//                   ),
//                 ),
//               ],
//             ],
//           ),
//         ),
//       ),
//     );
//   }
// }

// // ─── User tiles ───────────────────────────────────────────────────────────────

// class _UserInfoTile extends StatelessWidget {
//   final dynamic user;
//   final ThemeData theme;
//   const _UserInfoTile({required this.user, required this.theme});

//   @override
//   Widget build(BuildContext context) {
//     return Container(
//       padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
//       decoration: BoxDecoration(
//         color: theme.colorScheme.surfaceVariant.withOpacity(0.5),
//         borderRadius: BorderRadius.circular(12),
//       ),
//       child: Row(
//         children: [
//           CircleAvatar(
//             radius: 18,
//             backgroundColor: theme.colorScheme.primaryContainer,
//             child: Text(
//               user?.username?.substring(0, 1).toUpperCase() ?? 'U',
//               style: TextStyle(
//                 color: theme.colorScheme.primary,
//                 fontWeight: FontWeight.w700,
//                 fontSize: 14,
//               ),
//             ),
//           ),
//           const SizedBox(width: 10),
//           Expanded(
//             child: Column(
//               crossAxisAlignment: CrossAxisAlignment.start,
//               children: [
//                 Text(
//                   user?.username ?? 'User',
//                   style: theme.textTheme.labelMedium
//                       ?.copyWith(fontWeight: FontWeight.w700),
//                   overflow: TextOverflow.ellipsis,
//                 ),
//                 Text(
//                   user?.profession ?? '',
//                   style: theme.textTheme.labelSmall
//                       ?.copyWith(color: theme.colorScheme.outline),
//                   overflow: TextOverflow.ellipsis,
//                 ),
//               ],
//             ),
//           ),
//         ],
//       ),
//     );
//   }
// }

// class _UserAvatar extends StatelessWidget {
//   final ThemeData theme;
//   const _UserAvatar({required this.theme});

//   @override
//   Widget build(BuildContext context) {
//     return Center(
//       child: CircleAvatar(
//         radius: 16,
//         backgroundColor: theme.colorScheme.primaryContainer,
//         child: Icon(Icons.person_rounded,
//             size: 18, color: theme.colorScheme.primary),
//       ),
//     );
//   }
// }

// // ─── Nav item data ────────────────────────────────────────────────────────────

// class _NavItem {
//   final IconData icon;
//   final String label;
//   final String path;
//   const _NavItem({required this.icon, required this.label, required this.path});
// }
// //very good,i love this,now i want you tonow base on everything you gave from top of chat to bottom without leaving any bit of detail behind,give a very detailed,specific prompt that i can used to tell claude to correct does mistakes and then apply those fixes you gave,note,dont leave any problem identify and fixed behind,asked any question before proceeding
