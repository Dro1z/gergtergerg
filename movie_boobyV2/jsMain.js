const OMDB_KEY = 'thewdb';
const TMDB_KEY = '720437f73a8915c2a43ae76c1c09f5da';
const TMDB_IMG = 'https://image.tmdb.org/t/p/';

const NO_IMAGE = './images/noimage.png';
const PERSONS  = ['oskaras', 'patrikas', 'erikas'];
const SLOT_W   = 134;
const CARD_W   = 126;

let S = {
  watched:        [],
  unwatched:      [],
  watchedShows:   [],
  unwatchedShows: [],
  customPool:     [],
  omdbCache:      {},
  tvCache:        {},
  persons: {
    oskaras:  { active: true, count: 2, picks: [null, null] },
    patrikas: { active: true, count: 2, picks: [null, null] },
    erikas:   { active: true, count: 2, picks: [null, null] }
  },
  watchedType:    'movies',
  instFilter:     false,
  watchedDir:     'desc',
  unwatchedDir:   'desc',
  spinSpeed:      1,
  tiebreaker:     false,
  bo3:            { on: false, round: 0, results: [] },
  autoRoll:       false,
  autoRolling:    false,
  skipPending:    false,
  spinWinner:     null,
  tiebreakerPool: null,
  spinning:       false,
  changeOdds:     false,
  spinWeights:    {},
  tmdbCache:      {},
  posterProvider: 'omdb',
  logoPos:        'top-left'
};

let _detailMovie  = null;
let _modalOpening = false;


function omdbEnc(title) {
  return encodeURIComponent(title).replace(/'/g, '%27').replace(/'/g, '%27');
}

function saveLocal() {
  try {
    localStorage.setItem('mn6_cp',    JSON.stringify(S.customPool));
    localStorage.setItem('mn6_cache', JSON.stringify(S.omdbCache));
    localStorage.setItem('mn6_tmdb',  JSON.stringify(S.tmdbCache));
    localStorage.setItem('mn6_tv',    JSON.stringify(S.tvCache));
    localStorage.setItem('mn6_pp',    S.posterProvider);
    localStorage.setItem('mn6_lp',    S.logoPos);
  } catch(e) {}
}

function loadLocal() {
  try {
    const cp = localStorage.getItem('mn6_cp');    if(cp) S.customPool = JSON.parse(cp);
    const ca = localStorage.getItem('mn6_cache'); if(ca) S.omdbCache  = JSON.parse(ca);
    const tm = localStorage.getItem('mn6_tmdb');  if(tm) S.tmdbCache  = JSON.parse(tm);
    const tv = localStorage.getItem('mn6_tv');    if(tv) S.tvCache    = JSON.parse(tv);
    const pp = localStorage.getItem('mn6_pp');    if(pp) S.posterProvider = pp;
    const lp = localStorage.getItem('mn6_lp');    if(lp) S.logoPos        = lp;
  } catch(e) {}
}

window.addEventListener('DOMContentLoaded', () => {
  loadLocal();
  parseJSFiles();
  renderAll();
  renderPersonPanels();
  renderCustomPool();
  updatePool();
  renderSettings();
  if(S.posterProvider === 'tmdb') fetchTMDBPosterBatch([...S.watched, ...S.unwatched]);
  document.getElementById('cmSearch').addEventListener('keydown', e => { if(e.key === 'Enter') searchOMDB('cm'); });
  document.getElementById('cmYear').addEventListener('keydown',   e => { if(e.key === 'Enter') searchOMDB('cm'); });
});

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function cKey(t, y) { return (t || '').toLowerCase().trim() + '|' + (y || '').trim(); }


function parseJSFiles() {
  const data = window.movieData || { watched: [], unwatched: [], watchedShows: [], unwatchedShows: [] };

  S.watched = Object.values(data.watched).map(entry => {
    const title  = entry.name;
    const year   = String(entry.year || '');
    const cached = S.omdbCache[cKey(title, year)] || {};
    return {
      id: uid(), title, year, watched: true,
      poster:       entry.poster  || cached.poster    || null,
      tmdbPoster:   cached.tmdbPosterPath ? TMDB_IMG + 'w500'     + cached.tmdbPosterPath : null,
      tmdbPosterHD: cached.tmdbPosterPath ? TMDB_IMG + 'original' + cached.tmdbPosterPath : null,
      imdbId:    cached.imdbId    || null,
      imdbScore: cached.imdbScore || null,
      plot:      cached.plot      || null,
      genre:     cached.genre     || null,
      runtime:   cached.runtime   || null,
      director:  cached.director  || null,
      actors:    cached.actors    || null,
      ratings: {
        o: entry.scores?.oskaras?.score  ?? null,
        p: entry.scores?.patrikas?.score ?? null,
        e: entry.scores?.erikas?.score   ?? null,
      },
      comments: {
        o: entry.scores?.oskaras?.comment  || null,
        p: entry.scores?.patrikas?.comment || null,
        e: entry.scores?.erikas?.comment   || null,
      }
    };
  });

  S.unwatched = Object.values(data.unwatched).map(entry => {
    const title  = entry.name;
    const year   = String(entry.year || '');
    const cached = S.omdbCache[cKey(title, year)] || {};
    return {
      id: uid(), title, year, watched: false,
      installed:    entry.installed || false,
      poster:       entry.poster  || cached.poster    || null,
      tmdbPoster:   cached.tmdbPosterPath ? TMDB_IMG + 'w500'     + cached.tmdbPosterPath : null,
      tmdbPosterHD: cached.tmdbPosterPath ? TMDB_IMG + 'original' + cached.tmdbPosterPath : null,
      imdbId:    cached.imdbId    || null,
      imdbScore: cached.imdbScore || null,
      plot:      cached.plot      || null,
      genre:     cached.genre     || null,
      runtime:   cached.runtime   || null,
      director:  cached.director  || null,
      actors:    cached.actors    || null,
      ratings: { o: null, p: null, e: null }
    };
  });

  S.watchedShows = (data.watchedShows || []).map(entry => ({
    id: uid(),
    title:          entry.name,
    year:           String(entry.year || ''),
    endYear:        entry.endYear ? String(entry.endYear) : null,
    isShow:         true,
    watched:        true,
    installed:      false,
    poster:         null,
    imdbScore:      null,
    episodeCount:   null,
    seasonCount:    null,
    episodeRuntime: null,
    tmdbId:         null,
    ratings: {
      o: entry.scores?.oskaras?.score  ?? null,
      p: entry.scores?.patrikas?.score ?? null,
      e: entry.scores?.erikas?.score   ?? null,
    },
    comments: {
      o: entry.scores?.oskaras?.comment  || null,
      p: entry.scores?.patrikas?.comment || null,
      e: entry.scores?.erikas?.comment   || null,
    }
  }));

  S.unwatchedShows = (data.unwatchedShows || []).map(entry => ({
    id: uid(),
    title:          entry.name,
    year:           String(entry.year || ''),
    endYear:        entry.endYear ? String(entry.endYear) : null,
    isShow:         true,
    watched:        false,
    installed:      entry.installed || false,
    poster:         null,
    imdbScore:      null,
    episodeCount:   null,
    seasonCount:    null,
    episodeRuntime: null,
    tmdbId:         null,
    ratings: { o: null, p: null, e: null },
    comments: { o: null, p: null, e: null }
  }));

  const all     = [...S.watched, ...S.unwatched];
  const missing = all.filter(m => m.title && !S.omdbCache[cKey(m.title, m.year)]);
  if(missing.length) fetchOMDBBatch(missing);

  const allShows = [...S.watchedShows, ...S.unwatchedShows];
  if(allShows.length) fetchTMDBShowBatch(allShows);
}


async function fetchOMDBBatch(movies) {
  for(const m of movies) {
    const key = cKey(m.title, m.year);
    if(S.omdbCache[key]) continue;
    try {
      const url = `https://www.omdbapi.com/?t=${omdbEnc(m.title)}&y=${m.year}&apikey=${OMDB_KEY}`;
      const d   = await fetchJSON(url);
      if(d && d.Response !== 'False') {
        S.omdbCache[key] = {
          poster:    d.Poster    !== 'N/A' ? d.Poster    : null,
          imdbId:    d.imdbID    || null,
          imdbScore: d.imdbRating !== 'N/A' ? parseFloat(d.imdbRating) : null,
          plot:      d.Plot      !== 'N/A' ? d.Plot      : null,
          genre:     d.Genre     !== 'N/A' ? d.Genre     : null,
          runtime:   d.Runtime   !== 'N/A' ? d.Runtime   : null,
          director:  d.Director  !== 'N/A' ? d.Director  : null,
          actors:    d.Actors    !== 'N/A' ? d.Actors    : null,
        };
        const patch = m.watched ? S.watched : S.unwatched;
        const idx   = patch.findIndex(x => cKey(x.title, x.year) === key);
        if(idx >= 0) Object.assign(patch[idx], S.omdbCache[key]);
      }
    } catch(e) {}
    await delay(220);
  }
  saveLocal();
  renderAll();
}

async function fetchOMDBSingle(title, year) {
  const key = cKey(title, year);
  if(S.omdbCache[key]) return S.omdbCache[key];
  try {
    const url = `https://www.omdbapi.com/?t=${omdbEnc(title)}&y=${year}&apikey=${OMDB_KEY}`;
    const d   = await fetchJSON(url);
    if(d && d.Response !== 'False') {
      S.omdbCache[key] = {
        poster:    d.Poster    !== 'N/A' ? d.Poster    : null,
        imdbId:    d.imdbID    || null,
        imdbScore: d.imdbRating !== 'N/A' ? parseFloat(d.imdbRating) : null,
        plot:      d.Plot      !== 'N/A' ? d.Plot      : null,
        genre:     d.Genre     !== 'N/A' ? d.Genre     : null,
        runtime:   d.Runtime   !== 'N/A' ? d.Runtime   : null,
        director:  d.Director  !== 'N/A' ? d.Director  : null,
        actors:    d.Actors    !== 'N/A' ? d.Actors    : null,
      };
      saveLocal();
      return S.omdbCache[key];
    }
  } catch(e) {}
  return null;
}


async function getTMDBShowData(title, year) {
  const key = cKey(title, year);
  if(S.tvCache[key]?.details) return S.tvCache[key];
  try {
    const search = await fetchTMDB(`/search/tv?query=${encodeURIComponent(title)}&first_air_date_year=${year}`);
    if(!search?.results?.length) return null;
    const id = search.results[0].id;
    const [details, images, credits, videos, extIds] = await Promise.all([
      fetchTMDB(`/tv/${id}`),
      fetchTMDB(`/tv/${id}/images?include_image_language=en,null`),
      fetchTMDB(`/tv/${id}/credits`),
      fetchTMDB(`/tv/${id}/videos`),
      fetchTMDB(`/tv/${id}/external_ids`)
    ]);
    const data = { id, details, images, credits, videos, extIds };
    S.tvCache[key] = data;
    saveLocal();
    return data;
  } catch(e) {}
  return null;
}

function applyTVDataToShow(s, data) {
  const d = data.details;
  s.tmdbId         = data.id;
  s.imdbId         = data.extIds?.imdb_id || null;
  s.poster         = d.poster_path ? TMDB_IMG + 'w500' + d.poster_path : null;
  s.imdbScore      = d.vote_average ? parseFloat(d.vote_average.toFixed(1)) : null;
  s.episodeCount   = d.number_of_episodes || null;
  s.seasonCount    = d.number_of_seasons  || null;
  s.episodeRuntime = d.episode_run_time?.[0] || null;
}

async function fetchTMDBShowBatch(shows) {
  for(const s of shows) {
    const key = cKey(s.title, s.year);
    if(S.tvCache[key]?.details) {
      applyTVDataToShow(s, S.tvCache[key]);
    } else {
      const data = await getTMDBShowData(s.title, s.year);
      if(data?.details) applyTVDataToShow(s, data);
    }
  }
  if(S.watchedType === 'shows') renderAll();
}


function switchPage(p) {
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  document.getElementById('page-' + p).classList.add('active');
}

function pSrc(m) { return (m.poster && m.poster !== 'N/A') ? m.poster : NO_IMAGE; }

function activePoster(m) {
  if(!m.isShow && S.posterProvider === 'tmdb' && m.tmdbPoster) return m.tmdbPoster;
  return pSrc(m);
}

function activePosterHD(m) {
  if(!m.isShow && S.posterProvider === 'tmdb' && m.tmdbPosterHD) return m.tmdbPosterHD;
  return pSrc(m);
}

function cardImg(m) {
  const src = activePoster(m);
  if(src && src !== NO_IMAGE) return `<img class="card-img" data-src="${src}" alt="${esc(m.title)}" src="${NO_IMAGE}">`;
  return `<img class="card-img" src="${NO_IMAGE}" alt="${esc(m.title)}">`;
}

function showYearRange(s) {
  return s.endYear ? `${s.year} \u2013 ${s.endYear}` : `${s.year} \u2013 Now`;
}

function formatRuntime(rt) {
  const mins = runtimeMins(rt);
  if(!rt || mins === 0) return rt;
  const h = Math.floor(mins / 60), m = mins % 60;
  if(h === 0) return rt;
  return rt + ' (' + h + 'h' + (m > 0 ? ' ' + m + 'min' : '') + ')';
}

function runtimeMins(rt) {
  if(!rt) return 0;
  const m = rt.match(/(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

function avgScore(m) {
  const v = [m.ratings?.o, m.ratings?.p, m.ratings?.e].filter(x => x != null);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0;
}

function sortMovies(list, key, dir) {
  const s    = [...list];
  const flip = dir === 'asc';
  let sorted;
  switch(key) {
    case 'imdb':       sorted = s.sort((a, b) => (b.imdbScore || 0) - (a.imdbScore || 0)); break;
    case 'year':       sorted = s.sort((a, b) => parseInt(b.year || 0) - parseInt(a.year || 0)); break;
    case 'runtime':    sorted = s.sort((a, b) => runtimeMins(b.runtime) - runtimeMins(a.runtime)); break;
    case 'rating_all': sorted = s.sort((a, b) => avgScore(b) - avgScore(a)); break;
    case 'rating_osk': sorted = s.sort((a, b) => (b.ratings?.o || 0) - (a.ratings?.o || 0)); break;
    case 'rating_pat': sorted = s.sort((a, b) => (b.ratings?.p || 0) - (a.ratings?.p || 0)); break;
    case 'rating_eri': sorted = s.sort((a, b) => (b.ratings?.e || 0) - (a.ratings?.e || 0)); break;
    default:           sorted = s.sort((a, b) => a.title.localeCompare(b.title)); break;
  }
  return flip ? sorted.reverse() : sorted;
}


function setWatchedType(type) {
  if(type === S.watchedType) return;
  S.watchedType = type;
  document.getElementById('typeBtnMovies')?.classList.toggle('active', type === 'movies');
  document.getElementById('typeBtnShows')?.classList.toggle('active', type === 'shows');
  document.getElementById('typeBtnMoviesUw')?.classList.toggle('active', type === 'movies');
  document.getElementById('typeBtnShowsUw')?.classList.toggle('active', type === 'shows');
  renderAll();
}

function renderAll() { renderWatched(); renderUnwatched(); }

function renderWatched() {
  const q       = (document.getElementById('watchedSearch')?.value || '').toLowerCase();
  const sortKey = document.getElementById('watchedSort')?.value || 'az';

  if(S.watchedType === 'shows') {
    renderWatchedShows(q, sortKey);
    return;
  }

  const list = sortMovies(S.watched.filter(m => !q || m.title.toLowerCase().includes(q)), sortKey, S.watchedDir);
  document.getElementById('watchedCount').textContent = list.length + ' film' + (list.length !== 1 ? 's' : '');

  const g = document.getElementById('watchedGrid');
  if(!list.length) {
    g.innerHTML = `<div class="empty">
      <div class="empty-t">${q ? 'Nothing found' : !S.watched.length ? 'No movies loaded' : 'No results'}</div>
      <div class="empty-s">${q ? 'Try a different search' : 'Add entries to data.js'}</div>
    </div>`;
    return;
  }

  g.innerHTML = list.map(m => {
    const t10 = m.ratings.o === 10 && m.ratings.p === 10 && m.ratings.e === 10;
    return `
    <div class="card${t10 ? ' triple-ten' : ''}" onclick="openWatched('${m.id}')">
      ${cardImg(m)}
      <div class="card-body">
        <div class="card-title">${esc(m.title)}</div>
        <div class="card-year">${m.year || ''}</div>
        ${m.imdbScore ? `<div class="card-imdb"><span class="imdb-pill">IMDb</span><span class="imdb-val">${m.imdbScore}</span></div>` : ''}
        <div class="card-ratings">
          ${ratingRow('Oskaras',  m.ratings.o)}
          ${ratingRow('Patrikas', m.ratings.p)}
          ${ratingRow('Erikas',   m.ratings.e)}
        </div>
      </div>
    </div>`;
  }).join('');

  loadPostersSequentially(g, list);
}

function renderWatchedShows(q, sortKey) {
  const list = sortMovies(S.watchedShows.filter(s => !q || s.title.toLowerCase().includes(q)), sortKey, S.watchedDir);
  document.getElementById('watchedCount').textContent = list.length + ' show' + (list.length !== 1 ? 's' : '');

  const g = document.getElementById('watchedGrid');
  if(!list.length) {
    g.innerHTML = `<div class="empty">
      <div class="empty-t">${q ? 'Nothing found' : !S.watchedShows.length ? 'No shows loaded' : 'No results'}</div>
      <div class="empty-s">${q ? 'Try a different search' : 'Add entries to watchedShows in data.js'}</div>
    </div>`;
    return;
  }

  g.innerHTML = list.map(s => {
    const t10 = s.ratings.o === 10 && s.ratings.p === 10 && s.ratings.e === 10;
    return `
    <div class="card${t10 ? ' triple-ten' : ''}" onclick="openWatchedShow('${s.id}')">
      ${cardImg(s)}
      <div class="card-body">
        <div class="card-title">${esc(s.title)}</div>
        <div class="card-year">${showYearRange(s)}</div>
        ${s.imdbScore ? `<div class="card-imdb"><span class="imdb-pill">TMDB</span><span class="imdb-val">${s.imdbScore}</span></div>` : ''}
        ${(s.episodeCount || s.episodeRuntime) ? `
        <div class="card-show-info">
          ${s.episodeCount   ? `<span>${s.episodeCount} eps</span>` : ''}
          ${s.episodeRuntime ? `<span>~${s.episodeRuntime} min</span>` : ''}
        </div>` : ''}
        <div class="card-ratings">
          ${ratingRow('Oskaras',  s.ratings.o)}
          ${ratingRow('Patrikas', s.ratings.p)}
          ${ratingRow('Erikas',   s.ratings.e)}
        </div>
      </div>
    </div>`;
  }).join('');

  loadPostersSequentially(g, list);
}

function ratingRow(name, val) {
  if(val == null) return '';
  const ten = val === 10;
  return `<div class="cr-row"><span${ten ? ' class="cr-ten"' : ''}>${name}</span><span class="cr-val${ten ? ' cr-ten' : ''}">${val}</span></div>`;
}

function toggleInst() {
  S.instFilter = !S.instFilter;
  document.getElementById('instChip').classList.toggle('on', S.instFilter);
  renderUnwatched();
}

function renderUnwatched() {
  const q       = (document.getElementById('unwatchedSearch')?.value || '').toLowerCase();
  const sortKey = document.getElementById('unwatchedSort')?.value || 'az';

  if(S.watchedType === 'shows') {
    renderUnwatchedShows(q, sortKey);
    return;
  }

  let list = S.unwatched.filter(m => !q || m.title.toLowerCase().includes(q));
  if(S.instFilter) list = list.filter(m => m.installed);
  list = sortMovies(list, sortKey, S.unwatchedDir);

  document.getElementById('unwatchedCount').textContent = list.length + ' film' + (list.length !== 1 ? 's' : '');

  const g = document.getElementById('unwatchedGrid');
  if(!list.length) {
    g.innerHTML = `<div class="empty"><div class="empty-t">${q || S.instFilter ? 'Nothing found' : !S.unwatched.length ? 'No movies loaded' : 'No results'}</div></div>`;
    return;
  }

  g.innerHTML = list.map(m => `
    <div class="card" onclick="openUnwatched('${m.id}')">
      ${m.installed ? '<div class="inst-tag">Installed</div>' : ''}
      ${cardImg(m)}
      <div class="card-body">
        <div class="card-title">${esc(m.title)}</div>
        <div class="card-year">${m.year || ''}</div>
        ${m.imdbScore ? `<div class="card-imdb"><span class="imdb-pill">IMDb</span><span class="imdb-val">${m.imdbScore}</span></div>` : ''}
      </div>
    </div>`).join('');

  loadPostersSequentially(g, list);
}

function renderUnwatchedShows(q, sortKey) {
  let list = S.unwatchedShows.filter(s => !q || s.title.toLowerCase().includes(q));
  if(S.instFilter) list = list.filter(s => s.installed);
  list = sortMovies(list, sortKey, S.unwatchedDir);

  document.getElementById('unwatchedCount').textContent = list.length + ' show' + (list.length !== 1 ? 's' : '');

  const g = document.getElementById('unwatchedGrid');
  if(!list.length) {
    g.innerHTML = `<div class="empty"><div class="empty-t">${q || S.instFilter ? 'Nothing found' : !S.unwatchedShows.length ? 'No shows loaded' : 'No results'}</div></div>`;
    return;
  }

  g.innerHTML = list.map(s => `
    <div class="card" onclick="openUnwatchedShow('${s.id}')">
      ${s.installed ? '<div class="inst-tag">Installed</div>' : ''}
      ${cardImg(s)}
      <div class="card-body">
        <div class="card-title">${esc(s.title)}</div>
        <div class="card-year">${showYearRange(s)}</div>
        ${s.imdbScore ? `<div class="card-imdb"><span class="imdb-pill">TMDB</span><span class="imdb-val">${s.imdbScore}</span></div>` : ''}
        ${(s.episodeCount || s.episodeRuntime) ? `
        <div class="card-show-info">
          ${s.episodeCount   ? `<span>${s.episodeCount} eps</span>` : ''}
          ${s.episodeRuntime ? `<span>~${s.episodeRuntime} min</span>` : ''}
        </div>` : ''}
      </div>
    </div>`).join('');

  loadPostersSequentially(g, list);
}

async function loadPostersSequentially(grid, movies) {
  for(let i = 0; i < grid.children.length; i++) {
    const card = grid.children[i];
    const m    = movies[i];
    if(!m) { card.classList.add('visible'); continue; }
    const img = card.querySelector('img[data-src]');
    if(img) {
      await new Promise(res => {
        const src = img.getAttribute('data-src');
        img.removeAttribute('data-src');
        const t = setTimeout(() => { img.src = NO_IMAGE; res(); }, 5000);
        img.onload  = () => { clearTimeout(t); res(); };
        img.onerror = () => { clearTimeout(t); img.src = NO_IMAGE; res(); };
        img.src = src;
      });
    }
    requestAnimationFrame(() => card.classList.add('visible'));
    await delay(80);
  }
}


async function openWatched(id) {
  if(_modalOpening) return;
  _modalOpening = true;
  const m = S.watched.find(x => x.id === id);
  if(!m) { _modalOpening = false; return; }
  _detailMovie = m;
  document.getElementById('detMTtl').textContent = m.title;
  document.getElementById('detMBody').innerHTML = `<div class="ld"><div class="ld-spin"></div>Loading...</div>`;
  openM('detailM');
  const modal = document.querySelector('#detailM .modal');
  const t10   = m.ratings.o === 10 && m.ratings.p === 10 && m.ratings.e === 10;
  modal.classList.toggle('golden', t10);
  const data = await fetchOMDBSingle(m.title, m.year);
  if(data) Object.assign(m, data);
  document.getElementById('detMBody').innerHTML = detailHTML(m, true);
  _modalOpening = false;
}

async function openWatchedShow(id) {
  if(_modalOpening) return;
  _modalOpening = true;
  const s = S.watchedShows.find(x => x.id === id);
  if(!s) { _modalOpening = false; return; }
  _detailMovie = s;
  document.getElementById('detMTtl').textContent = s.title;
  document.getElementById('detMBody').innerHTML = `<div class="ld"><div class="ld-spin"></div>Loading...</div>`;
  openM('detailM');
  const modal = document.querySelector('#detailM .modal');
  const t10   = s.ratings.o === 10 && s.ratings.p === 10 && s.ratings.e === 10;
  modal.classList.toggle('golden', t10);
  const omdb = await fetchOMDBSingle(s.title, s.year);
  if(omdb) {
    if(!s.imdbId && omdb.imdbId)  s.imdbId    = omdb.imdbId;
    if(omdb.imdbScore != null)    s.omdbScore = omdb.imdbScore;
    if(omdb.plot)                 s.plot      = omdb.plot;
    if(omdb.genre)                s.genre     = omdb.genre;
  }
  document.getElementById('detMBody').innerHTML = showDetailHTML(s, true);
  _modalOpening = false;
}

async function openUnwatched(id) {
  if(_modalOpening) return;
  _modalOpening = true;
  const m = S.unwatched.find(x => x.id === id);
  if(!m) { _modalOpening = false; return; }
  _detailMovie = m;
  document.getElementById('uwDetTtl').textContent = m.title;
  const findBtn   = document.getElementById('uwDetFind');
  const findYrBtn = document.getElementById('uwDetFindYr');
  if(!m.installed) {
    findBtn.href   = `https://1337x.to/search/${m.title.toLowerCase().replace(/\s+/g, '+')}/1/`;
    findBtn.style.display = '';
    findYrBtn.href = `https://1337x.to/search/${(m.title + ' ' + (m.year || '')).toLowerCase().replace(/\s+/g, '+')}/1/`;
    findYrBtn.style.display = '';
  } else {
    findBtn.style.display   = 'none';
    findYrBtn.style.display = 'none';
  }
  document.getElementById('uwDetBody').innerHTML = `<div class="ld"><div class="ld-spin"></div>Loading...</div>`;
  openM('uwDetailM');
  const data = await fetchOMDBSingle(m.title, m.year);
  if(data) Object.assign(m, data);
  document.getElementById('uwDetBody').innerHTML = detailHTML(m, false);
  _modalOpening = false;
}

async function openUnwatchedShow(id) {
  if(_modalOpening) return;
  _modalOpening = true;
  const s = S.unwatchedShows.find(x => x.id === id);
  if(!s) { _modalOpening = false; return; }
  _detailMovie = s;
  document.getElementById('uwDetTtl').textContent = s.title;
  const findBtn   = document.getElementById('uwDetFind');
  const findYrBtn = document.getElementById('uwDetFindYr');
  if(!s.installed) {
    findBtn.href   = `https://1337x.to/search/${s.title.toLowerCase().replace(/\s+/g, '+')}/1/`;
    findBtn.style.display = '';
    findYrBtn.href = `https://1337x.to/search/${(s.title + ' ' + (s.year || '')).toLowerCase().replace(/\s+/g, '+')}/1/`;
    findYrBtn.style.display = '';
  } else {
    findBtn.style.display   = 'none';
    findYrBtn.style.display = 'none';
  }
  document.getElementById('uwDetBody').innerHTML = `<div class="ld"><div class="ld-spin"></div>Loading...</div>`;
  openM('uwDetailM');
  const omdb = await fetchOMDBSingle(s.title, s.year);
  if(omdb) {
    if(!s.imdbId && omdb.imdbId)  s.imdbId    = omdb.imdbId;
    if(omdb.imdbScore != null)    s.omdbScore = omdb.imdbScore;
    if(omdb.plot)                 s.plot      = omdb.plot;
    if(omdb.genre)                s.genre     = omdb.genre;
  }
  document.getElementById('uwDetBody').innerHTML = showDetailHTML(s, false);
  _modalOpening = false;
}

function detailHTML(m, watched) {
  const trailerQ  = encodeURIComponent(m.title + ' ' + (m.year || '') + ' trailer');
  const cardSrc   = activePoster(m);
  const lightSrc  = activePosterHD(m);
  return `
    <div class="det-layout">
      <div class="det-poster-wrap" onclick="openLightbox('${lightSrc}')" style="cursor:zoom-in" title="Click to enlarge">
        <img src="${cardSrc}" alt="${esc(m.title)}" onerror="this.src='${NO_IMAGE}'">
      </div>
      <div class="det-meta-col">
        <div class="det-title">${esc(m.title)}</div>
        <div class="det-year">${m.year || ''}</div>
        ${m.genre ? `<div class="det-tags">${m.genre.split(',').map(g => `<span class="det-tag">${g.trim()}</span>`).join('')}</div>` : ''}
        ${m.imdbScore ? `<div class="det-imdb-row">
          <span class="imdb-pill">IMDb</span>
          <strong style="font-size:15px;font-variant-numeric:tabular-nums">${m.imdbScore}</strong>
          <span style="font-size:11px;color:var(--t3)">/10</span>
          ${m.imdbId ? `<a class="btn imdb-page-btn" href="https://www.imdb.com/title/${m.imdbId}/" target="_blank" rel="noopener" style="font-size:10px;padding:3px 9px;margin-left:8px;text-decoration:none">view imdb page</a>` : ''}
        </div>` : ''}
        ${m.runtime  ? `<div class="det-info-line"><strong>Runtime:</strong> ${formatRuntime(m.runtime)}</div>` : ''}
        ${m.director ? `<div class="det-info-line"><strong>Director:</strong> ${esc(m.director)}</div>` : ''}
        ${m.actors   ? `<div class="det-info-line"><strong>Cast:</strong> ${esc(m.actors)}</div>` : ''}
      </div>
    </div>
    ${m.plot ? `<div class="det-section-lbl">Plot</div><div class="det-plot">${esc(m.plot)}</div>` : ''}
    ${watched ? `
    <div class="det-section-lbl">Ratings</div>
    <div class="rat-rows">
      ${ratingStatic('Oskaras',  m.ratings.o, m.comments?.o)}
      ${ratingStatic('Patrikas', m.ratings.p, m.comments?.p)}
      ${ratingStatic('Erikas',   m.ratings.e, m.comments?.e)}
    </div>` : ''}
    <a class="trailer-btn" href="https://www.youtube.com/results?search_query=${trailerQ}" target="_blank" rel="noopener">Find movie trailer on YouTube</a>
  `;
}

function showDetailHTML(s, watched) {
  const trailerQ   = encodeURIComponent(s.title + ' ' + s.year + ' trailer');
  const hasRatings = watched && (s.ratings.o != null || s.ratings.p != null || s.ratings.e != null
                               || s.comments?.o || s.comments?.p || s.comments?.e);
  const displayScore = s.omdbScore ?? s.imdbScore;
  return `
    <div class="det-layout">
      <div class="det-poster-wrap" onclick="openLightbox('${pSrc(s)}')" style="cursor:zoom-in" title="Click to enlarge">
        <img src="${pSrc(s)}" alt="${esc(s.title)}" onerror="this.src='${NO_IMAGE}'">
      </div>
      <div class="det-meta-col">
        <div class="det-title">${esc(s.title)}</div>
        <div class="det-year">${showYearRange(s)}</div>
        ${s.genre ? `<div class="det-tags">${s.genre.split(',').map(g => `<span class="det-tag">${g.trim()}</span>`).join('')}</div>` : ''}
        ${(displayScore || s.imdbId) ? `<div class="det-imdb-row">
          ${displayScore ? `<span class="imdb-pill">IMDb</span>
          <strong style="font-size:15px;font-variant-numeric:tabular-nums">${displayScore}</strong>
          <span style="font-size:11px;color:var(--t3)">/10</span>` : ''}
          ${s.imdbId ? `<a class="btn imdb-page-btn" href="https://www.imdb.com/title/${s.imdbId}/" target="_blank" rel="noopener" style="font-size:10px;padding:3px 9px;margin-left:${displayScore ? '8px' : '0'};text-decoration:none">view imdb page</a>` : ''}
        </div>` : ''}
        ${s.episodeCount   ? `<div class="det-info-line"><strong>Episodes:</strong> ${s.episodeCount}</div>` : ''}
        ${s.seasonCount    ? `<div class="det-info-line"><strong>Seasons:</strong> ${s.seasonCount}</div>` : ''}
        ${s.episodeRuntime ? `<div class="det-info-line"><strong>Ep Runtime:</strong> ~${s.episodeRuntime} min</div>` : ''}
      </div>
    </div>
    ${s.plot ? `<div class="det-section-lbl">Plot</div><div class="det-plot">${esc(s.plot)}</div>` : ''}
    ${hasRatings ? `
    <div class="det-section-lbl">Ratings</div>
    <div class="rat-rows">
      ${ratingStatic('Oskaras',  s.ratings.o, s.comments?.o)}
      ${ratingStatic('Patrikas', s.ratings.p, s.comments?.p)}
      ${ratingStatic('Erikas',   s.ratings.e, s.comments?.e)}
    </div>` : ''}
    <a class="trailer-btn" href="https://www.youtube.com/results?search_query=${trailerQ}" target="_blank" rel="noopener">Find trailer on YouTube</a>
  `;
}

function openLightbox(src) {
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.94);z-index:999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;padding:20px';
  ov.onclick = () => ov.remove();
  ov.innerHTML = `<img src="${src}" style="max-height:90vh;max-width:90vw;border-radius:4px;object-fit:contain;box-shadow:0 0 60px rgba(0,0,0,.8)">`;
  document.body.appendChild(ov);
}

function ratingStatic(name, val, comment) {
  if(val == null && !comment) return '';
  const ten = val === 10;
  return `<div class="rr">
    <div class="rr-name${ten ? ' cr-ten' : ''}">${name}</div>
    ${val != null
      ? `<div class="rr-static${ten ? ' cr-ten' : ''}">${val}</div><span class="rr-hint">/10</span>`
      : `<div class="rr-static" style="color:var(--t3)">-</div>`
    }
    ${comment ? `<span class="rr-comment">"${esc(comment)}"</span>` : ''}
  </div>`;
}


function togglePerson(name) {
  const p = S.persons[name];
  p.active = !p.active;
  document.getElementById('pb-' + name).classList.toggle('on', p.active);
  renderPersonMovies(name);
  updatePool();
}

function chgCnt(name, d) {
  const p = S.persons[name];
  p.count = Math.max(1, Math.min(6, p.count + d));
  p.picks = Array.from({ length: p.count }, (_, i) => p.picks[i] || null);
  document.getElementById('cnt-' + name).textContent = p.count;
  renderPersonMovies(name);
  updatePool();
}

function renderPersonPanels() { PERSONS.forEach(renderPersonMovies); }

function renderPersonMovies(name) {
  const p    = S.persons[name];
  const c    = document.getElementById('picks-' + name);
  if(!p.active) { c.innerHTML = ''; return; }
  const list = S.unwatched.slice().sort((a, b) => a.title.localeCompare(b.title));
  c.innerHTML = Array.from({ length: p.count }, (_, i) => `
    <select class="pb-sel" data-p="${name}" data-s="${i}" onchange="onPickCh(this)">
      <option value="">- pick a movie -</option>
      ${list.map(m => `<option value="${m.id}" ${p.picks[i] === m.id ? 'selected' : ''}>${esc(m.title)}${m.year ? ' (' + m.year + ')' : ''}</option>`).join('')}
    </select>`).join('');
}

function onPickCh(sel) {
  S.persons[sel.dataset.p].picks[parseInt(sel.dataset.s)] = sel.value || null;
  updatePool();
}


function buildPool() {
  const pool = [], seen = new Set();
  PERSONS.forEach(name => {
    const p = S.persons[name];
    if(!p.active) return;
    p.picks.forEach(id => {
      if(!id || seen.has(id)) return;
      const m = S.unwatched.find(x => x.id === id);
      if(m) { seen.add(id); pool.push({ ...m, _t: 'reg' }); }
    });
  });
  S.customPool.forEach(cm => pool.push({ ...cm, _t: 'custom' }));
  return pool;
}

function calcOdds(pool) {
  if(S.changeOdds && Object.keys(S.spinWeights).length > 0) {
    const total = pool.reduce((s, m) => s + (S.spinWeights[m.id] || (m._t === 'custom' ? (parseFloat(m.pct) || 5) : 10)), 0);
    return pool.map(m => ({ ...m, pct: ((S.spinWeights[m.id] || (m._t === 'custom' ? (parseFloat(m.pct) || 5) : 10)) / total * 100) }));
  }
  const tc   = S.customPool.reduce((s, c) => s + (parseFloat(c.pct) || 0), 0);
  const regs = pool.filter(m => m._t === 'reg');
  const pr   = regs.length > 0 ? Math.max(0, 100 - tc) / regs.length : 0;
  return pool.map(m => ({ ...m, pct: m._t === 'custom' ? (parseFloat(m.pct) || 5) : pr }));
}

function updatePool() {
  const pool = buildPool();
  const ok   = pool.length >= 2;
  document.getElementById('spinBtn').disabled   = !ok || S.spinning;
  document.getElementById('spStatus').textContent =
    pool.length === 0 ? 'Select movies in the panel' :
    pool.length === 1 ? 'Need at least 2 movies'     : pool.length + ' movies';
  updatePreview(pool);
  const show = pool.length >= 2;
  document.getElementById('oddsPs').style.display      = show ? 'block' : 'none';
  document.getElementById('changeOddsRow').style.display = show ? '' : 'none';
  if(show) renderOdds(pool);
}

function renderOdds(pool) {
  const wo = calcOdds(pool);
  document.getElementById('oddsBody').innerHTML = wo.map(m => `
    <div class="odds-item">
      <span class="odds-t">${esc(m.title)}</span>
      ${S.changeOdds
        ? `<input type="number" min="1" max="100" step="0.5" value="${m.pct.toFixed(1)}"
             onchange="setSpinWeight('${m.id}', this.value)"
             style="width:46px;background:var(--s2);border:1px solid var(--b1);color:var(--t1);font-family:inherit;font-size:11px;padding:2px 4px;border-radius:3px;text-align:center;outline:none">
           <span style="font-size:10px;color:var(--t3)">%</span>`
        : `<div class="odds-bar"><div class="odds-fill" style="width:${Math.min(100, m.pct)}%"></div></div>
           <span class="odds-p">${m.pct.toFixed(1)}%</span>`
      }
    </div>`).join('');
}

function setSpinWeight(id, v) { S.spinWeights[id] = parseFloat(v) || 1; renderOdds(buildPool()); }

function onChangeOdds() {
  S.changeOdds = document.getElementById('changeOddsToggle').checked;
  if(!S.changeOdds) S.spinWeights = {};
  renderOdds(buildPool());
}

function onSpeedChange(v) {
  const n  = parseFloat(v);
  S.spinSpeed = (isNaN(n) || n <= 0) ? 1 : n;
  const el = document.getElementById('speedInput');
  if(el) el.value = S.spinSpeed;
}


function updatePreview(pool) {
  const strip = document.getElementById('spStrip');
  const empty = document.getElementById('spEmpty');
  if(!pool || pool.length < 1) {
    strip.innerHTML = '';
    strip.style.transform = 'translateX(0)';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';
  if(S.spinning) return;
  const vpW = document.getElementById('spVp').offsetWidth || 600;
  const n   = Math.ceil(vpW / SLOT_W) + 2;
  strip.style.transition = 'none';
  strip.style.transform  = 'translateX(0)';
  strip.innerHTML = Array.from({ length: n }, (_, i) => spCard(pool[i % pool.length], false)).join('');
}

function spCard(m, win) {
  return `<div class="sp-item${win ? ' winner' : ''}">
    <img src="${pSrc(m)}" alt="${esc(m.title)}" onerror="this.src='${NO_IMAGE}'">
    <div class="sp-item-lbl">${esc(m.title)}</div>
  </div>`;
}

let _spinTimer = null;
let _autoTimer = null;

function doSpin() {
  if(S.spinning) return;
  S.autoRolling = false;
  const pool = S.tiebreaker ? S.tiebreakerPool : buildPool();
  if(pool.length < 2) { toast('Need at least 2 movies', 'err'); return; }
  if(!S.tiebreaker && S.bo3.on && S.bo3.round >= 3) { S.bo3 = { ...S.bo3, round: 0, results: [] }; resetBo3UI(); }
  S.spinning    = true;
  S.skipPending = false;
  if(_spinTimer) { clearTimeout(_spinTimer); _spinTimer = null; }
  document.getElementById('spinBtn').disabled = true;
  document.getElementById('spEmpty').style.display = 'none';

  const wo     = S.tiebreaker ? pool : calcOdds(pool);
  const winner = wPick(wo);
  S.spinWinner = winner;

  const TOTAL = 70, WP = 56;
  const slots = Array.from({ length: TOTAL }, (_, i) => i === WP ? { ...winner, _w: true } : { ...wPick(wo), _w: false });
  const strip = document.getElementById('spStrip');
  strip.style.transition = 'none';
  strip.style.transform  = 'translateX(0)';
  strip.innerHTML = slots.map(s => spCard(s, false)).join('');

  const vpW     = document.getElementById('spVp').offsetWidth;
  const offset  = Math.floor((Math.random() - .5) * CARD_W * 0.92);
  const targetX = -(WP * SLOT_W + CARD_W / 2 - vpW / 2) + offset;
  const dur     = 6 / S.spinSpeed;
  const resolveMs = Math.round((dur + 0.4) * 1000);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    strip.style.transition = `transform ${dur}s cubic-bezier(0.05, 0.94, 0.2, 1)`;
    strip.style.transform  = `translateX(${targetX}px)`;
  }));
  _spinTimer = setTimeout(() => resolveSpinResult(), resolveMs);
}

function resolveSpinResult() {
  _spinTimer = null;
  const strip  = document.getElementById('spStrip');
  const WP     = 56;
  const el     = strip.children[WP];
  if(el) el.classList.add('winner');
  S.spinning   = false;
  const winner = S.spinWinner;

  if(S.tiebreaker) {
    S.tiebreaker     = false;
    S.tiebreakerPool = null;
    showResult(winner);
    document.getElementById('resSub').textContent = 'Tiebreaker - ' + winner.title;
    document.getElementById('spinBtn').disabled   = buildPool().length < 2;
    return;
  }

  if(S.bo3.on) {
    if(S.skipPending) {
      S.skipPending = false;
      instantHideSkip();
      finalizeBo3();
      return;
    }
    S.bo3.round++;
    S.bo3.results.push(winner);
    updateBo3UI();
    checkSkipButton();
    if(S.bo3.round >= 3) {
      instantHideSkip();
      finalizeBo3();
    } else if(S.autoRoll) {
      S.autoRolling = true;
      document.getElementById('spinBtn').disabled = true;
      _autoTimer = setTimeout(() => doSpin(), 1800);
    } else {
      document.getElementById('spinBtn').disabled = buildPool().length < 2;
    }
  } else {
    showResult(winner);
    document.getElementById('spinBtn').disabled = buildPool().length < 2;
  }
}

function wPick(pool) {
  const tot = pool.reduce((s, m) => s + (m.pct || 1), 0);
  let r = Math.random() * tot;
  for(const m of pool) { r -= (m.pct || 1); if(r <= 0) return m; }
  return pool[pool.length - 1];
}

function showResult(m) {
  document.getElementById('resBox').className   = 'res-box show';
  document.getElementById('resSub').textContent  = 'Winner';
  document.getElementById('resTitle').textContent = m.title;
  document.getElementById('resYear').textContent  = m.year || '';
  document.getElementById('resImdb').innerHTML    = m.imdbScore ? `<span class="imdb-pill">IMDb</span> <strong style="font-size:13px">${m.imdbScore}</strong>` : '';
  document.getElementById('resPoster').innerHTML  = `<img src="${pSrc(m)}" style="width:100%;height:100%;object-fit:cover;cursor:pointer" onerror="this.src='${NO_IMAGE}'" onclick="openWinnerDetail('${m.id}')">`;
  const findBtn   = document.getElementById('resFindBtn');
  const findYrBtn = document.getElementById('resFindYrBtn');
  findBtn.href   = `https://1337x.to/search/${m.title.toLowerCase().replace(/\s+/g, '+')}/1/`;
  findBtn.style.display = '';
  findYrBtn.href = `https://1337x.to/search/${(m.title + ' ' + (m.year || '')).toLowerCase().replace(/\s+/g, '+')}/1/`;
  findYrBtn.style.display = m.year ? '' : '';
}

async function openWinnerDetail(id) {
  const uw = S.unwatched.find(x => x.id === id);
  if(uw) { openUnwatched(id); return; }
  const cp = S.customPool.find(x => x.id === id);
  if(cp) {
    _detailMovie = cp;
    document.getElementById('uwDetTtl').textContent   = cp.title;
    document.getElementById('uwDetFind').style.display   = 'none';
    document.getElementById('uwDetFindYr').style.display = 'none';
    document.getElementById('uwDetBody').innerHTML = `<div class="ld"><div class="ld-spin"></div>Loading...</div>`;
    openM('uwDetailM');
    const data = await fetchOMDBSingle(cp.title, cp.year);
    if(data) Object.assign(cp, data);
    document.getElementById('uwDetBody').innerHTML = detailHTML(cp, false);
  }
}


function checkSkipButton() {
  if(!S.bo3.on || S.bo3.round < 2) return hideSkipBtn();
  const tally = {};
  S.bo3.results.forEach(r => { tally[r.title] = (tally[r.title] || 0) + 1; });
  const hasMatch = Object.values(tally).some(v => v >= 2);
  if(hasMatch) showSkipBtn();
  else hideSkipBtn();
}

function showSkipBtn() {
  const btn = document.getElementById('skipBtn');
  btn.style.display = 'block';
  requestAnimationFrame(() => requestAnimationFrame(() => btn.classList.add('visible')));
}

function hideSkipBtn() { fadeOutSkipBtn(); }

function skipBo3() {
  if(_autoTimer) { clearTimeout(_autoTimer); _autoTimer = null; }
  fadeOutSkipBtn();
  if(S.spinning) {
    S.skipPending = true;
    const strip = document.getElementById('spStrip');
    const mx    = new DOMMatrix(getComputedStyle(strip).transform);
    const curX  = mx.m41;
    const tgt   = parseFloat((strip.style.transform || 'translateX(0)').replace('translateX(', '').replace('px)', '')) || curX;
    strip.style.transition = 'none';
    strip.style.transform  = `translateX(${curX}px)`;
    const skipDur = 1.4 / S.spinSpeed;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      strip.style.transition = `transform ${skipDur}s cubic-bezier(0.1, 0.85, 0.3, 1)`;
      strip.style.transform  = `translateX(${tgt}px)`;
    }));
    if(_spinTimer) { clearTimeout(_spinTimer); _spinTimer = null; }
    _spinTimer = setTimeout(() => resolveSpinResult(), Math.round((skipDur + 0.1) * 1000));
    return;
  }
  instantHideSkip();
  finalizeBo3();
}

function fadeOutSkipBtn() {
  const btn = document.getElementById('skipBtn');
  btn.classList.remove('visible');
  setTimeout(() => { btn.style.display = 'none'; }, 1600);
}

function instantHideSkip() {
  const btn = document.getElementById('skipBtn');
  btn.classList.remove('visible');
  btn.style.display = 'none';
}

function toggleWatchedDir() {
  S.watchedDir = S.watchedDir === 'desc' ? 'asc' : 'desc';
  document.getElementById('watchedDirBtn').innerHTML = S.watchedDir === 'desc' ? '&#8595;' : '&#8593;';
  renderWatched();
}

function toggleUnwatchedDir() {
  S.unwatchedDir = S.unwatchedDir === 'desc' ? 'asc' : 'desc';
  document.getElementById('unwatchedDirBtn').innerHTML = S.unwatchedDir === 'desc' ? '&#8595;' : '&#8593;';
  renderUnwatched();
}

function onBo3Change() {
  const on = document.getElementById('bo3Toggle').checked;
  S.bo3 = { on, round: 0, results: [] };
  document.getElementById('bo3Box').classList.toggle('show', on);
  document.getElementById('autoRollOpt').style.display = on ? '' : 'none';
  if(!on) { document.getElementById('autoRollToggle').checked = false; S.autoRoll = false; S.autoRolling = false; }
  if(on)  document.getElementById('resBox').className = 'res-box';
  resetBo3UI();
}

function updateBo3UI() {
  document.getElementById('bo3Num').textContent = Math.min(S.bo3.round, 3);
  S.bo3.results.forEach((r, i) => {
    const el = document.getElementById('bo3r' + (i + 1));
    el.querySelector('.bo3-rv').textContent = r.title;
    el.classList.add('filled');
  });
}

function resetBo3UI() {
  ['bo3r1', 'bo3r2', 'bo3r3'].forEach((id, i) => {
    const el = document.getElementById(id);
    el.querySelector('.bo3-rv').innerHTML   = '-';
    el.querySelector('.bo3-rl').textContent = 'Round ' + (i + 1);
    el.classList.remove('filled', 'champ');
  });
  document.getElementById('bo3Lbl').innerHTML = 'Best of 3 - Round <span id="bo3Num">0</span>/3';
  S.tiebreaker     = false;
  S.tiebreakerPool = null;
  const rounds = document.getElementById('bo3Rounds');
  const tb     = document.getElementById('bo3Tb');
  if(tb.style.display === 'flex') {
    tb.style.opacity = '0';
    setTimeout(() => {
      tb.style.display     = 'none';
      rounds.style.display = 'flex';
      rounds.style.opacity = '0';
      requestAnimationFrame(() => requestAnimationFrame(() => { rounds.style.opacity = '1'; }));
    }, 300);
  } else {
    rounds.style.display = 'flex';
    rounds.style.opacity = '1';
  }
}

function finalizeBo3() {
  instantHideSkip();
  const tally = {};
  S.bo3.results.forEach(r => { tally[r.title] = (tally[r.title] || 0) + 1; });
  const winnerEntry = Object.entries(tally).find(([, v]) => v >= 2);
  if(!winnerEntry) {
    startTiebreaker(S.bo3.results[0], S.bo3.results[1]);
    return;
  }
  const winner      = winnerEntry[0];
  const winnerMovie = S.bo3.results.find(r => r.title === winner);
  if(winnerMovie) showResult(winnerMovie);
  S.bo3.results.forEach((r, i) => { if(r.title === winner) document.getElementById('bo3r' + (i + 1)).classList.add('champ'); });
  document.getElementById('resSub').textContent = 'Best of 3 - ' + winner;
  S.bo3.round = 3;
  document.getElementById('spinBtn').disabled = buildPool().length < 2;
}

function startTiebreaker(m1, m2) {
  const lbl    = document.getElementById('bo3Lbl');
  const rounds = document.getElementById('bo3Rounds');
  const tb     = document.getElementById('bo3Tb');
  lbl.textContent = 'Best of 3 - 50/50';
  document.getElementById('bo3TbTxt').textContent = m1.title + ' vs ' + m2.title;
  S.tiebreaker     = true;
  S.tiebreakerPool = [{ ...m1, pct: 50 }, { ...m2, pct: 50 }];
  rounds.style.opacity = '0';
  setTimeout(() => {
    rounds.style.display = 'none';
    tb.style.display     = 'flex';
    requestAnimationFrame(() => requestAnimationFrame(() => { tb.style.opacity = '1'; }));
  }, 300);
  setTimeout(() => {
    document.getElementById('spinBtn').disabled = false;
    if(S.autoRoll) {
      S.autoRolling = true;
      document.getElementById('spinBtn').disabled = true;
      _autoTimer = setTimeout(() => doSpin(), 1800);
    }
  }, 700);
}


function renderCustomPool() {
  const el = document.getElementById('cpList');
  if(!S.customPool.length) { el.innerHTML = ''; return; }
  el.innerHTML = S.customPool.map(cm => `
    <div class="cp-item">
      <div class="cp-poster"><img src="${pSrc(cm)}" onerror="this.src='${NO_IMAGE}'" style="width:100%;height:100%;object-fit:cover"></div>
      <div class="cp-info">
        <div class="cp-t">${esc(cm.title)}</div>
        <div class="cp-pct-wrap">
          <input class="cp-pct" type="number" min="1" max="99" value="${cm.pct || 5}" onchange="setCPct('${cm.id}', this.value)">
          <span class="cp-plbl">%</span>
        </div>
      </div>
      <button class="cp-del" onclick="removeCP('${cm.id}')">&#215;</button>
    </div>`).join('');
}

function setCPct(id, v) { const c = S.customPool.find(x => x.id === id); if(c) { c.pct = parseFloat(v) || 5; updatePool(); } }
function removeCP(id)   { S.customPool = S.customPool.filter(x => x.id !== id); renderCustomPool(); updatePool(); saveLocal(); }


async function searchOMDB(target) {
  const resEl = document.getElementById('cmRes');
  const q     = document.getElementById('cmSearch').value.trim();
  const yr    = document.getElementById('cmYear')?.value.trim() || '';
  if(!q) { toast('Type a title', 'err'); return; }
  resEl.innerHTML = `<div class="ld"><div class="ld-spin"></div>Searching...</div>`;
  resEl._results  = null;
  try {
    let results = null;
    if(yr) {
      const d = await fetchJSON(`https://www.omdbapi.com/?t=${omdbEnc(q)}&y=${yr}&apikey=${OMDB_KEY}`);
      if(d && d.Response !== 'False') results = [{ imdbId: d.imdbID, title: d.Title, year: d.Year, poster: d.Poster !== 'N/A' ? d.Poster : null, imdbScore: d.imdbRating !== 'N/A' ? parseFloat(d.imdbRating) : null }];
    } else {
      const d = await fetchJSON(`https://www.omdbapi.com/?s=${omdbEnc(q)}&type=movie&apikey=${OMDB_KEY}`);
      if(d?.Search) results = d.Search.map(m => ({ imdbId: m.imdbID, title: m.Title, year: m.Year, poster: m.Poster !== 'N/A' ? m.Poster : null, imdbScore: null }));
    }
    if(!results || !results.length) throw new Error('No results');
    const inCP = new Set(S.customPool.map(m => m.title.toLowerCase()));
    resEl.innerHTML = `<div class="sr-list">${results.map((m, i) =>
      `<div class="sr-item">
        <div class="sr-poster"><img src="${m.poster || NO_IMAGE}" onerror="this.src='${NO_IMAGE}'" alt=""></div>
        <div class="sr-info"><div class="sr-t">${esc(m.title)}</div><div class="sr-m">${m.year || ''}</div></div>
        ${inCP.has(m.title.toLowerCase()) ? `<span class="sr-added">Added</span>` : `<button class="sr-add-btn" onclick="addToCP(${i})">Add</button>`}
      </div>`).join('')}</div>`;
    resEl._results = results;
  } catch(e) {
    resEl.innerHTML = `<p style="font-size:12px;color:var(--t3);padding:10px 0">No results found.</p>`;
  }
}

async function addToCP(idx) {
  const resEl = document.getElementById('cmRes');
  const m = { ...(resEl._results || [])[idx] };
  if(!m.title) return;
  if(S.customPool.find(x => x.title.toLowerCase() === m.title.toLowerCase())) { toast('Already in pool', 'err'); return; }
  if(m.imdbId) {
    try {
      const d = await fetchJSON(`https://www.omdbapi.com/?i=${m.imdbId}&apikey=${OMDB_KEY}`);
      if(d && d.Response !== 'False') {
        if(d.imdbRating && d.imdbRating !== 'N/A') m.imdbScore = parseFloat(d.imdbRating);
        if(d.Poster    && d.Poster    !== 'N/A' && !m.poster) m.poster = d.Poster;
        m.plot     = d.Plot     !== 'N/A' ? d.Plot     : null;
        m.genre    = d.Genre    !== 'N/A' ? d.Genre    : null;
        m.runtime  = d.Runtime  !== 'N/A' ? d.Runtime  : null;
        m.director = d.Director !== 'N/A' ? d.Director : null;
        m.actors   = d.Actors   !== 'N/A' ? d.Actors   : null;
      }
    } catch(e) {}
  }
  S.customPool.push({ id: uid(), title: m.title, year: m.year, poster: m.poster, imdbScore: m.imdbScore, pct: 5 });
  saveLocal(); renderCustomPool(); updatePool(); closeM('customM'); toast(m.title + ' added to pool', 'ok');
}


async function fetchTMDBPosterBatch(movies) {
  let updated = false;
  for(const m of movies) {
    if(m.isShow) continue;
    const key = cKey(m.title, m.year);
    if(S.omdbCache[key]?.tmdbPosterPath) {
      if(!m.tmdbPoster) {
        m.tmdbPoster   = TMDB_IMG + 'w500'     + S.omdbCache[key].tmdbPosterPath;
        m.tmdbPosterHD = TMDB_IMG + 'original' + S.omdbCache[key].tmdbPosterPath;
        updated = true;
      }
      continue;
    }
    let posterPath = S.tmdbCache[key]?.details?.poster_path || null;
    if(!posterPath) {
      try {
        const search = await fetchTMDB(`/search/movie?query=${encodeURIComponent(m.title)}&year=${m.year}`);
        posterPath = search?.results?.[0]?.poster_path || null;
      } catch(e) {}
      await delay(120);
    }
    if(posterPath) {
      if(!S.omdbCache[key]) S.omdbCache[key] = {};
      S.omdbCache[key].tmdbPosterPath = posterPath;
      m.tmdbPoster   = TMDB_IMG + 'w500'     + posterPath;
      m.tmdbPosterHD = TMDB_IMG + 'original' + posterPath;
      updated = true;
    }
  }
  if(updated) {
    saveLocal();
    if(S.posterProvider === 'tmdb') renderAll();
  }
}

function renderSettings() {
  const body = document.querySelector('#settingsM .m-body');
  if(!body) return;
  body.innerHTML = `
    <div class="opt-row">
      <div class="opt-lbl">Movie card source</div>
      <div class="poster-src-tog">
        <button class="pst-btn${S.posterProvider === 'omdb' ? ' pst-active' : ''}" onclick="setPosterProvider('omdb')"><span class="imdb-pill" style="background:#f5c518;color:#000;font-size:9px;padding:1px 6px">OMDb</span></button>
        <button class="pst-btn${S.posterProvider === 'tmdb' ? ' pst-active' : ''}" onclick="setPosterProvider('tmdb')"><span class="imdb-pill" style="background:#01b4e4;color:#000;font-size:9px;padding:1px 6px">TMDb</span></button>
      </div>
    </div>
    <div class="opt-row">
      <div class="opt-lbl">Movie logo pos</div>
      <div class="poster-src-tog">
        <button class="pst-btn${S.logoPos === 'top-left' ? ' pst-active' : ''}" onclick="setLogoPos('top-left')" style="font-size:11px;color:var(--t2);padding:5px 10px">Top Left</button>
        <button class="pst-btn${S.logoPos === 'top' ? ' pst-active' : ''}" onclick="setLogoPos('top')" style="font-size:11px;color:var(--t2);padding:5px 10px">Top</button>
      </div>
    </div>
  `;
}

function setLogoPos(p) {
  if(S.logoPos === p) return;
  S.logoPos = p;
  saveLocal();
  renderSettings();
}

function setPosterProvider(p) {
  if(S.posterProvider === p) return;
  S.posterProvider = p;
  saveLocal();
  renderSettings();
  renderAll();
  if(p === 'tmdb') fetchTMDBPosterBatch([...S.watched, ...S.unwatched]);
}


async function fetchTMDB(path) {
  const sep = path.includes('?') ? '&' : '?';
  return await fetchJSON(`https://api.themoviedb.org/3${path}${sep}api_key=${TMDB_KEY}`);
}

async function getTMDBData(title, year) {
  const key = cKey(title, year);
  if(S.tmdbCache[key]) return S.tmdbCache[key];
  const search = await fetchTMDB(`/search/movie?query=${encodeURIComponent(title)}&year=${year}&include_adult=true`);
  if(!search?.results?.length) return null;
  const id = search.results[0].id;
  const [details, images, credits, videos] = await Promise.all([
    fetchTMDB(`/movie/${id}`),
    fetchTMDB(`/movie/${id}/images?include_image_language=en,null`),
    fetchTMDB(`/movie/${id}/credits`),
    fetchTMDB(`/movie/${id}/videos`)
  ]);
  const data = { details, images, credits, videos };
  S.tmdbCache[key] = data;
  saveLocal();
  return data;
}

async function openExpandedView() {
  if(!_detailMovie) return;
  const m = _detailMovie;
  document.getElementById('expHeaderText').textContent  = m.title;
  document.getElementById('expHeaderText').style.opacity = '1';
  document.getElementById('expHeaderLogo').style.display = 'none';
  document.getElementById('expHeaderLogo').src           = '';
  document.getElementById('expBody').innerHTML = `<div class="ld"><div class="ld-spin"></div>Loading TMDB data...</div>`;
  const expModal = document.querySelector('#expandM .modal');
  const t10      = m.ratings?.o === 10 && m.ratings?.p === 10 && m.ratings?.e === 10;
  expModal.classList.toggle('golden', !!t10);
  openM('expandM');

  if(m.isShow) {
    const tmdb = await getTMDBShowData(m.title, m.year);
    if(!tmdb?.details) {
      document.getElementById('expBody').innerHTML = `<p style="color:var(--t3);font-size:12px;padding:40px 0;text-align:center">No TMDB data found.</p>`;
      return;
    }
    const { html, logoSrc } = buildExpandShowHTML(m, tmdb);
    document.getElementById('expBody').innerHTML = html;
    if(logoSrc) document.getElementById('expHeaderLogo').src = logoSrc;
    setupExpandScroll(!!logoSrc);
  } else {
    const tmdb = await getTMDBData(m.title, m.year);
    if(!tmdb?.details) {
      document.getElementById('expBody').innerHTML = `<p style="color:var(--t3);font-size:12px;padding:40px 0;text-align:center">No TMDB data found.</p>`;
      return;
    }
    const { html, logoSrc } = buildExpandHTML(m, tmdb);
    document.getElementById('expBody').innerHTML = html;
    if(logoSrc) document.getElementById('expHeaderLogo').src = logoSrc;
    setupExpandScroll(!!logoSrc);
  }
}

function setupExpandScroll(hasLogo) {
  const body = document.getElementById('expBody');
  body.scrollTop = 0;
  body.onscroll  = null;
  document.getElementById('expFloatingLogo')?.remove();

  const ht    = document.getElementById('expHeaderText');
  const hl    = document.getElementById('expHeaderLogo');
  const title = document.getElementById('expTitle');

  if(hl) {
    hl.style.position      = '';
    hl.style.left          = '';
    hl.style.top           = '';
    hl.style.transform     = '';
    hl.style.zIndex        = '';
    hl.style.pointerEvents = '';
  }
  if(title) { title.style.overflow = ''; title.style.position = ''; title.style.justifyContent = ''; }

  if(!hasLogo) {
    if(ht)    { ht.style.opacity = '1'; ht.style.pointerEvents = ''; }
    if(title)   title.style.justifyContent = 'center';
    if(hl)      hl.style.display = 'none';
    return;
  }

  if(ht)    { ht.style.opacity = '0'; ht.style.pointerEvents = 'none'; }
  if(hl)    { hl.style.display = 'block'; hl.style.opacity = '0'; }

  if(S.logoPos === 'top') {
    if(title) title.style.overflow = 'visible';
    if(hl) {
      hl.style.position      = 'absolute';
      hl.style.left          = '50%';
      hl.style.top           = '50%';
      hl.style.transform     = 'translate(-50%, -50%)';
      hl.style.zIndex        = '1';
      hl.style.pointerEvents = 'auto';
    }
  }

  const overlayLogo = document.getElementById('expOverlayLogo');
  if(!overlayLogo) return;
  overlayLogo.style.transition = 'none';
  overlayLogo.style.transform  = 'none';
  overlayLogo.style.opacity    = '1';

  const hero       = document.querySelector('#expBody .exp-backdrop-hero');
  const scrollDist = hero ? Math.max(100, hero.offsetHeight) : 200;

  body.onscroll = function() {
    const t    = Math.min(Math.max(body.scrollTop / scrollDist, 0), 1);
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    overlayLogo.style.opacity = String(1 - ease);
    if(hl) hl.style.opacity   = String(ease);
  };
}


function buildExpandHTML(m, { details: d, images: im, credits: cr, videos: vi }) {
  const allLogos     = im?.logos     || [];
  const allBackdrops = im?.backdrops || [];
  const posters      = (im?.posters  || []).slice(0, 10);
  const cast         = (cr?.cast     || []).slice(0, 18);
  const crew         = cr?.crew || [];
  const directors    = crew.filter(x => x.job === 'Director').map(x => x.name);
  const writers      = crew.filter(x => ['Writer', 'Screenplay', 'Story'].includes(x.job)).map(x => x.name);
  const producers    = crew.filter(x => x.job === 'Producer').map(x => x.name).slice(0, 4);
  const composers    = crew.filter(x => x.department === 'Sound' && x.job === 'Original Music Composer').map(x => x.name);
  const trailer      = vi?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
  const origDiff     = d.original_title && d.original_title !== d.title;

  const logo        = allLogos.length     ? allLogos[Math.floor(Math.random() * allLogos.length)]         : null;
  const backdrop    = allBackdrops.length ? allBackdrops[Math.floor(Math.random() * allBackdrops.length)] : null;
  const logoSrc     = logo     ? TMDB_IMG + 'original' + logo.file_path     : null;
  const backdropSrc = backdrop ? TMDB_IMG + 'w1280'    + backdrop.file_path : null;

  const imdbScore = m.imdbScore
    ? `<span class="imdb-pill" style="font-size:9px;padding:1px 5px">IMDb</span><span style="font-size:11px;font-weight:700;font-variant-numeric:tabular-nums">${m.imdbScore}</span>`
    : '?';
  const imdbLink = m.imdbId
    ? `<a href="https://www.imdb.com/title/${m.imdbId}/" target="_blank" rel="noopener" class="exp-imdb-link" title="View on IMDb"><div class="exp-meta-item" style="text-align:center"><div class="exp-meta-lbl">IMDb Page</div><div class="exp-meta-val" style="justify-content:center"><span class="imdb-pill" style="font-size:9px;padding:1px 4px">IMDb</span></div></div></a>`
    : expMeta('IMDb Page', '?');

  const html = `
    ${backdrop && logo
      ? `<div class="exp-backdrop-hero">
          <img class="exp-backdrop-img" src="${backdropSrc}" alt="" onclick="openLightbox('${TMDB_IMG}original${backdrop.file_path}')" onerror="this.parentElement.style.display='none'">
          <div class="exp-logo-overlay"><img id="expOverlayLogo" src="${logoSrc}" alt="${esc(m.title)}" onclick="openLightbox('${logoSrc}')"></div>
        </div>`
      : backdrop
        ? `<div class="exp-backdrop-hero"><img class="exp-backdrop-img" src="${backdropSrc}" alt="" onclick="openLightbox('${TMDB_IMG}original${backdrop.file_path}')" onerror="this.style.display='none'"></div>`
        : logo
          ? `<div class="exp-logo-only"><img src="${logoSrc}" alt="${esc(m.title)}" onclick="openLightbox('${logoSrc}')"></div>`
          : ''
    }

    ${origDiff  ? `<div style="font-size:11px;color:var(--t3);text-align:center;margin:10px 0 4px">Original: <em>${esc(d.original_title)}</em></div>` : ''}
    ${d.tagline ? `<div class="exp-tagline" style="margin-top:${(backdrop || logo) ? '10px' : '0'}">"${esc(d.tagline)}"</div>` : ''}

    <div class="exp-meta-grid">
      ${expMeta('Status',    d.status)}
      ${expMeta('Released',  fmtDate(d.release_date))}
      ${expMetaH('Runtime',  fmtRuntime(d.runtime))}
      ${expMetaH('Language', fmtLang(d.original_language))}
      ${expMetaH('Budget',   fmtBudget(d.budget))}
      ${`<div class="exp-meta-item"><div class="exp-meta-lbl">${fmtRevenueLbl(d.revenue, d.budget)}</div><div class="exp-meta-val">${fmtRevenue(d.revenue, d.budget)}</div></div>`}
      ${expMeta('Popularity', d.popularity ? d.popularity.toFixed(1) : null)}
    </div>
    <div class="exp-meta-row3">
      ${expMetaH('IMDb Score', imdbScore)}
      ${expMeta('Vote Count',  d.vote_count ? d.vote_count.toLocaleString() : null)}
      ${imdbLink}
    </div>

    ${d.genres?.length     ? `<div class="exp-tags">${d.genres.map(g => `<span class="det-tag">${esc(g.name)}</span>`).join('')}</div>` : ''}
    ${d.overview           ? `<div class="exp-section-lbl exp-first-section">Overview</div><div class="exp-overview">${esc(d.overview)}</div>` : ''}
    ${d.production_companies?.length ? `<div class="exp-subtext" style="margin-bottom:4px"><strong style="color:var(--t2)">Production:</strong> ${d.production_companies.map(c => esc(c.name)).join(', ')}</div>` : ''}
    ${d.production_countries?.length ? `<div class="exp-subtext" style="margin-bottom:4px"><strong style="color:var(--t2)">Countries:</strong>  ${d.production_countries.map(c => esc(c.name)).join(', ')}</div>` : ''}
    ${d.spoken_languages?.length     ? `<div class="exp-subtext" style="margin-bottom:12px"><strong style="color:var(--t2)">Languages:</strong> ${d.spoken_languages.map(l => esc(l.english_name || l.name)).join(', ')}</div>` : ''}

    ${(directors.length || writers.length || producers.length || composers.length) ? `
    <div class="exp-section-lbl">Crew</div>
    <div style="margin-bottom:14px">
      ${directors.length ? `<div class="exp-crew-row"><span class="exp-crew-role">Director</span><span class="exp-crew-name">${directors.map(esc).join(', ')}</span></div>` : ''}
      ${writers.length   ? `<div class="exp-crew-row"><span class="exp-crew-role">Writer</span><span class="exp-crew-name">${writers.map(esc).join(', ')}</span></div>`   : ''}
      ${producers.length ? `<div class="exp-crew-row"><span class="exp-crew-role">Producer</span><span class="exp-crew-name">${producers.map(esc).join(', ')}</span></div>` : ''}
      ${composers.length ? `<div class="exp-crew-row"><span class="exp-crew-role">Music</span><span class="exp-crew-name">${composers.map(esc).join(', ')}</span></div>`   : ''}
    </div>` : ''}

    ${cast.length ? `<div class="exp-section-lbl">Cast</div>
    <div class="exp-cast-grid">
      ${cast.map(p => {
        const nm = p.name.toLowerCase();
        let photoHtml;
        if(nm.includes('jonah hill')) {
          photoHtml = `<img src="./images/sickrefrencebro.gif" alt="Jonah Hill" style="width:100%;height:100%;object-fit:fill;display:block">`;
        } else if(nm.includes('jesse eisenberg')) {
          photoHtml = `<img src="./images/oskaposter.png" alt="Jesse Eisenberg" style="width:100%;height:100%;object-fit:cover;display:block">`;
        } else if(p.profile_path) {
          photoHtml = `<img src="${TMDB_IMG}w185${p.profile_path}" alt="${esc(p.name)}" loading="lazy" onerror="this.style.display='none';this.parentElement.innerHTML='<span class=\\'exp-cast-no-img\\'>?</span>'">`;
        } else {
          photoHtml = `<span class="exp-cast-no-img">?</span>`;
        }
        return `<div class="exp-cast-item">
          <div class="exp-cast-photo">${photoHtml}</div>
          <div class="exp-cast-name">${esc(p.name)}</div>
          <div class="exp-cast-char">${esc(p.character || '')}</div>
        </div>`;
      }).join('')}
    </div>` : ''}

    ${allBackdrops.length ? `<div class="exp-section-lbl">Stills / Backdrops</div>
    <div class="exp-gallery">${allBackdrops.slice(0, 14).map(b => `<img src="${TMDB_IMG}w780${b.file_path}" loading="lazy" onclick="openLightbox('${TMDB_IMG}original${b.file_path}')" alt="">`).join('')}</div>` : ''}

    ${posters.length ? `<div class="exp-section-lbl">Posters</div>
    <div class="exp-gallery">${posters.map(p => `<img class="exp-poster-img" src="${TMDB_IMG}w342${p.file_path}" loading="lazy" onclick="openLightbox('${TMDB_IMG}original${p.file_path}')" alt="">`).join('')}</div>` : ''}

    ${allLogos.length ? `<div class="exp-section-lbl">Logos</div>
    <div class="exp-gallery">${allLogos.slice(0, 8).map(l => `<img class="exp-logo-img" src="${TMDB_IMG}w300${l.file_path}" loading="lazy" onclick="openLightbox('${TMDB_IMG}original${l.file_path}')" alt="">`).join('')}</div>` : ''}

    ${trailer ? `<div class="exp-section-lbl">Trailer</div>
    <a class="exp-trailer-btn" href="https://www.youtube.com/watch?v=${trailer.key}" target="_blank" rel="noopener">Watch Trailer on YouTube - ${esc(trailer.name)}</a>` : ''}
  `;

  return { html, logoSrc };
}


function buildExpandShowHTML(m, { id, details: d, images: im, credits: cr, videos: vi }) {
  const allLogos     = im?.logos     || [];
  const allBackdrops = im?.backdrops || [];
  const posters      = (im?.posters  || []).slice(0, 10);
  const cast         = (cr?.cast     || []).slice(0, 18);
  const crew         = cr?.crew || [];
  const creators     = (d.created_by || []).map(c => esc(c.name)).join(', ');
  const networks     = (d.networks   || []).map(n => esc(n.name)).join(', ');
  const composers    = crew.filter(x => x.department === 'Sound' && x.job === 'Original Music Composer').map(x => x.name);
  const trailer      = vi?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
  const origDiff     = d.original_name && d.original_name !== d.name;

  const logo        = allLogos.length     ? allLogos[Math.floor(Math.random() * allLogos.length)]         : null;
  const backdrop    = allBackdrops.length ? allBackdrops[Math.floor(Math.random() * allBackdrops.length)] : null;
  const logoSrc     = logo     ? TMDB_IMG + 'original' + logo.file_path     : null;
  const backdropSrc = backdrop ? TMDB_IMG + 'w1280'    + backdrop.file_path : null;

  const epRuntime  = d.episode_run_time?.[0];
  const yearRange  = m.endYear
    ? `${m.year} \u2013 ${m.endYear}`
    : (d.status === 'Ended' && d.last_air_date ? `${m.year} \u2013 ${d.last_air_date.slice(0, 4)}` : `${m.year} \u2013 Now`);

  const ratingVal  = m.omdbScore || m.imdbScore || (d.vote_average ? parseFloat(d.vote_average.toFixed(1)) : null);
  const ratingPill = m.omdbScore || m.imdbScore
    ? `<span class="imdb-pill" style="font-size:9px;padding:1px 5px">IMDb</span>`
    : `<span class="imdb-pill" style="background:#01b4e4;color:#000;font-size:9px;padding:1px 5px">TMDB</span>`;
  const ratingHtml = ratingVal
    ? `${ratingPill}<span style="font-size:11px;font-weight:700;font-variant-numeric:tabular-nums">${ratingVal}</span>`
    : '?';

  const imdbLink = m.imdbId
    ? `<a href="https://www.imdb.com/title/${m.imdbId}/" target="_blank" rel="noopener" class="exp-imdb-link" title="View on IMDb"><div class="exp-meta-item" style="text-align:center"><div class="exp-meta-lbl">IMDb Page</div><div class="exp-meta-val" style="justify-content:center"><span class="imdb-pill" style="font-size:9px;padding:1px 4px">IMDb</span></div></div></a>`
    : expMeta('IMDb Page', '?');

  const mainSeasons   = (d.seasons || []).filter(s => s.season_number > 0);
  const specialSeason = (d.seasons || []).find(s  => s.season_number === 0);

  const html = `
    ${backdrop && logo
      ? `<div class="exp-backdrop-hero">
          <img class="exp-backdrop-img" src="${backdropSrc}" alt="" onclick="openLightbox('${TMDB_IMG}original${backdrop.file_path}')" onerror="this.parentElement.style.display='none'">
          <div class="exp-logo-overlay"><img id="expOverlayLogo" src="${logoSrc}" alt="${esc(m.title)}" onclick="openLightbox('${logoSrc}')"></div>
        </div>`
      : backdrop
        ? `<div class="exp-backdrop-hero"><img class="exp-backdrop-img" src="${backdropSrc}" alt="" onclick="openLightbox('${TMDB_IMG}original${backdrop.file_path}')" onerror="this.style.display='none'"></div>`
        : logo
          ? `<div class="exp-logo-only"><img src="${logoSrc}" alt="${esc(m.title)}" onclick="openLightbox('${logoSrc}')"></div>`
          : ''
    }

    ${origDiff  ? `<div style="font-size:11px;color:var(--t3);text-align:center;margin:10px 0 4px">Original: <em>${esc(d.original_name)}</em></div>` : ''}
    ${d.tagline ? `<div class="exp-tagline" style="margin-top:${(backdrop || logo) ? '10px' : '0'}">"${esc(d.tagline)}"</div>` : ''}
    <div style="font-size:11px;color:var(--t2);text-align:center;margin:4px 0 10px;font-weight:600;letter-spacing:.03em">${yearRange}</div>

    <div class="exp-meta-grid">
      ${expMeta('Status',    d.status)}
      ${expMeta('First Air', fmtDate(d.first_air_date))}
      ${expMeta('Last Air',  d.last_air_date ? fmtDate(d.last_air_date) : (d.status === 'Returning Series' ? 'Ongoing' : '?'))}
      ${expMetaH('Ep Runtime', epRuntime ? epRuntime + ' min' : '?')}
      ${expMetaH('Language',   fmtLang(d.original_language))}
      ${expMeta('Popularity',  d.popularity ? d.popularity.toFixed(1) : null)}
    </div>
    <div class="exp-meta-row3">
      ${expMetaH('Rating',   ratingHtml)}
      ${expMeta('Episodes',  d.number_of_episodes ? String(d.number_of_episodes) : null)}
      ${expMeta('Seasons',   d.number_of_seasons  ? String(d.number_of_seasons)  : null)}
      ${imdbLink}
    </div>

    ${d.genres?.length ? `<div class="exp-tags">${d.genres.map(g => `<span class="det-tag">${esc(g.name)}</span>`).join('')}</div>` : ''}
    ${d.overview ? `<div class="exp-section-lbl exp-first-section">Overview</div><div class="exp-overview">${esc(d.overview)}</div>` : ''}
    ${networks   ? `<div class="exp-subtext" style="margin-bottom:4px"><strong style="color:var(--t2)">Network:</strong> ${networks}</div>` : ''}
    ${d.production_companies?.length ? `<div class="exp-subtext" style="margin-bottom:4px"><strong style="color:var(--t2)">Production:</strong> ${d.production_companies.map(c => esc(c.name)).join(', ')}</div>` : ''}
    ${d.production_countries?.length ? `<div class="exp-subtext" style="margin-bottom:4px"><strong style="color:var(--t2)">Countries:</strong> ${d.production_countries.map(c => esc(c.name)).join(', ')}</div>` : ''}
    ${d.spoken_languages?.length     ? `<div class="exp-subtext" style="margin-bottom:12px"><strong style="color:var(--t2)">Languages:</strong> ${d.spoken_languages.map(l => esc(l.english_name || l.name)).join(', ')}</div>` : ''}

    ${(creators || composers.length) ? `
    <div class="exp-section-lbl">Crew</div>
    <div style="margin-bottom:14px">
      ${creators         ? `<div class="exp-crew-row"><span class="exp-crew-role">Created by</span><span class="exp-crew-name">${creators}</span></div>` : ''}
      ${composers.length ? `<div class="exp-crew-row"><span class="exp-crew-role">Music</span><span class="exp-crew-name">${composers.map(esc).join(', ')}</span></div>` : ''}
    </div>` : ''}

    ${cast.length ? `<div class="exp-section-lbl">Cast</div>
    <div class="exp-cast-grid">
      ${cast.map(p => {
        const nm = p.name.toLowerCase();
        let photoHtml;
        if(nm.includes('jonah hill')) {
          photoHtml = `<img src="./images/sickrefrencebro.gif" alt="Jonah Hill" style="width:100%;height:100%;object-fit:fill;display:block">`;
        } else if(nm.includes('jesse eisenberg')) {
          photoHtml = `<img src="./images/oskaposter.png" alt="Jesse Eisenberg" style="width:100%;height:100%;object-fit:cover;display:block">`;
        } else if(p.profile_path) {
          photoHtml = `<img src="${TMDB_IMG}w185${p.profile_path}" alt="${esc(p.name)}" loading="lazy" onerror="this.style.display='none';this.parentElement.innerHTML='<span class=\\'exp-cast-no-img\\'>?</span>'">`;
        } else {
          photoHtml = `<span class="exp-cast-no-img">?</span>`;
        }
        return `<div class="exp-cast-item">
          <div class="exp-cast-photo">${photoHtml}</div>
          <div class="exp-cast-name">${esc(p.name)}</div>
          <div class="exp-cast-char">${esc(p.character || '')}</div>
        </div>`;
      }).join('')}
    </div>` : ''}

    ${allBackdrops.length ? `<div class="exp-section-lbl">Stills / Backdrops</div>
    <div class="exp-gallery">${allBackdrops.slice(0, 14).map(b => `<img src="${TMDB_IMG}w780${b.file_path}" loading="lazy" onclick="openLightbox('${TMDB_IMG}original${b.file_path}')" alt="">`).join('')}</div>` : ''}

    ${posters.length ? `<div class="exp-section-lbl">Posters</div>
    <div class="exp-gallery">${posters.map(p => `<img class="exp-poster-img" src="${TMDB_IMG}w342${p.file_path}" loading="lazy" onclick="openLightbox('${TMDB_IMG}original${p.file_path}')" alt="">`).join('')}</div>` : ''}

    ${allLogos.length ? `<div class="exp-section-lbl">Logos</div>
    <div class="exp-gallery">${allLogos.slice(0, 8).map(l => `<img class="exp-logo-img" src="${TMDB_IMG}w300${l.file_path}" loading="lazy" onclick="openLightbox('${TMDB_IMG}original${l.file_path}')" alt="">`).join('')}</div>` : ''}

    ${mainSeasons.length ? `
    <div class="exp-section-lbl">Episodes</div>
    <div class="exp-season-list">
      ${[...mainSeasons, ...(specialSeason ? [specialSeason] : [])].map(s => `
      <div class="exp-season-item" id="season-${id}-${s.season_number}">
        <div class="exp-season-head" onclick="toggleSeason(${id}, ${s.season_number})">
          <span class="exp-season-name">${esc(s.name || 'Season ' + s.season_number)}</span>
          <span class="exp-season-meta">${s.episode_count} ep${s.episode_count !== 1 ? 's' : ''}${s.air_date ? ' \u00b7 ' + s.air_date.slice(0, 4) : ''}</span>
          <span class="exp-season-arr">&#9658;</span>
        </div>
        <div class="exp-season-body" id="seasonBody-${id}-${s.season_number}"></div>
      </div>`).join('')}
    </div>` : ''}

    ${trailer ? `<div class="exp-section-lbl">Trailer</div>
    <a class="exp-trailer-btn" href="https://www.youtube.com/watch?v=${trailer.key}" target="_blank" rel="noopener">Watch Trailer on YouTube - ${esc(trailer.name)}</a>` : ''}
  `;

  return { html, logoSrc };
}

async function toggleSeason(showId, seasonNum) {
  const item = document.getElementById(`season-${showId}-${seasonNum}`);
  const body = document.getElementById(`seasonBody-${showId}-${seasonNum}`);
  if(!item || !body) return;

  if(item.classList.contains('open')) {
    item.classList.remove('open');
    return;
  }

  item.classList.add('open');
  if(body.dataset.loaded) return;

  body.innerHTML = `<div class="ld" style="padding:10px 12px"><div class="ld-spin"></div>Loading episodes...</div>`;

  try {
    const season = await fetchTMDB(`/tv/${showId}/season/${seasonNum}`);
    if(!season?.episodes?.length) {
      body.innerHTML = `<p style="font-size:12px;color:var(--t3);padding:8px 12px">No episodes found.</p>`;
      body.dataset.loaded = '1';
      return;
    }
    body.innerHTML = season.episodes.map(ep => renderEpisodeItem(showId, ep)).join('');
    body.dataset.loaded = '1';
  } catch(e) {
    body.innerHTML = `<p style="font-size:12px;color:var(--t3);padding:8px 12px">Failed to load episodes.</p>`;
  }
}

function renderEpisodeItem(showId, ep) {
  const epId  = `ep-${showId}-${ep.season_number}-${ep.episode_number}`;
  const still = ep.still_path ? TMDB_IMG + 'w780' + ep.still_path : null;
  return `
  <div class="exp-ep-item" id="${epId}">
    <div class="exp-ep-head" onclick="toggleEpisode('${epId}')">
      <span class="exp-ep-num">${ep.episode_number}</span>
      <span class="exp-ep-name">${esc(ep.name || 'Episode ' + ep.episode_number)}</span>
      ${ep.vote_average ? `<span class="exp-ep-rating">${ep.vote_average.toFixed(1)}</span>` : ''}
      ${ep.runtime      ? `<span class="exp-ep-runtime">${ep.runtime}m</span>` : ''}
      <span class="exp-ep-arr">&#9658;</span>
    </div>
    <div class="exp-ep-body" id="${epId}-body">
      ${still ? `<img class="exp-ep-still" src="${still}" loading="lazy" onclick="openLightbox('${TMDB_IMG}original${ep.still_path}')" alt="">` : ''}
      <div class="exp-ep-meta">
        ${ep.air_date    ? `<span>${fmtDate(ep.air_date)}</span>` : ''}
        ${ep.runtime     ? `<span>${ep.runtime} min</span>` : ''}
        ${ep.vote_average ? `<span><span class="imdb-pill" style="font-size:8px;padding:1px 3px">TMDB</span> ${ep.vote_average.toFixed(1)}</span>` : ''}
      </div>
      ${ep.overview ? `<div class="exp-ep-overview">${esc(ep.overview)}</div>` : ''}
    </div>
  </div>`;
}

function toggleEpisode(epId) {
  const item = document.getElementById(epId);
  if(item) item.classList.toggle('open');
}


function expMeta(lbl, val) {
  const v = (val !== null && val !== undefined && val !== '') ? val : '?';
  return `<div class="exp-meta-item"><div class="exp-meta-lbl">${lbl}</div><div class="exp-meta-val">${v}</div></div>`;
}

function expMetaH(lbl, html) {
  return `<div class="exp-meta-item"><div class="exp-meta-lbl">${lbl}</div><div class="exp-meta-val">${html}</div></div>`;
}

function fmtDate(d) {
  if(!d) return '?';
  const p = d.split('-');
  return p[1] + '/' + p[2] + '/' + p[0];
}

function fmtRuntime(rt) {
  if(!rt) return '?';
  const h   = Math.floor(rt / 60);
  const min = rt % 60;
  return rt + ' min (' + (h > 0 ? h + 'h ' : '') + (min > 0 ? min + 'min' : '') + ')';
}

function fmtLang(lang) {
  if(!lang) return '?';
  return lang.toUpperCase();
}

function fmtBudget(n) {
  if(!n && n !== 0) return '?';
  if(n === 0) return '?';
  const s = '$' + n.toLocaleString();
  if(n < 1000)     return `<span class="exp-red">${s}</span>`;
  if(n > 10000000) return `<span class="exp-green">${s}</span>`;
  return s;
}

function fmtRevenue(rev, budget) {
  if(!rev && rev !== 0) return '?';
  if(rev === 0) return '?';
  const s = '$' + rev.toLocaleString();
  if(!budget || budget === 0) return s;
  if(rev > budget) return `<span class="exp-green">${s}</span>`;
  return `<span class="exp-red">${s}</span>`;
}

function fmtRevenueLbl(rev, budget) {
  let lbl = 'Revenue';
  if(!rev || rev === 0 || !budget || budget === 0) return lbl;
  const pct  = (rev - budget) / budget * 100;
  const pStr = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
  const cls  = rev > budget ? 'exp-green' : 'exp-red';
  return `Revenue <span class="${cls}" style="font-size:9px;font-weight:700;opacity:.9;letter-spacing:.02em">${pStr}</span>`;
}


function openM(id)  { document.getElementById(id)?.classList.add('open'); }
function closeM(id) {
  document.getElementById(id)?.classList.remove('open');
  if(id === 'expandM') document.getElementById('expFloatingLogo')?.remove();
}

document.querySelectorAll('.overlay').forEach(ov => {
  ov.addEventListener('click', e => { if(e.target === ov) closeM(ov.id); });
});

document.addEventListener('keydown', e => {
  if(e.key === 'Escape') document.querySelectorAll('.overlay.open').forEach(o => closeM(o.id));
});


function toggleColl(b, d) {
  document.getElementById(b)?.classList.toggle('open');
  document.getElementById(d)?.classList.toggle('open');
}

function toast(msg, type = '') {
  const wrap = document.getElementById('toastWrap');
  const el   = document.createElement('div');
  el.className = 'toast' + (type ? ' ' + type : '');
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function esc(s)    { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchJSON(url) {
  const ac = new AbortController();
  const t  = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ac.signal });
    clearTimeout(t);
    if(!r.ok) return null;
    return await r.json();
  } catch(e) {
    clearTimeout(t);
    return null;
  }
}