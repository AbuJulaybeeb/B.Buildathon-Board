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

const ADMIN_PASSWORD = "admin"; // Simple password for demonstration

// --- DATA: Countries by Region ---
const countriesData = {
    "North America": ["🇺🇸 United States", "🇨🇦 Canada", "🇲🇽 Mexico"],
    "South America": ["🇧🇷 Brazil", "🇦🇷 Argentina", "🇨🇴 Colombia", "🇨🇱 Chile"],
    "Europe": ["🇬🇧 UK", "🇩🇪 Germany", "🇫🇷 France", "🇪🇸 Spain", "🇮🇹 Italy", "🇳🇱 Netherlands", "🇵🇱 Poland"],
    "Asia": ["🇮🇳 India", "🇨🇳 China", "🇯🇵 Japan", "🇰🇷 South Korea", "🇸🇬 Singapore", "🇦🇪 UAE", "🇮🇩 Indonesia"],
    "Africa": ["🇳🇬 Nigeria", "🇿🇦 South Africa", "🇰🇪 Kenya", "🇪🇬 Egypt", "🇬🇭 Ghana"],
    "Oceania": ["🇦🇺 Australia", "🇳🇿 New Zealand"]
};

// --- INITIALIZATION ---
let app, database, ambassadorsRef;
let ambassadors = [];
let deleteTargetId = null;

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
        message: document.getElementById('formMessage')
    },
    leaderboardContainer: document.getElementById('leaderboardContainer'),
    totalAmbassadors: document.getElementById('totalAmbassadors'),
    statsContainer: document.getElementById('statsContainer'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    deleteModal: document.getElementById('deleteModal'),
    hamburger: document.getElementById('hamburger'),
    mobileMenu: document.getElementById('mobileMenu')
};

// --- AUTHENTICATION ---
function checkAdminPassword() {
    const input = prompt("Enter Admin Password to continue:");
    if (input === ADMIN_PASSWORD) return true;
    alert("❌ Incorrect Password!");
    return false;
}

// --- NAVIGATION ---
function setupNavigation() {
    const handleNav = (target) => {
        // Hide all sections
        Object.values(dom.sections).forEach(s => {
            s.classList.add('hidden');
            s.classList.remove('active');
        });
        
        // Show target
        dom.sections[target].classList.remove('hidden');
        dom.sections[target].classList.add('active');

        // Update Buttons
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
        
        // Clear previous options
        countrySelect.innerHTML = '<option value="">Select a country</option>';

        if (region && countriesData[region]) {
            dom.form.countryContainer.classList.remove('hidden');
            countriesData[region].forEach(country => {
                const option = document.createElement('option');
                option.value = country;
                option.textContent = country;
                countrySelect.appendChild(option);
            });
        } else {
            dom.form.countryContainer.classList.add('hidden');
        }
    });
}

// --- RENDERING ---
function renderLeaderboard() {
    if (ambassadors.length === 0) {
        dom.leaderboardContainer.innerHTML = `
            <div class="p-8 text-center text-gray-400">
                <div class="text-4xl mb-4">🏆</div>
                <p>No ambassadors yet.</p>
            </div>`;
        return;
    }

    const tableHTML = `
        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="bg-gray-700 text-gray-300">
                    <th class="p-4 rounded-tl-lg">Rank</th>
                    <th class="p-4">Name</th>
                    <th class="p-4">Country</th>
                    <th class="p-4">Score</th>
                    <th class="p-4 rounded-tr-lg text-center">Actions</th>
                </tr>
            </thead>
            <tbody class="text-gray-300">
                ${ambassadors.map((a, index) => {
                    const rank = index + 1;
                    let badgeColor = 'bg-gray-700';
                    if (rank === 1) badgeColor = 'bg-yellow-500 text-black';
                    if (rank === 2) badgeColor = 'bg-gray-300 text-black';
                    if (rank === 3) badgeColor = 'bg-orange-500 text-black';

                    // Display Country if available, else Region
                    const locationDisplay = a.country || a.region;

                    return `
                    <tr class="border-b border-gray-700 hover:bg-gray-750 transition">
                        <td class="p-4">
                            <span class="${badgeColor} w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm shadow-md">
                                ${rank}
                            </span>
                        </td>
                        <td class="p-4 font-semibold text-white">${a.name}</td>
                        <td class="p-4">
                            <span class="px-3 py-1 rounded-full bg-purple-500 bg-opacity-20 text-purple-300 border border-purple-500 border-opacity-30 text-sm">
                                ${locationDisplay}
                            </span>
                        </td>
                        <td class="p-4 font-mono text-lg font-bold text-purple-400">${a.score.toLocaleString()}</td>
                        <td class="p-4 text-center space-x-2">
                            <button onclick="editAmbassador('${a.id}')" class="text-cyan-400 hover:text-cyan-300 transition text-sm font-medium px-2 py-1 border border-cyan-900 rounded bg-cyan-900 bg-opacity-20 hover:bg-opacity-40">Edit</button>
                            <button onclick="showDeleteModal('${a.id}', '${a.name}')" class="text-red-400 hover:text-red-300 transition text-sm font-medium px-2 py-1 border border-red-900 rounded bg-red-900 bg-opacity-20 hover:bg-opacity-40">Delete</button>
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
        <div class="stat-card">
            <div class="stat-value text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">${total}</div>
            <p class="text-gray-400 mt-2">Total Ambassadors</p>
        </div>
        <div class="stat-card">
            <div class="stat-value text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-600">${avg.toLocaleString()}</div>
            <p class="text-gray-400 mt-2">Average Score</p>
        </div>
        <div class="stat-card">
            <div class="stat-value text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-600">${max.toLocaleString()}</div>
            <p class="text-gray-400 mt-2">Highest Score</p>
        </div>
    `;
}

// --- CRUD OPERATIONS ---

// 1. ADD
dom.form.element.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!checkAdminPassword()) return; // Password Check

    const name = document.getElementById('name').value.trim();
    const region = document.getElementById('region').value;
    const country = document.getElementById('country').value; // Get Country
    const score = parseInt(document.getElementById('score').value) || 0;

    if (!name || !region || !country) {
        alert("Please fill in Name, Region, and Country.");
        return;
    }

    try {
        const newRef = push(ambassadorsRef);
        await set(newRef, {
            id: newRef.key,
            name,
            region,
            country, // Save Country
            score,
            createdAt: new Date().toISOString()
        });

        dom.form.element.reset();
        dom.form.countryContainer.classList.add('hidden');
        alert("✅ Ambassador Added!");
        // Go to leaderboard
        dom.navLeaderboard.click();
    } catch (err) {
        console.error(err);
        alert("Error adding ambassador");
    }
});

// 2. EDIT (Exposed to Window)
window.editAmbassador = async (id) => {
    if (!checkAdminPassword()) return; // Password Check

    const amb = ambassadors.find(a => a.id === id);
    if (!amb) return;

    const newScore = prompt(`Update score for ${amb.name}:`, amb.score);
    if (newScore === null) return;

    try {
        await update(ref(database, `ambassadors/${id}`), {
            score: parseInt(newScore)
        });
        // No alert needed, realtime listener updates UI
    } catch (err) {
        alert("Error updating score");
    }
};

// 3. DELETE (Exposed to Window)
window.showDeleteModal = (id, name) => {
    deleteTargetId = id;
    document.getElementById('deleteAmbassadorName').textContent = name;
    dom.deleteModal.classList.remove('hidden');
};

document.getElementById('confirmDelete').addEventListener('click', async () => {
    if (!deleteTargetId) return;
    
    // Hide modal first
    dom.deleteModal.classList.add('hidden');

    if (!checkAdminPassword()) { // Password Check
        deleteTargetId = null;
        return; 
    }

    try {
        await remove(ref(database, `ambassadors/${deleteTargetId}`));
        deleteTargetId = null;
    } catch (err) {
        alert("Error deleting ambassador");
    }
});

document.getElementById('cancelDelete').addEventListener('click', () => {
    dom.deleteModal.classList.add('hidden');
    deleteTargetId = null;
});

document.getElementById('printLeaderboard').addEventListener('click', () => window.print());

// --- APP START ---
function init() {
    setupNavigation();
    setupRegionListener();

    onValue(ambassadorsRef, (snapshot) => {
        const data = snapshot.val() || {};
        ambassadors = Object.values(data).sort((a, b) => b.score - a.score);
        
        renderLeaderboard();
        updateStats();
        dom.loadingSpinner.classList.add('hidden');
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}