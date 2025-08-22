// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider, 
    onAuthStateChanged,
    signOut,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    arrayUnion,
    arrayRemove 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBlSK9O1BDtXTlgPvyE1nCbVwCpE_OEubU",
    authDomain: "streetflixk.firebaseapp.com",
    projectId: "streetflixk",
    storageBucket: "streetflixk.appspot.com", // CORRIGIDO
    messagingSenderId: "359203981652",
    appId: "1:359203981652:web:beed7558c83e02554160c1",
    measurementId: "G-GT17E4V6PR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// TMDB API Config
const TMDB_API_KEY = "001bbf841bab48f314947688a8230535";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const IMG_BASE_URL = "https://image.tmdb.org/t/p/w500";
const BACKDROP_BASE_URL = "https://image.tmdb.org/t/p/original";

// App state
let currentUserId = null;
let userWatchlist = [];
let lastAdTriggerTimestamp = 0;

// DOM Elements
const authModal = document.getElementById('auth-modal');
const closeAuthModalBtn = document.getElementById('close-auth-modal-btn');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const toggleAuthLink = document.getElementById('toggle-auth-mode');
const googleSignInButton = document.getElementById('google-signin');
const userMenuContainer = document.getElementById('user-menu-container');
const watchlistNavLink = document.getElementById('watchlist-nav-link');
const mainContent = document.getElementById('main-content');
const pageContent = document.getElementById('page-content');
const paginationContainer = document.getElementById('pagination-container');
const navLinks = document.querySelectorAll('.nav-link');

// --- ADVERTISEMENT FUNCTION ---
function triggerAd() {
    const now = Date.now();
    const sevenSeconds = 7 * 1000;
    if (now - lastAdTriggerTimestamp > sevenSeconds) {
        window.open('https://otieu.com/4/9752312', '_blank');
        lastAdTriggerTimestamp = now;
    }
}

// --- TEMPLATES HTML ---
const loadingTemplate = `<div class="flex justify-center items-center h-full py-16"><div class="loader"></div></div>`;

const pageTemplates = {
    'home-page': `
        <section id="popular-movies" class="mb-12">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold border-l-4 border-red-500 pl-3">Filmes Populares</h2>
                <a href="#" class="text-red-400 hover:text-red-300 font-semibold nav-link" data-target="movies-page">Ver Mais</a>
            </div>
            <div id="popular-movies-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"></div>
        </section>
        <section id="popular-series" class="mb-12">
             <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold border-l-4 border-red-500 pl-3">Séries Populares</h2>
                <a href="#" class="text-red-400 hover:text-red-300 font-semibold nav-link" data-target="series-page">Ver Mais</a>
            </div>
            <div id="popular-series-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"></div>
        </section>`,
    'movies-page': `
        <h2 class="text-3xl font-bold mb-6 border-l-4 border-red-500 pl-3">Todos os Filmes</h2>
        <div id="all-movies-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"></div>`,
    'series-page': `
        <h2 class="text-3xl font-bold mb-6 border-l-4 border-red-500 pl-3">Todas as Séries</h2>
        <div id="all-series-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"></div>`,
    'watchlist-page': `
        <h2 class="text-3xl font-bold mb-6 border-l-4 border-red-500 pl-3">Minha Lista (Ver Mais Tarde)</h2>
        <div id="watchlist-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"></div>
        <p id="watchlist-empty" class="text-gray-400 hidden">Sua lista está vazia.</p>`,
    'search-results-page': `
        <h2 id="search-query-title" class="text-3xl font-bold mb-6"></h2>
        <div id="search-results-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"></div>`,
    'details-page': ''
};

// --- UTILITY FUNCTIONS ---
const showPage = (pageId) => {
    pageContent.innerHTML = pageTemplates[pageId] || loadingTemplate;
    paginationContainer.innerHTML = ''; // Limpa a paginação ao mudar de página
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.target === pageId);
    });
    window.scrollTo(0, 0);
};

// --- AUTH MODAL ---
function showAuthModal() {
    authModal.classList.remove('hidden');
    authModal.classList.add('flex');
}

function hideAuthModal() {
    authModal.classList.add('hidden');
    authModal.classList.remove('flex');
}

// --- FIREBASE WATCHLIST ---
async function getWatchlist() {
    if (!currentUserId) return;
    const docRef = doc(db, "watchlists", currentUserId);
    try {
        const docSnap = await getDoc(docRef);
        userWatchlist = docSnap.exists() ? docSnap.data().items || [] : [];
    } catch (error) {
        console.error("Error getting watchlist:", error);
        userWatchlist = [];
    }
}

async function addToWatchlist(item) {
    if (!currentUserId || (auth.currentUser && auth.currentUser.isAnonymous)) return;
    const docRef = doc(db, "watchlists", currentUserId);
    await updateDoc(docRef, { items: arrayUnion(item) });
    userWatchlist.push(item);
}

async function removeFromWatchlist(itemId) {
    if (!currentUserId || (auth.currentUser && auth.currentUser.isAnonymous)) return;
    const itemToRemove = userWatchlist.find(i => i.id == itemId);
    if(itemToRemove) {
        const docRef = doc(db, "watchlists", currentUserId);
        await updateDoc(docRef, { items: arrayRemove(itemToRemove) });
        userWatchlist = userWatchlist.filter(i => i.id != itemId);
    }
}

const isItemInWatchlist = (itemId) => userWatchlist.some(item => item.id == itemId);

// --- UI UPDATES ---
function updateUserMenu(user) {
    if (user && !user.isAnonymous) {
        userMenuContainer.innerHTML = `
            <button id="user-menu-button" class="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                <i class="fas fa-user text-xl"></i>
            </button>
            <div id="user-menu" class="hidden absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-20">
                <div class="px-4 py-2 text-sm text-gray-300 truncate">${user.email}</div>
                <a href="#" id="logout-button" class="block px-4 py-2 text-sm text-gray-300 hover:bg-red-600 hover:text-white">Sair</a>
            </div>`;
        document.getElementById('logout-button').addEventListener('click', (e) => { e.preventDefault(); signOut(auth); });
        document.getElementById('user-menu-button').addEventListener('click', () => { document.getElementById('user-menu').classList.toggle('hidden'); });
        watchlistNavLink.style.display = 'block';
    } else {
        userMenuContainer.innerHTML = `<button id="login-redirect-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition duration-300">Entrar</button>`;
        document.getElementById('login-redirect-btn').addEventListener('click', showAuthModal);
        watchlistNavLink.style.display = 'none';
    }
}

// --- AUTHENTICATION ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserId = user.uid;
        if (!user.isAnonymous) {
            await getWatchlist();
            hideAuthModal();
        }
    } else {
        await signInAnonymously(auth).catch(err => console.error("Anonymous sign-in failed:", err));
    }
    updateUserMenu(user);
});

// --- TMDB API FETCHING ---
async function fetchFromTMDB(endpoint, page = 1) {
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${TMDB_BASE_URL}/${endpoint}${separator}api_key=${TMDB_API_KEY}&language=pt-BR&page=${page}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        return null;
    }
}

// --- RENDERING FUNCTIONS ---
function createContentCard(item) {
    const type = item.media_type || (item.title ? 'movie' : 'tv');
    const posterPath = item.poster_path ? `${IMG_BASE_URL}${item.poster_path}` : 'https://placehold.co/500x750/141414/ef4444?text=StreetFlix';
    const isFavorited = isItemInWatchlist(item.id);

    return `
        <div class="card relative rounded-lg overflow-hidden group">
            <div class="watchlist-icon ${isFavorited ? 'favorited' : ''}" data-id="${item.id}" data-type="${type}" data-title="${item.title || item.name}" data-poster="${item.poster_path}">
                <i class="fas fa-heart"></i>
            </div>
            <div class="cursor-pointer" data-id="${item.id}" data-type="${type}">
                <img src="${posterPath}" alt="${item.title || item.name}" class="w-full h-full object-cover transition-all duration-300">
                <div class="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 play-icon">
                    <i class="fas fa-play-circle text-white text-6xl"></i>
                </div>
            </div>
        </div>
    `;
}

function renderGrid(container, data) {
    if (!container || !data || !data.results) {
        container.innerHTML = `<p class="text-gray-400 col-span-full">Não foi possível carregar o conteúdo.</p>`;
        return;
    };
    container.innerHTML = data.results.map(createContentCard).join('');
}

function renderWatchlistGrid() {
    const container = document.getElementById('watchlist-grid');
    const emptyMsg = document.getElementById('watchlist-empty');
    if (userWatchlist.length === 0) {
        container.innerHTML = '';
        emptyMsg.classList.remove('hidden');
    } else {
        container.innerHTML = userWatchlist.map(createContentCard).join('');
        emptyMsg.classList.add('hidden');
    }
}

async function renderDetails(data) {
    const type = data.title ? 'movie' : 'tv';
    const backdropPath = data.backdrop_path ? `${BACKDROP_BASE_URL}${data.backdrop_path}` : '';
    const posterPath = data.poster_path ? `${IMG_BASE_URL}${data.poster_path}` : 'https://placehold.co/500x750/141414/ef4444?text=StreetFlix';
    const year = (data.release_date || data.first_air_date || '').substring(0, 4);
    const credits = await fetchFromTMDB(`${type}/${data.id}/credits`);
    const cast = credits?.cast?.slice(0, 5).map(c => c.name).join(', ') || 'Não disponível';
    const inWatchlist = isItemInWatchlist(data.id);
    const isGuest = auth.currentUser ? auth.currentUser.isAnonymous : true;

    pageContent.innerHTML = `
        <div class="relative min-h-screen -mx-4 -mt-28 md:-mt-36 backdrop-blur-image" style="background-image: url('${backdropPath}')">
            <div class="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
            <div class="relative container mx-auto px-4 pt-28 md:pt-48 pb-16 flex flex-col md:flex-row gap-8">
                <div class="md:w-1/3 flex-shrink-0"><img src="${posterPath}" alt="${data.title || data.name}" class="rounded-lg shadow-2xl w-full"></div>
                <div class="md:w-2/3 text-white">
                    <h1 class="text-4xl md:text-6xl font-extrabold mb-2">${data.title || data.name}</h1>
                    <div class="flex items-center space-x-4 mb-4 text-gray-300 flex-wrap">
                        <span>${year}</span>
                        ${data.genres ? `<span>&bull;</span><span>${data.genres.map(g => g.name).join(', ')}</span>` : ''}
                        ${data.runtime ? `<span>&bull;</span><span>${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m</span>` : ''}
                    </div>
                    <p class="text-lg mb-6 max-w-3xl">${data.overview || 'Sinopse não disponível.'}</p>
                    <p class="mb-6"><strong class="font-semibold">Elenco:</strong> ${cast}</p>
                    <div id="action-buttons" class="flex items-center gap-4 mb-8"></div>
                    <div id="media-content"></div>
                </div>
            </div>
        </div>`;

    if (!isGuest) {
        document.getElementById('action-buttons').innerHTML = `
            <button id="watchlist-btn" data-id="${data.id}" class="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-md text-lg transition duration-300 flex items-center gap-2">
                <i class="fas ${inWatchlist ? 'fa-check' : 'fa-plus'}"></i> ${inWatchlist ? 'Na Minha Lista' : 'Ver Mais Tarde'}
            </button>`;
        document.getElementById('watchlist-btn').addEventListener('click', async (e) => {
            triggerAd();
            const button = e.currentTarget;
            const itemData = { id: data.id, title: data.title || data.name, poster_path: data.poster_path, media_type: type };
            if (isItemInWatchlist(data.id)) {
                await removeFromWatchlist(data.id);
                button.innerHTML = `<i class="fas fa-plus"></i> Ver Mais Tarde`;
            } else {
                await addToWatchlist(itemData);
                button.innerHTML = `<i class="fas fa-check"></i> Na Minha Lista`;
            }
        });
    }

    const mediaContentContainer = document.getElementById('media-content');
    if (type === 'movie') {
        mediaContentContainer.innerHTML = `<button id="watch-now-btn" data-id="${data.id}" class="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-md text-lg transition duration-300 flex items-center gap-2"><i class="fas fa-play"></i> Assistir Agora</button>`;
        document.getElementById('watch-now-btn').addEventListener('click', (e) => {
            triggerAd();
            window.open(`player.html?type=movie&id=${e.currentTarget.dataset.id}`, "_blank");
        });
    } else {
        mediaContentContainer.innerHTML = `
            <div class="mb-4">
                <label for="season-select" class="block text-sm font-medium text-gray-300 mb-1">Temporada</label>
                <select id="season-select" class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block w-full p-2.5 max-w-xs"></select>
            </div>
            <div id="episodes-container" class="mt-6"></div>`;
        const seasonSelect = document.getElementById('season-select');
        seasonSelect.innerHTML = data.seasons.filter(s => s.season_number > 0).map(s => `<option value="${s.season_number}">Temporada ${s.season_number}</option>`).join('');
        seasonSelect.addEventListener('change', (e) => {
            triggerAd();
            loadSeason(data.id, e.target.value);
        });
        if (data.seasons?.find(s => s.season_number > 0)) {
            loadSeason(data.id, seasonSelect.value);
        }
    }
}

async function loadSeason(seriesId, seasonNumber) {
    const episodesContainer = document.getElementById('episodes-container');
    if (!episodesContainer) return;
    episodesContainer.innerHTML = loadingTemplate;

    const seasonData = await fetchFromTMDB(`tv/${seriesId}/season/${seasonNumber}`);
    
    if (seasonData && seasonData.episodes && seasonData.episodes.length > 0) {
        episodesContainer.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div class="lg:col-span-7">
                    <div id="episodes-list" class="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                        ${seasonData.episodes.map(episode => `
                            <div class="episode-item bg-gray-800/50 p-3 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
                                 data-episode-number="${episode.episode_number}"
                                 data-title="${episode.name || `Episódio ${episode.episode_number}`}"
                                 data-overview="${episode.overview || 'Sinopse não disponível.'}"
                                 data-still="${episode.still_path ? `${IMG_BASE_URL}${episode.still_path}` : 'https://placehold.co/500x281/141414/ef4444?text=StreetFlix'}">
                                <p class="font-bold text-white"><span class="text-gray-400 font-normal">${episode.episode_number}.</span> ${episode.name}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="lg:col-span-5">
                    <div id="episode-preview" class="sticky top-28">
                        <a id="preview-play-link" href="#" target="_blank" class="relative block group">
                            <img id="preview-image" src="" alt="Prévia do episódio" class="w-full aspect-video object-cover rounded-lg mb-4 bg-gray-800">
                            <div class="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <i class="fas fa-play-circle text-white text-6xl"></i>
                            </div>
                        </a>
                        <h4 id="preview-title" class="text-xl font-bold text-white"></h4>
                        <p id="preview-overview" class="text-sm text-gray-400 mt-2 max-h-24 overflow-y-auto"></p>
                    </div>
                </div>
            </div>`;

        const episodeItems = episodesContainer.querySelectorAll('.episode-item');
        
        function updatePreview(episodeElement) {
            if (!episodeElement) return;

            document.getElementById('preview-image').src = episodeElement.dataset.still;
            document.getElementById('preview-title').textContent = episodeElement.dataset.title;
            document.getElementById('preview-overview').textContent = episodeElement.dataset.overview;
            
            const episodeNumber = episodeElement.dataset.episodeNumber;
            const playLink = `player.html?type=tv&id=${seriesId}&s=${seasonNumber}&e=${episodeNumber}`;
            document.getElementById('preview-play-link').href = playLink;

            episodeItems.forEach(item => item.classList.remove('bg-red-800/50'));
            episodeElement.classList.add('bg-red-800/50');
        }

        episodeItems.forEach(item => {
            item.addEventListener('click', () => {
                triggerAd();
                updatePreview(item);
            });
        });

        if (episodeItems.length > 0) {
            updatePreview(episodeItems[0]);
        }

    } else {
        episodesContainer.innerHTML = '<p>Não foi possível carregar os episódios para esta temporada.</p>';
    }
}

// --- PAGINATION ---
function renderPagination(currentPage, totalPages, pageType) {
    paginationContainer.innerHTML = '';
    const maxPagesToShow = 5;
    const totalPagesLimited = Math.min(totalPages, 500); // TMDB API limit

    if (totalPagesLimited <= 1) return;

    let pages = [];
    
    pages.push(`<button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" data-page="${currentPage - 1}">&lt;</button>`);

    if (totalPagesLimited <= maxPagesToShow + 2) {
        for (let i = 1; i <= totalPagesLimited; i++) {
            pages.push(`<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`);
        }
    } else {
        pages.push(`<button class="pagination-btn ${1 === currentPage ? 'active' : ''}" data-page="1">1</button>`);
        
        let startPage = Math.max(2, currentPage - 1);
        let endPage = Math.min(totalPagesLimited - 1, currentPage + 1);

        if (currentPage > 3) {
            pages.push(`<span class="pagination-ellipsis">...</span>`);
        }

        if (currentPage === totalPagesLimited) startPage = Math.max(2, totalPagesLimited - 3);
        if (currentPage === 1) endPage = Math.min(totalPagesLimited - 1, 4);
        
        for (let i = startPage; i <= endPage; i++) {
            pages.push(`<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`);
        }

        if (currentPage < totalPagesLimited - 2) {
            pages.push(`<span class="pagination-ellipsis">...</span>`);
        }
        
        pages.push(`<button class="pagination-btn ${totalPagesLimited === currentPage ? 'active' : ''}" data-page="${totalPagesLimited}">${totalPagesLimited}</button>`);
    }

    pages.push(`<button class="pagination-btn ${currentPage === totalPagesLimited ? 'disabled' : ''}" data-page="${currentPage + 1}">&gt;</button>`);
    
    paginationContainer.innerHTML = `<div class="pagination-container">${pages.join('')}</div>`;

    document.querySelectorAll('.pagination-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const page = parseInt(e.currentTarget.dataset.page);
            if (page && !e.currentTarget.classList.contains('disabled') && !e.currentTarget.classList.contains('active')) {
                loadPageContent(pageType, page);
            }
        });
    });
}


// --- PAGE LOAD FUNCTIONS ---
async function loadPageContent(pageId, pageNumber = 1) {
    showPage(pageId);
    
    try {
        let data;
        switch (pageId) {
            case 'home-page':
                const popularMoviesGrid = document.getElementById('popular-movies-grid');
                const popularSeriesGrid = document.getElementById('popular-series-grid');
                popularMoviesGrid.innerHTML = loadingTemplate;
                popularSeriesGrid.innerHTML = loadingTemplate;
                const [movies, series] = await Promise.all([
                    fetchFromTMDB('movie/popular'),
                    fetchFromTMDB('tv/popular')
                ]);
                renderGrid(popularMoviesGrid, movies);
                renderGrid(popularSeriesGrid, series);
                break;
            case 'movies-page':
                const allMoviesGrid = document.getElementById('all-movies-grid');
                allMoviesGrid.innerHTML = loadingTemplate;
                data = await fetchFromTMDB('discover/movie?sort_by=popularity.desc', pageNumber);
                renderGrid(allMoviesGrid, data);
                renderPagination(data.page, data.total_pages, pageId);
                break;
            case 'series-page':
                const allSeriesGrid = document.getElementById('all-series-grid');
                allSeriesGrid.innerHTML = loadingTemplate;
                data = await fetchFromTMDB('discover/tv?sort_by=popularity.desc', pageNumber);
                renderGrid(allSeriesGrid, data);
                renderPagination(data.page, data.total_pages, pageId);
                break;
            case 'watchlist-page':
                renderWatchlistGrid();
                break;
        }
    } catch (error) {
        console.error(`Failed to load page ${pageId}:`, error);
        pageContent.innerHTML = `<p class="text-gray-400 col-span-full text-center">Ocorreu um erro ao carregar o conteúdo.</p>`;
    }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadPageContent('home-page');

    closeAuthModalBtn.addEventListener('click', hideAuthModal);
    authModal.addEventListener('click', (e) => { if (e.target === authModal) hideAuthModal(); });
    
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = loginForm['login-email'].value;
        const password = loginForm['login-password'].value;
        signInWithEmailAndPassword(auth, email, password).catch(err => {
            document.getElementById('login-error').textContent = "Email ou senha inválidos.";
        });
    });

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = registerForm['register-email'].value;
        const password = registerForm['register-password'].value;
        createUserWithEmailAndPassword(auth, email, password).catch(err => {
            document.getElementById('register-error').textContent = "Erro ao criar conta.";
        });
    });

    googleSignInButton.addEventListener('click', () => {
        signInWithPopup(auth, provider).catch(err => console.error(err));
    });

    toggleAuthLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.toggle('hidden');
        registerForm.classList.toggle('hidden');
    });
    
    document.querySelector('header').addEventListener('click', (e) => {
        const navLink = e.target.closest('.nav-link');
        if (navLink) {
            triggerAd();
            e.preventDefault();
            loadPageContent(navLink.dataset.target);
        }
    });

    document.getElementById('search-input').addEventListener('focus', triggerAd);

    document.getElementById('search-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const query = document.getElementById('search-input').value.trim();
        if (!query) return;
        
        showPage('search-results-page');
        const grid = document.getElementById('search-results-grid');
        grid.innerHTML = loadingTemplate;
        document.getElementById('search-query-title').textContent = `Resultados para "${query}"`;
        
        const data = await fetchFromTMDB(`search/multi?query=${encodeURIComponent(query)}`);
        if (data && data.results) {
            data.results = data.results.filter(item => item.media_type !== 'person');
        }
        renderGrid(grid, data);
    });

    mainContent.addEventListener('click', async (e) => {
        const detailsLink = e.target.closest('.card > div[data-id]');
        const watchlistIcon = e.target.closest('.watchlist-icon');
        const navLink = e.target.closest('.nav-link');

        if (navLink) { // Captura cliques em "Ver Mais"
            triggerAd();
            e.preventDefault();
            loadPageContent(navLink.dataset.target);
            return;
        }

        if (watchlistIcon) {
            triggerAd();
            e.stopPropagation();
            if (!auth.currentUser || auth.currentUser.isAnonymous) {
                showAuthModal();
                return;
            }
            
            const { id, type, title, poster } = watchlistIcon.dataset;
            const itemData = {
                id: parseInt(id),
                title: title,
                poster_path: poster,
                media_type: type
            };

            if (isItemInWatchlist(itemData.id)) {
                await removeFromWatchlist(itemData.id);
                watchlistIcon.classList.remove('favorited');
            } else {
                await addToWatchlist(itemData);
                watchlistIcon.classList.add('favorited');
            }

        } else if (detailsLink) {
            triggerAd();
            const { id, type } = detailsLink.dataset;
            showPage('details-page');
            pageContent.innerHTML = loadingTemplate;
            const data = await fetchFromTMDB(`${type}/${id}`);
            if (data) {
                await renderDetails(data);
            } else {
                pageContent.innerHTML = `<p class="text-gray-400 text-center mt-10">Não foi possível carregar os detalhes.</p>`;
            }
        }
    });

    document.addEventListener('click', (e) => {
        const userMenuButton = document.getElementById('user-menu-button');
        const userMenu = document.getElementById('user-menu');
        if (userMenuButton && userMenu && !userMenuButton.contains(e.target) && !userMenu.contains(e.target)) {
            userMenu.classList.add('hidden');
        }
    });
});
