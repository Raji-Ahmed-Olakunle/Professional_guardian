// const axios = require('axios');

// const OPENLIBRARY_BASE_URL =
//   process.env.OPENLIBRARY_BASE_URL || 'https://openlibrary.org';
// const GOOGLE_BOOKS_BASE_URL =
//   process.env.GOOGLE_BOOKS_BASE_URL ||
//   'https://www.googleapis.com/books/v1';
// const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY || null;

// const openLibraryClient = axios.create({
//   baseURL: OPENLIBRARY_BASE_URL,
//   timeout: 10000,
// });

// const googleBooksClient = axios.create({
//   baseURL: GOOGLE_BOOKS_BASE_URL,
//   timeout: 10000,
// });

// function buildTitle(resultsQuery) {
//   console.log('Building title for query:', resultsQuery);
//   return `Recommended Books for "${resultsQuery}"`;
// }

// function normalizeTitle(str) {
//   console.log('Normalizing title:', str);
//   return (str || '').toLowerCase().trim();
// }

// function buildOpenLibraryCover(doc) {
//   if (!doc.cover_i) return null;
//   return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
// }

// function normalizeCombinedBook(doc, googleMatch) {
//   const volumeInfo = googleMatch?.volumeInfo || {};

//   const title =
//     doc.title ||
//     volumeInfo.title ||
//     (Array.isArray(volumeInfo.subtitle)
//       ? volumeInfo.subtitle[0]
//       : volumeInfo.subtitle) ||
//     '';

//   const authors =
//     volumeInfo.authors ||
//     (Array.isArray(doc.author_name) ? doc.author_name : []);

//   const cover =
//     (volumeInfo.imageLinks && volumeInfo.imageLinks.thumbnail) ||
//     buildOpenLibraryCover(doc);

//   const publishedDate = volumeInfo.publishedDate || '';
//   const year =
//     doc.first_publish_year ||
//     (publishedDate ? parseInt(publishedDate.slice(0, 4), 10) || null : null);

//   return {
//     BookTitle: title,
//     BookCover: cover,
//     BookAuthor: authors && authors.length ? authors.join(', ') : null,
//     StarRating: volumeInfo.averageRating || null,
//     numberOfReviews: volumeInfo.ratingsCount || 0,
//     BookPageCount:
//       volumeInfo.pageCount || doc.number_of_pages_median || null,
//     BookYear: year,
//   };
// }

// async function searchOpenLibrary(query) {
//   console.log('Searching OpenLibrary for query:', query);
//   const response = await openLibraryClient.get('/search.json', {
//     params: {
//       q: query,
//       limit: 10,
//     },
//   });

//   return response.data?.docs || [];
// }

// async function searchGoogleBooks(query) {
//   const params = {
//     q: query,
//     maxResults: 20,
//   };

//   if (GOOGLE_BOOKS_API_KEY) {
//     params.key = GOOGLE_BOOKS_API_KEY;
//   }

//   const response = await googleBooksClient.get('/volumes', { params });
//   return response.data?.items || [];
// }

// /**
//  * Get combined recommendations from OpenLibrary and Google Books.
//  *
//  * @param {string} query
//  * @returns {Promise<{ Title: string, BookInfo: Array }>}
//  */
// async function getBookRecommendations(query) {
//   if (!query || typeof query !== 'string') {
//     const err = new Error('query is required and must be a string');
//     err.status = 400;
//     throw err;
//   }
//   console.log('Getting book recommendations for query:', query);

//   try {
//     const [openLibraryDocs, googleBooksItems] = await Promise.all([
//       searchOpenLibrary(query),
//       searchGoogleBooks(query),
//     ]);

//     const googleByTitle = new Map();
//     for (const item of googleBooksItems) {
//       const t = normalizeTitle(item.volumeInfo?.title);
//       if (t) {
//         if (!googleByTitle.has(t)) {
//           googleByTitle.set(t, item);
//         }
//       }
//     }

//     const bookInfo = openLibraryDocs.map((doc) => {
//       const key = normalizeTitle(doc.title);
//       const googleMatch = key ? googleByTitle.get(key) : undefined;
//       return normalizeCombinedBook(doc, googleMatch);
//     });

//     return {
//       Title: buildTitle(query),
//       BookInfo: bookInfo,
//     };
//   } catch (error) {
//     const err = new Error(
//       error.response?.data?.error?.message ||
//         error.response?.data?.message ||
//         error.message ||
//         'Failed to fetch book recommendations',
//     );
//     err.status = error.response?.status || 502;
//     throw err;
//   }
// }

// module.exports = {
//   getBookRecommendations,
// };

//const axios = require('axios');
// const { generateBookRecommendations } = require('./geminiService');

// const openLibraryClient = axios.create({
//   baseURL: 'https://openlibrary.org',
//   timeout: 10000,
// });

// // ─── Fetch a single book from OpenLibrary by title + author ───────────────────

// async function fetchBookFromOpenLibrary({ title, author, category }) {
//   try {
//     const response = await openLibraryClient.get('/search.json', {
//       params: {
//         q: `${title} ${author}`,  // title + author = precise match
//         limit: 1,
//         lang: 'eng',
//         sort: 'rating',
//         fields:
//           'key,title,author_name,cover_i,first_publish_year,number_of_pages_median,ratings_average,ratings_count',
//       },
//     });

//     const book = response.data?.docs?.[0];

//     if (!book) return null;

//     return {
//       category,
//       bookTitle: book.title || title,
//       bookAuthor: book.author_name?.[0] || author,
//       bookCover: book.cover_i
//         ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
//         : null,
//       bookYear: book.first_publish_year || null,
//       bookPageCount: book.number_of_pages_median || null,
//       starRating: book.ratings_average
//         ? Math.round(book.ratings_average * 10) / 10
//         : null,
//       numberOfReviews: book.ratings_count || 0,
//     };
//   } catch (error) {
//     console.error(
//       `OpenLibrary fetch failed for "${title}" by "${author}":`,
//       error.message,
//     );
//     return null;
//   }
// }

// // ─── Group books by category ──────────────────────────────────────────────────

// function groupBooksByCategory(books) {
//   const grouped = {};

//   for (const book of books) {
//     if (!book) continue;
//     if (!grouped[book.category]) {
//       grouped[book.category] = [];
//     }
//     const { category, ...bookData } = book; // remove category from book object
//     grouped[book.category].push(bookData);
//   }

//   return Object.entries(grouped).map(([title, bookInfo]) => ({
//     title,
//     bookInfo,
//   }));
// }

// // ─── Main service function ────────────────────────────────────────────────────

// /**
//  * Get book recommendations for a profession.
//  * 1. Gemini generates exact book titles + authors with categories
//  * 2. Fetch each book from OpenLibrary by title + author
//  * 3. Group by category and return structured response
//  *
//  * @param {string} profession
//  * @returns {Promise<Array<{ title: string, bookInfo: object[] }>>}
//  */
// async function getBookRecommendations(profession) {
//   // Step 1: Gemini generates specific books with categories
//   const recommendations = await generateBookRecommendations(profession);

//   // Step 2: Fetch all books from OpenLibrary in parallel
//   const fetchedBooks = await Promise.allSettled(
//     recommendations.map((book) => fetchBookFromOpenLibrary(book)),
//   );

//   // Filter out failed or null results
//   const validBooks = fetchedBooks
//     .filter((r) => r.status === 'fulfilled' && r.value !== null)
//     .map((r) => r.value);

//   if (validBooks.length === 0) {
//     return [];
//   }

//   // Step 3: Group by category
//   return groupBooksByCategory(validBooks);
// }

// module.exports = { getBookRecommendations };

// const axios = require('axios');
// const { generateBookRecommendations } = require('./geminiService');

// const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;
// if (!GOOGLE_BOOKS_API_KEY) throw new Error('GOOGLE_BOOKS_API_KEY is not set');

// // ─── Clients ──────────────────────────────────────────────────────────────────

// const openLibraryClient = axios.create({
//   baseURL: 'https://openlibrary.org',
//   timeout: 10000,
// });

// const googleBooksClient = axios.create({
//   baseURL: 'https://www.googleapis.com/books/v1',
//   timeout: 10000,
// });

// // ─── OpenLibrary fetcher ──────────────────────────────────────────────────────
// // Strength: free with no key, good for classic/older books,
// //           has ratings for well-known titles

// async function fetchFromOpenLibrary({ title, author, category }) {
//   try {
//     const response = await openLibraryClient.get('/search.json', {
//       params: {
//         q: `${title} ${author}`,
//         limit: 1,
//         lang: 'eng',
//         fields:
//           'key,title,author_name,cover_i,first_publish_year,number_of_pages_median,ratings_average,ratings_count',
//       },
//     });

//     const book = response.data?.docs?.[0];
//     if (!book) return null;

//     return {
//       category,
//       bookTitle: book.title || title,
//       bookAuthor: book.author_name?.[0] || author,
//       bookCover: book.cover_i
//         ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
//         : null,
//       bookYear: book.first_publish_year || null,
//       bookPageCount: book.number_of_pages_median || null,
//       starRating: book.ratings_average
//         ? Math.round(book.ratings_average * 10) / 10
//         : null,
//       numberOfReviews: book.ratings_count || 0,
//       bookDescription: null, // OpenLibrary rarely has descriptions in search
//       _source: 'openlibrary',
//     };
//   } catch (error) {
//     console.error(`OpenLibrary failed for "${title}":`, error.message);
//     return null;
//   }
// }

// // ─── Google Books fetcher ─────────────────────────────────────────────────────
// // Strength: 40M+ books, covers modern titles, consistent covers,
// //           rich descriptions, reliable ratings

// async function fetchFromGoogleBooks({ title, author, category }) {
//   try {
//     const response = await googleBooksClient.get('/volumes', {
//       params: {
//         q: `intitle:${title}+inauthor:${author}`, // precise search operators
//         maxResults: 1,
//         printType: 'books',
//         langRestrict: 'en',
//         orderBy: 'relevance',
//         key: GOOGLE_BOOKS_API_KEY,
//       },
//     });

//     const item = response.data?.items?.[0];
//     if (!item) return null;

//     const book = item.volumeInfo;

//     // Force HTTPS and bump zoom for higher-res cover
//     const rawCover =
//       book.imageLinks?.thumbnail ||
//       book.imageLinks?.smallThumbnail ||
//       null;
//     const bookCover = rawCover
//       ? rawCover.replace('http://', 'https://').replace('zoom=1', 'zoom=2')
//       : null;

//     return {
//       category,
//       bookTitle: book.title || title,
//       bookAuthor: book.authors?.[0] || author,
//       bookCover,
//       bookYear: book.publishedDate
//         ? parseInt(book.publishedDate.split('-')[0], 10)
//         : null,
//       bookPageCount: book.pageCount || null,
//       starRating: book.averageRating || null,
//       numberOfReviews: book.ratingsCount || 0,
//       bookDescription: book.description
//         ? `${book.description.slice(0, 200)}...`
//         : null,
//       _source: 'googlebooks',
//     };
//   } catch (error) {
//     console.error(`Google Books failed for "${title}":`, error.message);
//     return null;
//   }
// }

// // ─── Merge strategy ───────────────────────────────────────────────────────────
// // Fetch both in parallel, then pick the best fields from each.
// // Google Books wins for: cover, description, modern book ratings
// // OpenLibrary wins for: classic book ratings, review counts on older titles

// async function fetchBookData({ title, author, category }) {
//   // Fetch both in parallel — no waterfall, no wasted time
//   const [olResult, gbResult] = await Promise.allSettled([
//     fetchFromOpenLibrary({ title, author, category }),
//     fetchFromGoogleBooks({ title, author, category }),
//   ]);

//   const ol = olResult.status === 'fulfilled' ? olResult.value : null;
//   const gb = gbResult.status === 'fulfilled' ? gbResult.value : null;

//   // If both failed, return null
//   if (!ol && !gb) return null;

//   // If only one succeeded, return it
//   if (!ol) return gb;
//   if (!gb) return ol;

//   // Both succeeded — merge best fields from each
//   return {
//     category,
//     // Title/Author: Google Books more accurate for modern books
//     bookTitle: gb.bookTitle || ol.bookTitle,
//     bookAuthor: gb.bookAuthor || ol.bookAuthor,
//     // Cover: Google Books almost always has one; OL fallback for classics
//     bookCover: gb.bookCover || ol.bookCover,
//     // Year: OpenLibrary has first_publish_year; Google has edition year
//     // Prefer OpenLibrary for original publish year
//     bookYear: ol.bookYear || gb.bookYear,
//     // Page count: Google Books more reliable
//     bookPageCount: gb.bookPageCount || ol.bookPageCount,
//     // Ratings: use whichever has more reviews (more data = more reliable)
//     starRating:
//       (ol.numberOfReviews || 0) > (gb.numberOfReviews || 0)
//         ? ol.starRating
//         : gb.starRating || ol.starRating,
//     numberOfReviews: Math.max(ol.numberOfReviews || 0, gb.numberOfReviews || 0),
//     // Description: only Google Books provides this reliably
//     bookDescription: gb.bookDescription || null,
//   };
// }

// // ─── Group by category ────────────────────────────────────────────────────────

// function groupBooksByCategory(books) {
//   const grouped = {};

//   for (const book of books) {
//     if (!book) continue;
//     if (!grouped[book.category]) grouped[book.category] = [];
//     const { category, ...bookData } = book;
//     grouped[book.category].push(bookData);
//   }

//   return Object.entries(grouped).map(([title, bookInfo]) => ({
//     title,
//     bookInfo,
//   }));
// }

// // ─── Main ─────────────────────────────────────────────────────────────────────

// /**
//  * Get book recommendations for a profession.
//  *
//  * Flow:
//  * 1. Gemini generates 20 specific books with categories
//  * 2. For each book, fetch OpenLibrary + Google Books in parallel
//  * 3. Merge best fields from both sources per book
//  * 4. Group by category and return
//  *
//  * @param {string} profession
//  * @returns {Promise<Array<{ title: string, bookInfo: object[] }>>}
//  */
// async function getBookRecommendations(profession) {
//   // Step 1: Gemini generates specific books
//   const recommendations = await generateBookRecommendations(profession);

//   // Step 2 & 3: Fetch and merge all books in parallel
//   const fetchedBooks = await Promise.allSettled(
//     recommendations.map((book) => fetchBookData(book)),
//   );

//   const validBooks = fetchedBooks
//     .filter((r) => r.status === 'fulfilled' && r.value !== null)
//     .map((r) => r.value);

//   if (validBooks.length === 0) return [];

//   // Step 4: Group by category
//   return groupBooksByCategory(validBooks);
// }

// module.exports = { getBookRecommendations };

const axios = require('axios');
const { generateBookRecommendations } = require('./geminiService');
const { getCache, setCache,setPersonalCache,getPersonalCache ,isDbAvailable} = require('./cacheService');

const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;
if (!GOOGLE_BOOKS_API_KEY) throw new Error('GOOGLE_BOOKS_API_KEY is not set');

const openLibraryClient = axios.create({
  baseURL: 'https://openlibrary.org',
  timeout: 90000,
});

const googleBooksClient = axios.create({
  baseURL: 'https://www.googleapis.com/books/v1',
  timeout: 90000,
});
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function fetchInBatches(items, fetchFn, batchSize = 5, delayMs = 1500) {
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const batchResults = await Promise.allSettled(
      batch.map((item) => fetchFn(item)),
    );

    results.push(...batchResults);

    // Don't delay after the last batch
    if (i + batchSize < items.length) {
      await sleep(delayMs);
    }
  }

  return results;
}
// ─── fetchFromOpenLibrary — add linkUrl + linkType ────────────────────────────
async function fetchFromOpenLibrary({ title, author, category }, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const shortTitle = title.split(' ').slice(0, 4).join(' ');
      const shortAuthor = author.split(' ').slice(-1)[0];

      const response = await openLibraryClient.get('/search.json', {
        params: {
          q: `${shortTitle} ${shortAuthor}`,
          limit: 1,
          lang: 'eng',
          fields:
            'key,title,author_name,cover_i,first_publish_year,' +
            'number_of_pages_median,ratings_average,ratings_count,' +
            'ia,lending_edition_s,public_scan_b',   // ← new fields
        },
      });

      const book = response.data?.docs?.[0];
      if (!book) return null;

      // ── Determine best OL link ─────────────────────────────────────────────
      // public_scan_b=true means a full readable scan exists on archive.org
      // lending_edition_s means it can be borrowed (still a "read", not preview)
      // Otherwise fall back to the works info page
      let linkUrl = null;
      let linkType = null;

      if (book.public_scan_b && book.ia) {
        // Full text available on Internet Archive
        linkUrl = `https://archive.org/details/${book.ia[0]}`;
        linkType = 'read';
      } else if (book.lending_edition_s) {
        // Borrowable edition via OpenLibrary
        linkUrl = `https://openlibrary.org/books/${book.lending_edition_s}`;
        linkType = 'read';
      } else if (book.key) {
        // Info page only
        linkUrl = `https://openlibrary.org${book.key}`;
        linkType = 'info';
      }

      return {
        category,
        bookTitle: book.title || title,
        bookAuthor: book.author_name?.[0] || author,
        bookCover: book.cover_i
          ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
          : null,
        bookYear: book.first_publish_year || null,
        bookPageCount: book.number_of_pages_median || null,
        starRating: book.ratings_average
          ? Math.round(book.ratings_average * 10) / 10
          : null,
        numberOfReviews: book.ratings_count || 0,
        bookDescription: null,
        linkUrl,
        linkType,
        _source: 'openlibrary',
      };
    } catch (error) {
      const status = error.response?.status;
      if (status === 429 && attempt < retries) {
        console.warn(`[OpenLibrary] Rate limited for "${title}". Waiting ${3000 * attempt}ms...`);
        await sleep(3000 * attempt);
        continue;
      }
      console.error(`OpenLibrary failed for "${title}":`, error.message);
      return null;
    }
  }
  return null;
}
// async function fetchFromOpenLibrary({ title, author, category }, retries = 2) {
//   for (let attempt = 1; attempt <= retries; attempt++) {
//     try {
//       const shortTitle = title.split(' ').slice(0, 4).join(' ');
//       const shortAuthor = author.split(' ').slice(-1)[0];

//       const response = await openLibraryClient.get('/search.json', {
//         params: {
//           q: `${shortTitle} ${shortAuthor}`,
//           limit: 1,
//           lang: 'eng',
//           fields:
//             'key,title,author_name,cover_i,first_publish_year,number_of_pages_median,ratings_average,ratings_count',
//         },
//       });
//       const book = response.data?.docs?.[0];
//       if (!book) return null;

//       return {
//         category,
//         bookTitle: book.title || title,
//         bookAuthor: book.author_name?.[0] || author,
//         bookCover: book.cover_i
//           ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
//           : null,
//         bookYear: book.first_publish_year || null,
//         bookPageCount: book.number_of_pages_median || null,
//         starRating: book.ratings_average
//           ? Math.round(book.ratings_average * 10) / 10
//           : null,
//         numberOfReviews: book.ratings_count || 0,
//         bookDescription: null,
//         _source: 'openlibrary',
//       };
//     } catch (error) {
//       const status = error.response?.status;

//       if (status === 429 && attempt < retries) {
//         console.warn(
//           `[OpenLibrary] Rate limited for "${title}". Waiting 3s before retry ${attempt}/${retries}...`,
//         );
//         await sleep(3000 * attempt); // 3s, 6s
//         continue;
//       }

//       console.error(`OpenLibrary failed for "${title}":`, error.message);
//       continue;
//     }
//   }
//   return null;
// }

// async function fetchFromGoogleBooks({ title, author, category }, retries = 2) {
//   for (let attempt = 1; attempt <= retries; attempt++) {
//     try {
//       const response = await googleBooksClient.get('/volumes', {
//         params: {
//           q: `intitle:${title.split(' ').slice(0, 4).join(' ')}+inauthor:${author.split(' ').slice(-1)[0]}`,
//           maxResults: 1,
//           printType: 'books',
//           langRestrict: 'en',
//           orderBy: 'relevance',
//           key: GOOGLE_BOOKS_API_KEY,
//         },
//       });

//       const item = response.data?.items?.[0];
//       if (!item) return null;

//       const book = item.volumeInfo;
//       const rawCover =
//         book.imageLinks?.thumbnail ||
//         book.imageLinks?.smallThumbnail ||
//         null;
//       const bookCover = rawCover
//         ? rawCover.replace('http://', 'https://').replace('zoom=1', 'zoom=2')
//         : null;

//       return {
//         category,
//         bookTitle: book.title || title,
//         bookAuthor: book.authors?.[0] || author,
//         bookCover,
//         bookYear: book.publishedDate
//           ? parseInt(book.publishedDate.split('-')[0], 10)
//           : null,
//         bookPageCount: book.pageCount || null,
//         starRating: book.averageRating || null,
//         numberOfReviews: book.ratingsCount || 0,
//         bookDescription: book.description
//           ? `${book.description.slice(0, 200)}...`
//           : null,
//         _source: 'googlebooks',
//       };

  
//     } catch (error) {
//       const status = error.response?.status;

//       if ((status === 429 || status === 503) && attempt < retries) {
//         console.warn(
//           `[GoogleBooks] Rate limited for "${title}". Waiting 3s...`,
//         );
//         await sleep(3000 * attempt);
//         continue;
//       }

//       console.error(`Google Books failed for "${title}":`, error.message);
//       continue;
//     }
//   }
//   return null;
// }

// ─── fetchFromGoogleBooks — add linkUrl + linkType ────────────────────────────
async function fetchFromGoogleBooks({ title, author, category }, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await googleBooksClient.get('/volumes', {
        params: {
          q: `intitle:${title.split(' ').slice(0, 4).join(' ')}+inauthor:${author.split(' ').slice(-1)[0]}`,
          maxResults: 1,
          printType: 'books',
          langRestrict: 'en',
          orderBy: 'relevance',
          key: GOOGLE_BOOKS_API_KEY,
        },
      });

      const item = response.data?.items?.[0];
      if (!item) return null;

      const book = item.volumeInfo;
      const accessInfo = item.accessInfo;

      const rawCover =
        book.imageLinks?.thumbnail ||
        book.imageLinks?.smallThumbnail ||
        null;
      const bookCover = rawCover
        ? rawCover.replace('http://', 'https://').replace('zoom=1', 'zoom=2')
        : null;

      // ── Determine best GB link ─────────────────────────────────────────────
      // viewability: 'ALL_PAGES' = full preview, 'PARTIAL' = partial preview,
      // 'NO_PAGES' = no preview at all — fall back to infoLink
      let linkUrl = null;
      let linkType = null;

      const viewability = accessInfo?.viewability;
      const previewLink = book.previewLink
        ? book.previewLink.replace('http://', 'https://')
        : null;
      const infoLink = book.infoLink
        ? book.infoLink.replace('http://', 'https://')
        : null;

      if (viewability === 'ALL_PAGES' && previewLink) {
        linkUrl = previewLink;
        linkType = 'preview';    // GB "full preview" is still a preview, not a read
      } else if (viewability === 'PARTIAL' && previewLink) {
        linkUrl = previewLink;
        linkType = 'preview';
      } else if (infoLink) {
        linkUrl = infoLink;
        linkType = 'info';
      }

      return {
        category,
        bookTitle: book.title || title,
        bookAuthor: book.authors?.[0] || author,
        bookCover,
        bookYear: book.publishedDate
          ? parseInt(book.publishedDate.split('-')[0], 10)
          : null,
        bookPageCount: book.pageCount || null,
        starRating: book.averageRating || null,
        numberOfReviews: book.ratingsCount || 0,
        bookDescription: book.description
          ? `${book.description.slice(0, 200)}...`
          : null,
        linkUrl,
        linkType,
        _source: 'googlebooks',
      };
    } catch (error) {
      const status = error.response?.status;
      if ((status === 429 || status === 503) && attempt < retries) {
        console.warn(`[GoogleBooks] Rate limited for "${title}". Waiting ${3000 * attempt}ms...`);
        await sleep(3000 * attempt);
        continue;
      }
      console.error(`Google Books failed for "${title}":`, error.message);
      return null;
    }
  }
  return null;
}

// async function fetchBookData({ title, author, category }) {
//   const [olResult, gbResult] = await Promise.allSettled([
//     fetchFromOpenLibrary({ title, author, category }),
//     fetchFromGoogleBooks({ title, author, category }),
//   ]);

//   const ol = olResult.status === 'fulfilled' ? olResult.value : null;
//   const gb = gbResult.status === 'fulfilled' ? gbResult.value : null;

//   if (!ol && !gb) return null;
//   if (!ol) return gb;
//   if (!gb) return ol;

//   return {
//     category,
//     bookTitle: gb.bookTitle || ol.bookTitle,
//     bookAuthor: gb.bookAuthor || ol.bookAuthor,
//     bookCover: gb.bookCover || ol.bookCover,
//     bookYear: ol.bookYear || gb.bookYear,
//     bookPageCount: gb.bookPageCount || ol.bookPageCount,
//     starRating:
//       (ol.numberOfReviews || 0) > (gb.numberOfReviews || 0)
//         ? ol.starRating
//         : gb.starRating || ol.starRating,
//     numberOfReviews: Math.max(ol.numberOfReviews || 0, gb.numberOfReviews || 0),
//     bookDescription: gb.bookDescription || null,
//   };
// }

function groupBooksByCategory(books) {
  const grouped = {};
  for (const book of books) {
    if (!book) continue;
    if (!grouped[book.category]) grouped[book.category] = [];
    const { category, _source, ...bookData } = book;
    grouped[book.category].push(bookData);
  }
  return Object.entries(grouped).map(([title, bookInfo]) => ({
    title,
    bookInfo,
  }));
}
// ─── fetchBookData — merge with priority OL read > GB preview > GB info > OL info
async function fetchBookData({ title, author, category }) {
  const [olResult, gbResult] = await Promise.allSettled([
    fetchFromOpenLibrary({ title, author, category }),
    fetchFromGoogleBooks({ title, author, category }),
  ]);

  const ol = olResult.status === 'fulfilled' ? olResult.value : null;
  const gb = gbResult.status === 'fulfilled' ? gbResult.value : null;

  if (!ol && !gb) return null;
  if (!ol) return gb;
  if (!gb) return ol;

  // ── Link priority: OL read > GB preview > GB info > OL info ───────────────
  const rankLink = (src) => {
    if (!src?.linkType) return -1;
    if (src.linkType === 'read')    return 3;
    if (src.linkType === 'preview') return 2;
    if (src.linkType === 'info')    return 1;
    return -1;
  };

  const bestLink =
    rankLink(ol) >= rankLink(gb)
      ? { linkUrl: ol.linkUrl, linkType: ol.linkType }
      : { linkUrl: gb.linkUrl, linkType: gb.linkType };

  return {
    category,
    bookTitle: gb.bookTitle || ol.bookTitle,
    bookAuthor: gb.bookAuthor || ol.bookAuthor,
    bookCover: gb.bookCover || ol.bookCover,
    bookYear: ol.bookYear || gb.bookYear,
    bookPageCount: gb.bookPageCount || ol.bookPageCount,
    starRating:
      (ol.numberOfReviews || 0) > (gb.numberOfReviews || 0)
        ? ol.starRating
        : gb.starRating || ol.starRating,
    numberOfReviews: Math.max(ol.numberOfReviews || 0, gb.numberOfReviews || 0),
    bookDescription: gb.bookDescription || null,
    linkUrl: bestLink.linkUrl,
    linkType: bestLink.linkType,
  };
}

// ─── Fetch multiple books for a single CV keyword ─────────────────────────────

async function fetchBooksForKeyword(keyword, count = 5) {
  // Capitalize keyword for use as category title
  const categoryTitle = keyword
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  // Search OpenLibrary with the keyword directly
  // keyword is already specific e.g. "flutter development", "machine learning"
  const results = [];

  try {
    const response = await openLibraryClient.get('/search.json', {
      params: {
        q: keyword,
        limit: count * 2, // fetch more to account for failures
        lang: 'eng',
        fields:
          'key,title,author_name,cover_i,first_publish_year,number_of_pages_median,ratings_average,ratings_count',
      },
    });

    const docs = response.data?.docs || [];

    // Take the top results and format them
    for (const doc of docs.slice(0, count * 2)) {
      if (!doc.title) continue;
      results.push({
        title: doc.title,
        author: doc.author_name?.[0] || '',
        category: categoryTitle,
      });
    }
  } catch (error) {
    console.error(`[Books] Keyword search failed for "${keyword}":`, error.message);
    return [];
  }

  if (results.length === 0) return [];

  // Fetch full data (cover + ratings) for each found book
  const fetchedBooks = await fetchInBatches(
    results.slice(0, count),
    (book) => fetchBookData(book),
    3,
    800,
  );

  return fetchedBooks
    .filter((r) => r.status === 'fulfilled' && r.value !== null)
    .map((r) => r.value);
}

// async function fetchFreshBooks(profession, cvBookKeywords = [], userId = null) {
//   const start = Date.now();

//   // Gemini generates profession-specific book list (unchanged)
//   const recommendations = await generateBookRecommendations(profession);

//   // CV book keywords (e.g. "deep learning neural networks", "MLOps production")
//   // are used as direct OpenLibrary/Google Books search queries
//   // They are specific enough to search directly — no Gemini needed
//   const cvExtraRecs = cvBookKeywords.slice(0, 5).map((keyword) => ({
//     title: keyword,   // use keyword as search title
//     author: '',       // no specific author
//     category: 'Based on Your Skills', // grouped under this category
//   }));

//   const allRecs = [...recommendations, ...cvExtraRecs];

//   const fetchedBooks = await fetchInBatches(
//     allRecs,
//     (book) => fetchBookData(book),
//     5,
//     1500,
//   );

//   const validBooks = fetchedBooks
//     .filter((r) => r.status === 'fulfilled' && r.value !== null)
//     .map((r) => r.value);

//   if (validBooks.length === 0) return [];

//   const result = groupBooksByCategory(validBooks);
//   const bookCount = result.reduce((sum, s) => sum + s.bookInfo.length, 0);

//   if (userId) {
//     // Personal cache for CV users
//     await setPersonalCache('books', userId, result, {
//       fetchDurationMs: Date.now() - start,
//       bookCount,
//     });
//   } else {
//     // Shared profession cache
//     await setCache('books', profession, result, {
//       fetchDurationMs: Date.now() - start,
//       bookCount,
//     });
//   }

//   return result;
// }

async function fetchFreshBooks(profession, cvBookKeywords = [], userId = null) {
  const start = Date.now();

  // ── Part 1: Gemini profession-based recommendations (unchanged) ───────────
  const recommendations = await generateBookRecommendations(profession);

  const professionBooks = await fetchInBatches(
    recommendations,
    (book) => fetchBookData(book),
    3,
    1200,
  );

  const validProfessionBooks = professionBooks
    .filter((r) => r.status === 'fulfilled' && r.value !== null)
    .map((r) => r.value);
 
  // ── Part 2: CV keyword books (each keyword = its own category) ────────────
  let cvBooks = [];

  // if (cvBookKeywords.length > 0) {
  //   console.log(`[Books] Fetching CV keyword books for ${cvBookKeywords.length} keywords...`);

  //   // Fetch for each keyword sequentially to avoid rate limits
  //   for (const keyword of cvBookKeywords.slice(0, 5)) {
  //     console.log(`[Books] Fetching books for keyword: "${keyword}"`);
  //     const keywordBooks = await fetchBooksForKeyword(keyword, 5);
  //     cvBooks.push(...keywordBooks);

  //     // Small delay between keywords
  //     await sleep(2000);
  //   }

  //   console.log(`[Books] CV keyword books fetched: ${cvBooks.length}`);
  // }
  if (cvBookKeywords.length > 0) {
  const keywords = cvBookKeywords.slice(0, 5);
  console.log(`[Books] Fetching CV keyword books for ${keywords.length} keywords (2 at a time)...`);

  const CONCURRENCY = 2;
  for (let i = 0; i < keywords.length; i += CONCURRENCY) {
    const chunk = keywords.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.allSettled(
      chunk.map((keyword) => fetchBooksForKeyword(keyword, 5)),
    );
    for (const r of chunkResults) {
      if (r.status === 'fulfilled') cvBooks.push(...r.value);
    }
 
  }
  console.log(`[Books] CV keyword books fetched: ${cvBooks.length}`);
}
  // ── Merge all books ────────────────────────────────────────────────────────
  const allValidBooks = [...validProfessionBooks, ...cvBooks];
 if (allValidBooks.length === 0) {
    const err = new Error(
      'Could not retrieve book data at this time. Please try again later.',
    );
    err.status = 502;
    err.code   = 'BOOKS_UNAVAILABLE';
    throw err;   // ← surfaces to errorHandler → Flutter shows the message
  }

  const result = groupBooksByCategory(allValidBooks);
  const bookCount = result.reduce((sum, s) => sum + s.bookInfo.length, 0);

  console.log(`[Books] Total: ${bookCount} books across ${result.length} categories`);

  if (userId) {
    await setPersonalCache('books', userId, result, {
      fetchDurationMs: Date.now() - start,
      bookCount,
    });
  } else {
    await setCache('books', profession, result, {
      fetchDurationMs: Date.now() - start,
      bookCount,
    });
  }

  return result;
}

// ─── Main — two-tier cache lookup ─────────────────────────────────────────────

async function getBookRecommendations(profession, userId = null) {
  if (userId) {
    const personal = await getPersonalCache('books', userId);
    if (personal) return personal;
  }

  const shared = await getCache('books', profession);
  if (shared) return shared;
if (!isDbAvailable()) {
    const err = new Error(
      'No Internet connectivity. Please try again.',
    );
    err.status = 503;
    err.code   = 'DB_CONNECTION_ERROR';
    throw err;
  }
  return fetchFreshBooks(profession);
}

// async function getBookRecommendations(profession) {
//   const cached = await getCache('books', profession);
//   if (cached) return cached;

//   return fetchFreshBooks(profession);
// }

module.exports = { getBookRecommendations, fetchFreshBooks };