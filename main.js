// Import Firebase functions using correct CDN URLs
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import { getDatabase, ref, onValue, push, set, update, remove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

// Firebase configuration - Replace with your actual config
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

// Initialize Firebase
let app, database, ambassadorsRef;
try {
    app = initializeApp(firebaseConfig);
    const analytics = getAnalytics(app);
    database = getDatabase(app);
    ambassadorsRef = ref(database, 'ambassadors');
    console.log("✅ Firebase initialized successfully");
} catch (error) {
    console.error("❌ Firebase initialization error:", error);
}

// Global state
let ambassadors = [];
let deleteTargetId = null;

// DOM Elements
const navLeaderboard = document.getElementById('navLeaderboard');
const navAdd = document.getElementById('navAdd');
const navStats = document.getElementById('navStats');
const leaderboardSection = document.getElementById('leaderboardSection');
const addSection = document.getElementById('addSection');
const statsSection = document.getElementById('statsSection');
const ambassadorForm = document.getElementById('ambassadorForm');
const leaderboardContainer = document.getElementById('leaderboardContainer');
const totalAmbassadors = document.getElementById('totalAmbassadors');
const statsContainer = document.getElementById('statsContainer');
const loadingSpinner = document.getElementById('loadingSpinner');
const deleteModal = document.getElementById('deleteModal');
const confirmDeleteBtn = document.getElementById('confirmDelete');
const cancelDeleteBtn = document.getElementById('cancelDelete');
const deleteAmbassadorName = document.getElementById('deleteAmbassadorName');
const printLeaderboard = document.getElementById('printLeaderboard');
const formMessage = document.getElementById('formMessage');

// Navigation handler
function setupNavigation() {
    navLeaderboard.addEventListener('click', () => showPage('leaderboard'));
    navAdd.addEventListener('click', () => showPage('add'));
    navStats.addEventListener('click', () => showPage('stats'));

    // Mobile hamburger + menu logic
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileOverlay = document.getElementById('mobileOverlay');

    function closeMobileMenu() {
        mobileMenu?.classList.add('hidden');
        mobileOverlay?.classList.add('hidden');
        hamburger?.classList.remove('open');
    }

    function openMobileMenu() {
        mobileMenu?.classList.remove('hidden');
        mobileOverlay?.classList.remove('hidden');
        hamburger?.classList.add('open');
    }

    if (hamburger) {
        hamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (mobileMenu && mobileMenu.classList.contains('hidden')) {
                openMobileMenu();
            } else {
                closeMobileMenu();
            }
        });
    }

    // Close when clicking overlay
    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', () => {
            closeMobileMenu();
        });
    }

    // Mobile menu links
    const mobileLinks = document.querySelectorAll('.mobile-menu-link');
    mobileLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('data-target');
            if (target) showPage(target);
            closeMobileMenu();
        });
    });

    // Close mobile menu when resizing to desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768) closeMobileMenu();
    });
}

// Show/hide pages
function showPage(page) {
    // Hide all sections
    leaderboardSection.classList.remove('active');
    addSection.classList.remove('active');
    statsSection.classList.remove('active');

    // Remove active class from all nav buttons
    navLeaderboard.classList.remove('active');
    navAdd.classList.remove('active');
    navStats.classList.remove('active');

    // Show selected section and update nav
    switch(page) {
        case 'leaderboard':
            leaderboardSection.classList.add('active');
            navLeaderboard.classList.add('active');
            break;
        case 'add':
            addSection.classList.add('active');
            navAdd.classList.add('active');
            break;
        case 'stats':
            statsSection.classList.add('active');
            navStats.classList.add('active');
            break;
    }
}

// Format leaderboard table
function renderLeaderboard() {
    if (ambassadors.length === 0) {
        leaderboardContainer.innerHTML = `
            <div class="p-8 text-center text-gray-400">
                <div class="text-4xl mb-4">🏆</div>
                <p class="text-lg">No ambassadors yet</p>
                <p class="text-sm">Add the first ambassador to get started!</p>
            </div>
        `;
        return;
    }

    const table = document.createElement('table');
    table.className = 'leaderboard-table';
    
    table.innerHTML = `
        <thead>
            <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>Region</th>
                <th>Score</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${ambassadors.map((ambassador, index) => {
                const rank = index + 1;
                let rankClass = 'rank-other';
                if (rank === 1) rankClass = 'rank-1';
                else if (rank === 2) rankClass = 'rank-2';
                else if (rank === 3) rankClass = 'rank-3';

                return `
                    <tr class="leaderboard-item">
                        <td><span class="rank-badge ${rankClass}">#${rank}</span></td>
                        <td>${ambassador.name}</td>
                        <td><span class="region-badge">${ambassador.region}</span></td>
                        <td class="font-bold">${ambassador.score.toLocaleString()}</td>
                        <td>
                            <button class="action-btn edit-btn" onclick="editAmbassador('${ambassador.id}')">Edit</button>
                            <button class="action-btn delete-btn" onclick="showDeleteModal('${ambassador.id}', '${ambassador.name}')">Delete</button>
                        </td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    `;

    leaderboardContainer.innerHTML = '';
    leaderboardContainer.appendChild(table);
    totalAmbassadors.textContent = `Total Ambassadors: ${ambassadors.length}`;
}

// Update statistics
function updateStats() {
    if (ambassadors.length === 0) {
        statsContainer.innerHTML = `
            <div class="p-8 text-center text-gray-400 col-span-full">
                <div class="text-4xl mb-4">📊</div>
                <p class="text-lg">No statistics available</p>
            </div>
        `;
        return;
    }

    const total = ambassadors.length;
    const avgScore = Math.round(ambassadors.reduce((sum, a) => sum + a.score, 0) / total);
    const maxScore = Math.max(...ambassadors.map(a => a.score));
    const regions = new Set(ambassadors.map(a => a.region));

    statsContainer.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${total}</div>
            <p class="text-gray-300 mt-2">Total Ambassadors</p>
        </div>
        <div class="stat-card">
            <div class="stat-value">${avgScore.toLocaleString()}</div>
            <p class="text-gray-300 mt-2">Average Score</p>
        </div>
        <div class="stat-card">
            <div class="stat-value">${maxScore.toLocaleString()}</div>
            <p class="text-gray-300 mt-2">Highest Score</p>
        </div>
        <div class="stat-card">
            <div class="stat-value">${regions.size}</div>
            <p class="text-gray-300 mt-2">Active Regions</p>
        </div>
    `;
}

// Add ambassador
ambassadorForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const region = document.getElementById('region').value;
    const score = parseInt(document.getElementById('score').value) || 0;

    if (!name || !region) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

    try {
        const newRef = push(ambassadorsRef);
        const newId = newRef.key;
        
        await set(newRef, {
            id: newId,
            name,
            region,
            score,
            createdAt: new Date().toISOString()
        });

        showMessage('Ambassador added successfully!', 'success');
        ambassadorForm.reset();
        setTimeout(() => showPage('leaderboard'), 1500);
    } catch (error) {
        console.error('Error adding ambassador:', error);
        showMessage('Failed to add ambassador', 'error');
    }
});

// Edit ambassador
async function editAmbassador(ambassadorId) {
    const ambassador = ambassadors.find(a => a.id === ambassadorId);
    if (!ambassador) return;

    const newScore = prompt(`Update score for ${ambassador.name}:`, ambassador.score);
    if (newScore === null) return;

    const score = parseInt(newScore) || 0;
    if (score < 0) {
        showMessage('Score must be a positive number', 'error');
        return;
    }

    try {
        await update(ref(database, `ambassadors/${ambassadorId}`), { score });
        showMessage('Ambassador updated successfully!', 'success');
    } catch (error) {
        console.error('Error updating ambassador:', error);
        showMessage('Failed to update ambassador', 'error');
    }
}

// Delete modal
function showDeleteModal(ambassadorId, ambassadorName) {
    deleteTargetId = ambassadorId;
    deleteAmbassadorName.textContent = ambassadorName;
    deleteModal.classList.remove('hidden');
}

async function confirmDeleteAction() {
    if (!deleteTargetId) return;

    try {
        await remove(ref(database, `ambassadors/${deleteTargetId}`));
        deleteModal.classList.add('hidden');
        showMessage('Ambassador deleted successfully!', 'success');
    } catch (error) {
        console.error('Error deleting ambassador:', error);
        showMessage('Failed to delete ambassador', 'error');
    }
}

confirmDeleteBtn.addEventListener('click', confirmDeleteAction);
cancelDeleteBtn.addEventListener('click', () => deleteModal.classList.add('hidden'));

// Print leaderboard
printLeaderboard.addEventListener('click', () => {
    window.print();
});

// Show message
function showMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = `mt-6 p-4 rounded-lg ${type === 'success' ? 'success-message' : 'error-message'}`;
    formMessage.classList.remove('hidden');
    setTimeout(() => formMessage.classList.add('hidden'), 5000);
}

// Firebase listener
function setupDataListener() {
    onValue(ambassadorsRef, (snapshot) => {
        const data = snapshot.val() || {};
        ambassadors = Object.values(data)
            .sort((a, b) => b.score - a.score);
        
        renderLeaderboard();
        updateStats();
        
        loadingSpinner.classList.add('hidden');
    }, (error) => {
        console.error('Firebase error:', error);
        loadingSpinner.classList.add('hidden');
        showMessage('Failed to load data', 'error');
    });
}

// Initialize app
function init() {
    console.log('Initializing app...');
    setupNavigation();
    setupDataListener();
}

// ===== EXPOSE FUNCTIONS TO GLOBAL SCOPE =====
// Make functions available for inline onclick handlers in HTML
window.editAmbassador = editAmbassador;
window.showDeleteModal = showDeleteModal;

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}