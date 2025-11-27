// main.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, onValue, push, set, update, remove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

// --- CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyB-mFZzq_s3ht4sTFnou_IekVK7KnJE4QU",
    authDomain: "buildathon-leaderboard.firebaseapp.com",
    databaseURL: "https://buildathon-leaderboard-default-rtdb.firebaseio.com",
    projectId: "buildathon-leaderboard",
    storageBucket: "buildathon-leaderboard.firebasestorage.app",
    messagingSenderId: "976413070924",
    appId: "1:976413070924:web:7770c2f9055b00e15c46e9",
    measurementId: "G-ZLJJZMPMS2"
};

// --- SETTINGS ---
const ADMIN_PASSWORD = "admin"; // CHANGE THIS TO YOUR DESIRED PASSWORD

// --- DATA: Countries by Region ---
const countriesData = {
    "North America": ["🇺🇸 United States", "🇨🇦 Canada", "🇲🇽 Mexico"],
    "South America": ["🇧🇷 Brazil", "🇦🇷 Argentina", "🇨🇴 Colombia", "🇨🇱 Chile", "🇵🇪 Peru"],
    "Europe": ["🇬🇧 United Kingdom", "🇩🇪 Germany", "🇫🇷 France", "🇪🇸 Spain", "🇮🇹 Italy", "🇳🇱 Netherlands", "🇵🇱 Poland", "🇺🇦 Ukraine", "🇨🇭 Switzerland"],
    "Asia": ["🇮🇳 India", "🇨🇳 China", "🇯🇵 Japan", "🇰🇷 South Korea", "🇸🇬 Singapore", "🇦🇪 UAE", "🇮🇩 Indonesia", "🇻🇳 Vietnam", "🇹🇭 Thailand"],
    "Africa": ["🇳🇬 Nigeria", "🇿🇦 South Africa", "🇰🇪 Kenya", "🇪🇬 Egypt", "🇬🇭 Ghana", "🇷🇼 Rwanda", "🇪🇹 Ethiopia"],
    "Oceania": ["🇦🇺 Australia", "🇳🇿 New Zealand", "🇫🇯 Fiji"]
};

// --- STATE ---
let app, database, ambassadorsRef;
let ambassadors = [];
let deleteTargetId = null;

// --- INITIALIZATION ---
try {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    ambassadorsRef = ref(database, 'ambassadors');
    console.log("✅ Firebase initialized");
} catch (error) {
    console.error("❌ Firebase init error:", error);
}

// --- DOM ELEMENTS ---
const dom = {
    navLeaderboard: document.getElementById('navLeaderboard'),
    navAdd: document.getElementById('navAdd'),
    navStats: document.getElementById('navStats'),
    sections: {
        leaderboard: document.getElementById('leaderboardSection'),
        add: document.getElementById('addSection'),
        stats: document.getElementById('statsSection')
    },
    form: {
        element: document.getElementById('ambassadorForm'),
        region: document.getElementById('region'),
        countryContainer: document.getElementById('countryContainer'),
        country: document.getElementById('country'),
    },
    leaderboardContainer: document.getElementById('leaderboardContainer'),
    totalAmbassadors: document.getElementById('totalAmbassadors'),
    statsContainer: document.getElementById('statsContainer'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    deleteModal: document.getElementById('deleteModal'),
    deleteAmbassadorName: document.getElementById('deleteAmbassadorName'),
    hamburger: document.getElementById('hamburger'),
    mobileMenu: document.getElementById('mobileMenu')
};

// --- AUTHENTICATION ---
function checkAdminPassword(action) {
    const input = prompt(`Enter Password to ${action}:`);
    if (input === ADMIN_PASSWORD) return true;
    
    alert("❌ Incorrect Password! Access Denied.");
    return false;
}

// --- NAVIGATION ---
function setupNavigation() {
    const handleNav = (target) => {
        Object.values(dom.sections).forEach(s => {
            s.classList.add('hidden');
            s.classList.remove('active');
        });
        
        dom.sections[target].classList.remove('hidden');
        dom.sections[target].classList.add('active');

        // Update Desktop Buttons
        [dom.navLeaderboard, dom.navAdd, dom.navStats].forEach(btn => {
            if(btn) btn.classList.remove('active', 'bg-purple-900', 'bg-opacity-20');
        });
        
        const activeBtn = document.getElementById(`nav${target.charAt(0).toUpperCase() + target.slice(1)}`);
        if(activeBtn) activeBtn.classList.add('active', 'bg-purple-900', 'bg-opacity-20');

        // Close mobile menu
        dom.mobileMenu.classList.add('hidden');
    };

    dom.navLeaderboard.addEventListener('click', () => handleNav('leaderboard'));
    dom.navAdd.addEventListener('click', () => handleNav('add'));
    dom.navStats.addEventListener('click', () => handleNav('stats'));

    // Mobile Hamburger
    dom.hamburger.addEventListener('click', () => {
        dom.mobileMenu.classList.toggle('hidden');
    });

    // Mobile Links
    document.querySelectorAll('.mobile-menu-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            handleNav(link.dataset.target);
        });
    });
}

// --- REGION & COUNTRY LOGIC ---
function setupRegionListener() {
    dom.form.region.addEventListener('change', (e) => {
        const region = e.target.value;
        const countrySelect = dom.form.country;
        const container = dom.form.countryContainer;
        
        // Clear previous options
        countrySelect.innerHTML = '<option value="">Select a country...</option>';

        if (region && countriesData[region]) {
            container.classList.remove('hidden');
            countriesData[region].forEach(country => {
                const option = document.createElement('option');
                option.value = country;
                option.textContent = country;
                countrySelect.appendChild(option);
            });
        } else {
            container.classList.add('hidden');
        }
    });
}

// --- RENDERING ---
function renderLeaderboard() {
    if (ambassadors.length === 0) {
        dom.leaderboardContainer.innerHTML = `
            <div class="p-12 text-center text-gray-500 flex flex-col items-center justify-center">
                <div class="text-6xl mb-4 opacity-50">🏆</div>
                <h3 class="text-xl font-medium text-gray-400">No Ambassadors Yet</h3>
                <p class="text-sm mt-2">Be the first to join the leaderboard!</p>
            </div>`;
        return;
    }

    const tableHTML = `
        <table class="leaderboard-table w-full text-left border-collapse">
            <thead>
                <tr class="bg-gray-700/50 text-gray-300 text-xs uppercase tracking-wider">
                    <th class="p-4 font-bold border-b border-gray-600">Rank</th>
                    <th class="p-4 font-bold border-b border-gray-600">Name</th>
                    <th class="p-4 font-bold border-b border-gray-600">Region / Country</th>
                    <th class="p-4 font-bold border-b border-gray-600 text-right">Score</th>
                    <th class="p-4 font-bold border-b border-gray-600 text-center">Actions</th>
                </tr>
            </thead>
            <tbody class="text-gray-300 divide-y divide-gray-700">
                ${ambassadors.map((a, index) => {
                    const rank = index + 1;
                    let badgeClass = 'bg-gray-700 text-gray-300';
                    let rowClass = 'hover:bg-gray-700/30';
                    let trophy = '';

                    if (rank === 1) { 
                        badgeClass = 'bg-yellow-500 text-black shadow-yellow-500/50 shadow-md'; 
                        rowClass = 'bg-yellow-500/10 hover:bg-yellow-500/20';
                        trophy = '👑 ';
                    } else if (rank === 2) { 
                        badgeClass = 'bg-gray-300 text-black shadow-white/50 shadow-md'; 
                        trophy = '🥈 ';
                    } else if (rank === 3) { 
                        badgeClass = 'bg-orange-500 text-black shadow-orange-500/50 shadow-md'; 
                        trophy = '🥉 ';
                    }

                    // Uses the 'region' field which now contains the Country
                    const locationDisplay = a.region || 'Unknown';

                    return `
                    <tr class="${rowClass} transition-colors duration-200">
                        <td class="p-4">
                            <div class="flex items-center gap-2">
                                <span class="${badgeClass} w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm">
                                    ${rank}
                                </span>
                            </div>
                        </td>
                        <td class="p-4">
                            <span class="font-semibold text-white text-lg">${trophy}${a.name}</span>
                        </td>
                        <td class="p-4">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-900 text-purple-200 border border-purple-700">
                                ${locationDisplay}
                            </span>
                        </td>
                        <td class="p-4 text-right">
                            <span class="font-mono text-xl font-bold text-cyan-400 tracking-tight">${a.score.toLocaleString()}</span>
                        </td>
                        <td class="p-4 text-center">
                            <div class="flex items-center justify-center gap-2">
                                <button onclick="editAmbassador('${a.id}')" 
                                        class="action-btn p-2 text-cyan-400 hover:bg-cyan-900/30 rounded-lg transition-colors" 
                                        title="Edit Score">
                                    ✏️
                                </button>
                                <button onclick="showDeleteModal('${a.id}', '${a.name}')" 
                                        class="action-btn p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors" 
                                        title="Delete">
                                    🗑️
                                </button>
                            </div>
                        </td>
                    </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    dom.leaderboardContainer.innerHTML = tableHTML;
    dom.totalAmbassadors.textContent = `Total Ambassadors: ${ambassadors.length}`;
}

function updateStats() {
    if (ambassadors.length === 0) return;
    
    const total = ambassadors.length;
    const avg = Math.round(ambassadors.reduce((s, a) => s + a.score, 0) / total);
    const max = Math.max(...ambassadors.map(a => a.score));

    dom.statsContainer.innerHTML = `
        <div class="bg-gray-800 p-6 rounded-xl border border-purple-500/30 shadow-lg text-center transform hover:scale-105 transition-transform">
            <h3 class="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">Total Ambassadors</h3>
            <div class="text-4xl font-bold text-white">${total}</div>
        </div>
        <div class="bg-gray-800 p-6 rounded-xl border border-blue-500/30 shadow-lg text-center transform hover:scale-105 transition-transform">
            <h3 class="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">Average Score</h3>
            <div class="text-4xl font-bold text-blue-400">${avg.toLocaleString()}</div>
        </div>
        <div class="bg-gray-800 p-6 rounded-xl border border-yellow-500/30 shadow-lg text-center transform hover:scale-105 transition-transform">
            <h3 class="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">Top Score</h3>
            <div class="text-4xl font-bold text-yellow-400">${max.toLocaleString()}</div>
        </div>
    `;
}

// --- CRUD OPERATIONS ---
dom.form.element.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!checkAdminPassword('Add Ambassador')) return;

    const name = document.getElementById('name').value.trim();
    // We get the selected country here
    const country = document.getElementById('country').value;
    const score = parseInt(document.getElementById('score').value) || 0;

    if (!name || !country) {
        alert("⚠️ Please select a Region and a Country.");
        return;
    }

    try {
        const newRef = push(ambassadorsRef);
        await set(newRef, {
            id: newRef.key,
            name,
            // SAVE SELECTION: Store 'country' in the 'region' database field
            // This ensures NO new fields are created in your database.
            region: country, 
            score,
            createdAt: new Date().toISOString()
        });
        dom.form.element.reset();
        dom.form.countryContainer.classList.add('hidden');
        alert("✅ Ambassador Added Successfully!");
        dom.navLeaderboard.click();
    } catch (err) {
        console.error(err);
        alert("❌ Error adding ambassador");
    }
});

window.editAmbassador = async (id) => {
    if (!checkAdminPassword('Edit Score')) return;
    const amb = ambassadors.find(a => a.id === id);
    if (!amb) return;
    const newScore = prompt(`Update score for ${amb.name}:`, amb.score);
    if (newScore === null) return; 
    
    const scoreVal = parseInt(newScore);
    if (isNaN(scoreVal) || scoreVal < 0) {
        alert("Please enter a valid positive number.");
        return;
    }
    try {
        await update(ref(database, `ambassadors/${id}`), { score: scoreVal });
    } catch (err) {
        alert("Error updating score");
    }
};

window.showDeleteModal = (id, name) => {
    deleteTargetId = id;
    dom.deleteAmbassadorName.textContent = name;
    dom.deleteModal.classList.remove('hidden');
};

document.getElementById('confirmDelete').addEventListener('click', async () => {
    if (!deleteTargetId) return;
    dom.deleteModal.classList.add('hidden');
    if (!checkAdminPassword('Delete Ambassador')) {
        deleteTargetId = null;
        return; 
    }
    try {
        await remove(ref(database, `ambassadors/${deleteTargetId}`));
        deleteTargetId = null;
        alert("🗑️ Ambassador Deleted.");
    } catch (err) {
        alert("Error deleting ambassador");
        dom.deleteModal.classList.remove('hidden');
    }
});

document.getElementById('cancelDelete').addEventListener('click', () => {
    dom.deleteModal.classList.add('hidden');
    deleteTargetId = null;
});

document.getElementById('printLeaderboard').addEventListener('click', () => window.print());

function init() {
    setupNavigation();
    setupRegionListener();
    onValue(ambassadorsRef, (snapshot) => {
        const data = snapshot.val() || {};
        ambassadors = Object.values(data).sort((a, b) => b.score - a.score);
        setTimeout(() => {
            renderLeaderboard();
            updateStats();
            dom.loadingSpinner.classList.add('hidden');
        }, 300);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}