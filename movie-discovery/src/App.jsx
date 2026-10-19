
import { useEffect, useState } from 'react';
import './App.css';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const API_BASE = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

function App() {
  const [page, setPage] = useState('Home');
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [watchlist, setWatchlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('moviebox-watchlist') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!API_KEY) {
      setError('TMDB API key is missing. Check your .env file.');
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/genre/movie/list?api_key=${API_KEY}`)
      .then((response) => {
        if (!response.ok) throw new Error('Could not load genres');
        return response.json();
      })
      .then((data) => setGenres(data.genres || []))
      .catch(() => setGenres([]));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMovies() {
      setLoading(true);
      setError('');

      try {
        let endpoint;

        if (search.trim()) {
          endpoint = `${API_BASE}/search/${page === 'TV Shows' ? 'tv' : 'movie'}?api_key=${API_KEY}&query=${encodeURIComponent(search.trim())}`;
        } else if (page === 'TV Shows') {
          endpoint = `${API_BASE}/tv/popular?api_key=${API_KEY}`;
        } else if (genre && page !== 'My Watchlist') {
          endpoint = `${API_BASE}/discover/movie?api_key=${API_KEY}&with_genres=${genre}&sort_by=popularity.desc`;
        } else {
          endpoint = `${API_BASE}/movie/popular?api_key=${API_KEY}`;
        }

        const response = await fetch(endpoint);

        if (!response.ok) {
          throw new Error(
            response.status === 401
              ? 'TMDB rejected the API key. Check your .env file.'
              : 'Could not load movies. Please try again.'
          );
        }

        const data = await response.json();

        if (!cancelled) {
          let results = data.results || [];

          if (page === 'My Watchlist') {
            results = results.filter((item) =>
              watchlist.some((saved) => saved.id === item.id)
            );
          }

          setMovies(results);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Something went wrong.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMovies();

    return () => {
      cancelled = true;
    };
  }, [search, page, genre, watchlist]);

  function toggleWatchlist(movie) {
    setWatchlist((current) => {
      const exists = current.some((item) => item.id === movie.id);
      const updated = exists
        ? current.filter((item) => item.id !== movie.id)
        : [...current, { ...movie, media_type: page === 'TV Shows' ? 'tv' : 'movie' }];

      localStorage.setItem('moviebox-watchlist', JSON.stringify(updated));
      return updated;
    });
  }

  function openPage(nextPage) {
    setPage(nextPage);
    setSearch('');
    setGenre('');
    setSelectedMovie(null);
  }

  function isSaved(movie) {
    return watchlist.some((item) => item.id === movie.id);
  }

  function movieTitle(movie) {
    return movie.title || movie.name || 'Untitled';
  }

  function movieYear(movie) {
    const date = movie.release_date || movie.first_air_date;
    return date ? date.slice(0, 4) : 'Year unknown';
  }

  function movieGenres(movie) {
    return (movie.genre_ids || [])
      .map((id) => genres.find((item) => item.id === id)?.name)
      .filter(Boolean)
      .slice(0, 2)
      .join(' · ') || 'Discover';
  }

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => openPage('Home')}>
          <span className="brand-icon">M</span> MOVIEBOX
        </button>

        <input
          className="search"
          type="search"
          placeholder={page === 'TV Shows' ? 'Search TV shows...' : 'Search movies...'}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search titles"
        />

        <span className="profile" title="MovieBox">🎬</span>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <p className="menu-label">EXPLORE</p>

          {['Home', 'Movies', 'TV Shows', 'My Watchlist'].map((item) => (
            <button
              key={item}
              className={`nav-item ${page === item ? 'active' : ''}`}
              onClick={() => openPage(item)}
            >
              {item === 'Home' && '⌂'}
              {item === 'Movies' && '▣'}
              {item === 'TV Shows' && '▤'}
              {item === 'My Watchlist' && '♡'}
              <span>{item}</span>
            </button>
          ))}

          <div className="sidebar-note">
            <span>🍿</span>
            <p>Find your next favourite story.</p>
          </div>
        </aside>

        <main className="content">
          <section className="hero">
            <div className="hero-copy">
              <span className="eyebrow">YOUR MOVIE DESTINATION</span>
              <h1>Discover stories<br />worth watching.</h1>
              <p>Explore popular films and shows, discover new favourites, and build your personal watchlist.</p>
              <button className="primary-button" onClick={() => openPage('Movies')}>
                Explore Movies →
              </button>
            </div>
            <div className="hero-art" aria-hidden="true">
              <span>🎞️</span><span>🍿</span><span>🎬</span>
            </div>
          </section>

          {selectedMovie ? (
            <section className="details">
              <button className="back-button" onClick={() => setSelectedMovie(null)}>
                ← Back to titles
              </button>

              {selectedMovie.poster_path ? (
                <img
                  className="detail-poster"
                  src={`${IMAGE_BASE}${selectedMovie.poster_path}`}
                  alt={`${movieTitle(selectedMovie)} poster`}
                />
              ) : (
                <div className="detail-poster">🎬</div>
              )}

              <div>
                <span className="eyebrow">TITLE DETAILS</span>
                <h2>{movieTitle(selectedMovie)}</h2>
                <p>{movieYear(selectedMovie)} · {movieGenres(selectedMovie)}</p>
                <p>⭐ {Number(selectedMovie.vote_average || 0).toFixed(1)} / 10</p>
                <p>{selectedMovie.overview || 'No overview is available for this title.'}</p>
                <button
                  className="primary-button"
                  onClick={() => toggleWatchlist(selectedMovie)}
                >
                  {isSaved(selectedMovie) ? '♥ Remove from Watchlist' : '♡ Add to Watchlist'}
                </button>
              </div>
            </section>
          ) : (
            <>
              <section className="section-heading">
                <div>
                  <span className="eyebrow">POWERED BY TMDB</span>
                  <h2>
                    {page === 'My Watchlist'
                      ? 'My Watchlist'
                      : page === 'TV Shows'
                        ? 'Popular TV Shows'
                        : page === 'Movies'
                          ? 'Explore Movies'
                          : 'Popular Movies'}
                  </h2>
                </div>
                <span className="result-count">{movies.length} titles</span>
              </section>

              {page !== 'TV Shows' && page !== 'My Watchlist' && (
                <div style={{ marginBottom: 22 }}>
                  <label htmlFor="genre-filter" style={{ marginRight: 10, color: '#a3afb5' }}>
                    Filter by genre:
                  </label>
                  <select
                    id="genre-filter"
                    value={genre}
                    onChange={(event) => setGenre(event.target.value)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      color: '#f5f7f7',
                      background: '#151a1d',
                      border: '1px solid #ffffff25'
                    }}
                  >
                    <option value="">All genres</option>
                    {genres.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {loading ? (
                <div className="empty-state">Loading movies for you… 🍿</div>
              ) : error ? (
                <div className="empty-state">
                  <p>{error}</p>
                  <button className="primary-button" onClick={() => setSearch(search)}>
                    Try again
                  </button>
                </div>
              ) : movies.length === 0 ? (
                <div className="empty-state">
                  {page === 'My Watchlist'
                    ? 'Your watchlist is empty. Save a movie to see it here.'
                    : 'No titles found. Try another search or genre.'}
                </div>
              ) : (
                <div className="movie-grid">
                  {movies.map((movie) => (
                    <article className="movie-card" key={movie.id}>
                      <button
                        className="poster"
                        onClick={() => setSelectedMovie(movie)}
                        aria-label={`View details for ${movieTitle(movie)}`}
                      >
                        {movie.poster_path ? (
                          <img
                            src={`${IMAGE_BASE}${movie.poster_path}`}
                            alt={`${movieTitle(movie)} poster`}
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <span className="poster-emoji">🎬</span>
                        )}
                        <span className="poster-year">{movieYear(movie)}</span>
                      </button>

                      <div className="movie-info">
                        <button
                          className="movie-title"
                          onClick={() => setSelectedMovie(movie)}
                        >
                          {movieTitle(movie)}
                        </button>
                        <div className="movie-meta">
                          <span>{movieGenres(movie)}</span>
                          <span>⭐ {Number(movie.vote_average || 0).toFixed(1)}</span>
                        </div>
                        <button
                          className="watch-button"
                          onClick={() => toggleWatchlist(movie)}
                        >
                          {isSaved(movie) ? '♥ Saved' : '♡ Watchlist'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}

          <footer>
            MovieBox · Movie information provided by TMDB.
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;
