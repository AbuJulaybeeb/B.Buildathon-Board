// app.js
/**
 * Main Application Logic for BlockDag Buildathon Leaderboard
 * Handles UI interactions, data display, and user interactions
 */

// Global state
let ambassadors = [];
let unsubscribeAmbassadors = null;
let currentEditingId = null;
let ambassadorToDelete = null;

// DOM Elements
const loadingSpinner = document.getElementById('loadingSpinner');
const leaderboardContainer = document.getElementById('leaderboardContainer');
const statsContainer = document.getElementById('statsContainer');
const ambassadorForm = document.getElementById('ambassadorForm');
const formMessage = document.getElementById('formMessage');
const deleteModal = document.getElementById('deleteModal');
const deleteAmbassadorName = document.getElementById('deleteAmbassadorName');
const confirmDelete = document.getElementById('confirmDelete');
const cancelDelete = document.getElementById('cancelDelete');
const totalAmbassadors = document.getElementById('totalAmbassadors');

// Navigation elements
const navLeaderboard = document.getElementById('navLeaderboard');
const navAdd = document.getElementById('navAdd');
const navStats = document.getElementById('navStats');
const leaderboardSection = document.getElementById('leaderboardSection');
const addSection = document.getElementById('addSection');
const statsSection = document.getElementById('statsSection');
const printLeaderboard = document.getElementById('printLeaderboard');

/**
 * Initializes the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

/**
 * Sets up event listeners and initial data loading
 */
function initializeApp() {
    // Navigation event listeners
    navLeaderboard.addEventListener('click', () => switchPage('leaderboard'));
    navAdd.addEventListener('click', () => switchPage('add'));
    navStats.addEventListener('click', () => switchPage('stats'));
    
    // Form submission
    ambassadorForm.addEventListener('submit', handleFormSubmit);
    
    // Print functionality
    printLeaderboard.addEventListener('click', handlePrint);
    
    // Delete modal handlers
    confirmDelete.addEventListener('click', handleConfirmDelete);
    cancelDelete.addEventListener('click', hideDeleteModal);
    
    // Start listening to real-time data updates
    startDataListening();
}

/**
 * Switches between application pages
 * @param {string} page - The page to switch to ('leaderboard', 'add', 'stats')
 */
function switchPage(page) {
    // Hide all sections
    leaderboardSection.classList.remove('active');
    addSection.classList.remove('active');
    statsSection.classList.remove('active');
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.classList.add('border', 'border-gray-600');
        btn.classList.remove('border-purple-500', 'bg-purple-900', 'bg-opacity-20');
    });
    
    // Show selected section and activate corresponding nav button
    switch(page) {
        case 'leaderboard':
            leaderboardSection.classList.add('active');
            navLeaderboard.classList.add('active', 'border-purple-500', 'bg-purple-900', 'bg-opacity-20');
            navLeaderboard.classList.remove('border-gray-600');
            break;
        case 'add':
            addSection.classList.add('active');
            navAdd.classList.add('active', 'border-purple-500', 'bg-purple-900', 'bg-opacity-20');
            navAdd.classList.remove('border-gray-600');
            break;
        case 'stats':
            statsSection.classList.add('active');
            navStats.classList.add('active', 'border-purple-500', 'bg-purple-900', 'bg-opacity-20');
            navStats.classList.remove('border-gray-600');
            updateStatistics();
            break;
    }
}

/**
 * Starts listening to real-time data updates from Firebase
 */
function startDataListening() {
    unsubscribeAmbassadors = listenToAmbassadors((data) => {
        ambassadors = data;
        updateLeaderboard();
        updateTotalAmbassadors();
        hideLoadingSpinner();
    });
}

/**
 * Updates the total ambassadors count display
 */
function updateTotalAmbassadors() {
    totalAmbassadors.textContent = `Total Ambassadors: ${ambassadors.length}`;
}

/**
 * Hides the loading spinner
 */
function hideLoadingSpinner() {
    loadingSpinner.style.display = 'none';
}

/**
 * Updates the leaderboard display with current ambassador data
 */
function updateLeaderboard() {
    if (ambassadors.length === 0) {
        leaderboardContainer.innerHTML = `
            <div class="p-8 text-center text-gray-400">
                <p class="text-lg mb-2">No ambassadors yet</p>
                <p class="text-sm">Add the first ambassador to get started!</p>
            </div>
        `;
        return;
    }
    
    let leaderboardHTML = `
        <table class="leaderboard-table w-full">
            <thead>
                <tr class="bg-gray-750">
                    <th class="p-4 font-semibold text-left">RANK</th>
                    <th class="p-4 font-semibold text-left">NAME</th>
                    <th class="p-4 font-semibold text-left">REGION</th>
                    <th class="p-4 font-semibold text-right">SCORE</th>
                    <th class="p-4 font-semibold text-center">ACTIONS</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    ambassadors.forEach((ambassador, index) => {
        const rank = index + 1;
        const trophy = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : '';
        
        leaderboardHTML += `
            <tr class="leaderboard-item hover:bg-gray-750 transition-colors">
                <td class="p-4">
                    <div class="flex items-center space-x-3">
                        <div class="rank-badge ${getRankClass(rank)}">
                            #${rank}
                        </div>
                        <span class="text-xl">${trophy}</span>
                    </div>
                </td>
                <td class="p-4 font-medium">${ambassador.name}</td>
                <td class="p-4">
                    <span class="region-badge">${ambassador.region}</span>
                </td>
                <td class="p-4 text-right font-mono font-bold">
                    ${currentEditingId === ambassador.id ? 
                        `<input type="number" value="${ambassador.score}" min="0" class="score-input" id="editScore-${ambassador.id}">` : 
                        ambassador.score.toLocaleString()}
                </td>
                <td class="p-4 text-center">
                    ${currentEditingId === ambassador.id ? 
                        `<button class="action-btn edit-btn mr-2" onclick="saveScore('${ambassador.id}')">💾 Save</button>
                         <button class="action-btn delete-btn" onclick="cancelEdit()">❌ Cancel</button>` :
                        `<button class="action-btn edit-btn mr-2" onclick="startEdit('${ambassador.id}')">✏️ Edit</button>
                         <button class="action-btn delete-btn" onclick="showDeleteModal('${ambassador.id}', '${ambassador.name}')">🗑️ Delete</button>`
                    }
                </td>
            </tr>
        `;
    });
    
    leaderboardHTML += `
                </tbody>
            </table>
    `;
    
    leaderboardContainer.innerHTML = leaderboardHTML;
}

/**
 * Gets CSS class for rank badge based on position
 * @param {number} rank - The rank position (1-based)
 * @returns {string} CSS class for the rank badge
 */
function getRankClass(rank) {
    switch(rank) {
        case 1: return 'rank-1';
        case 2: return 'rank-2';
        case 3: return 'rank-3';
        default: return 'rank-other';
    }
}

/**
 * Starts editing an ambassador's score
 * @param {string} ambassadorId - The ID of the ambassador to edit
 */
function startEdit(ambassadorId) {
    currentEditingId = ambassadorId;
    updateLeaderboard();
}

/**
 * Cancels the current edit operation
 */
function cancelEdit() {
    currentEditingId = null;
    updateLeaderboard();
}

/**
 * Saves the updated score for an ambassador
 * @param {string} ambassadorId - The ID of the ambassador to update
 */
function saveScore(ambassadorId) {
    const scoreInput = document.getElementById(`editScore-${ambassadorId}`);
    const newScore = parseInt(scoreInput.value);
    
    if (isNaN(newScore) || newScore < 0) {
        showMessage('error', 'Please enter a valid score (0 or higher)');
        return;
    }
    
    updateAmbassadorScore(ambassadorId, newScore)
        .then(() => {
            currentEditingId = null;
            updateLeaderboard();
            showMessage('success', 'Score updated successfully!');
        })
        .catch(error => {
            console.error('Error updating score:', error);
            showMessage('error', 'Failed to update score. Please try again.');
        });
}

/**
 * Shows the delete confirmation modal
 * @param {string} ambassadorId - The ID of the ambassador to delete
 * @param {string} ambassadorName - The name of the ambassador to delete
 */
function showDeleteModal(ambassadorId, ambassadorName) {
    ambassadorToDelete = ambassadorId;
    deleteAmbassadorName.textContent = ambassadorName;
    deleteModal.classList.remove('hidden');
}

/**
 * Hides the delete confirmation modal
 */
function hideDeleteModal() {
    deleteModal.classList.add('hidden');
    ambassadorToDelete = null;
}

/**
 * Handles the confirm delete action
 */
function handleConfirmDelete() {
    if (!ambassadorToDelete) return;
    
    deleteAmbassador(ambassadorToDelete)
        .then(() => {
            hideDeleteModal();
            showMessage('success', 'Ambassador deleted successfully!');
        })
        .catch(error => {
            console.error('Error deleting ambassador:', error);
            showMessage('error', 'Failed to delete ambassador. Please try again.');
            hideDeleteModal();
        });
}

/**
 * Handles form submission for adding a new ambassador
 * @param {Event} event - The form submission event
 */
function handleFormSubmit(event) {
    event.preventDefault();
    
    const name = document.getElementById('name').value.trim();
    const region = document.getElementById('region').value;
    const score = parseInt(document.getElementById('score').value);
    
    // Form validation
    if (!name) {
        showMessage('error', 'Please enter a name for the ambassador');
        return;
    }
    
    if (!region) {
        showMessage('error', 'Please select a region');
        return;
    }
    
    if (isNaN(score) || score < 0) {
        showMessage('error', 'Please enter a valid score (0 or higher)');
        return;
    }
    
    // Show loading state
    const submitButton = ambassadorForm.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<div class="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mx-auto"></div>';
    submitButton.disabled = true;
    
    // Add ambassador to database
    addAmbassador({ name, region, score })
        .then(() => {
            // Reset form
            ambassadorForm.reset();
            showMessage('success', 'Ambassador added successfully!');
            
            // Switch to leaderboard view
            setTimeout(() => switchPage('leaderboard'), 1000);
        })
        .catch(error => {
            console.error('Error adding ambassador:', error);
            showMessage('error', 'Failed to add ambassador. Please try again.');
        })
        .finally(() => {
            // Restore button state
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
        });
}

/**
 * Shows a message to the user
 * @param {string} type - The type of message ('success' or 'error')
 * @param {string} text - The message text
 */
function showMessage(type, text) {
    // For form messages
    if (formMessage) {
        formMessage.textContent = text;
        formMessage.className = '';
        formMessage.classList.add(type === 'success' ? 'success-message' : 'error-message');
        formMessage.classList.remove('hidden');
        
        // Auto-hide success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                formMessage.classList.add('hidden');
            }, 3000);
        }
    }
    
    // Also log to console for debugging
    console.log(`${type.toUpperCase()}: ${text}`);
}

/**
 * Updates the statistics dashboard
 */
function updateStatistics() {
    if (ambassadors.length === 0) {
        statsContainer.innerHTML = `
            <div class="col-span-3 p-8 text-center text-gray-400">
                <p>No data available for statistics</p>
                <p class="text-sm mt-2">Add ambassadors to see statistics</p>
            </div>
        `;
        return;
    }
    
    // Calculate statistics
    const totalAmbassadorsCount = ambassadors.length;
    const totalScore = ambassadors.reduce((sum, amb) => sum + amb.score, 0);
    const averageScore = Math.round(totalScore / totalAmbassadorsCount);
    const highestScore = Math.max(...ambassadors.map(amb => amb.score));
    
    // Regional distribution
    const regions = {};
    ambassadors.forEach(amb => {
        regions[amb.region] = (regions[amb.region] || 0) + 1;
    });
    
    // Top 5 performers
    const topPerformers = ambassadors.slice(0, 5);
    
    // Create stats HTML
    let statsHTML = '';
    
    // Basic stats cards
    statsHTML += `
        <div class="stat-card">
            <h3 class="text-lg font-semibold mb-2">Total Ambassadors</h3>
            <div class="stat-value">${totalAmbassadorsCount}</div>
        </div>
        
        <div class="stat-card">
            <h3 class="text-lg font-semibold mb-2">Average Score</h3>
            <div class="stat-value">${averageScore}</div>
        </div>
        
        <div class="stat-card">
            <h3 class="text-lg font-semibold mb-2">Highest Score</h3>
            <div class="stat-value">${highestScore.toLocaleString()}</div>
        </div>
    `;
    
    // Regional distribution card
    let regionsHTML = '';
    Object.entries(regions).forEach(([region, count]) => {
        const percentage = ((count / totalAmbassadorsCount) * 100).toFixed(1);
        regionsHTML += `
            <div class="flex justify-between items-center mb-2">
                <span class="text-sm">${region}</span>
                <div class="flex items-center">
                    <div class="w-24 bg-gray-700 rounded-full h-2 mr-2">
                        <div class="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" 
                             style="width: ${percentage}%"></div>
                    </div>
                    <span class="text-xs font-medium">${count} (${percentage}%)</span>
                </div>
            </div>
        `;
    });
    
    statsHTML += `
        <div class="stat-card md:col-span-2 lg:col-span-1">
            <h3 class="text-lg font-semibold mb-4">Regional Distribution</h3>
            <div class="space-y-3">
                ${regionsHTML}
            </div>
        </div>
    `;
    
    // Top performers card
    let topPerformersHTML = '';
    topPerformers.forEach((ambassador, index) => {
        const trophy = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index];
        topPerformersHTML += `
            <div class="flex justify-between items-center py-2 border-b border-gray-700 last:border-0">
                <div class="flex items-center">
                    <span class="text-lg mr-2">${trophy}</span>
                    <span class="font-medium">${ambassador.name}</span>
                </div>
                <span class="font-mono font-bold">${ambassador.score.toLocaleString()}</span>
            </div>
        `;
    });
    
    statsHTML += `
        <div class="stat-card md:col-span-2 lg:col-span-2">
            <h3 class="text-lg font-semibold mb-4">Top 5 Performers</h3>
            <div class="space-y-1">
                ${topPerformersHTML}
            </div>
        </div>
    `;
    
    statsContainer.innerHTML = statsHTML;
}

/**
 * Handles printing the leaderboard
 */
function handlePrint() {
    // Ensure we're on the leaderboard page
    switchPage('leaderboard');
    
    // Wait a moment for the page to switch, then print
    setTimeout(() => {
        window.print();
    }, 100);
}

// Make functions available globally for inline event handlers
window.startEdit = startEdit;
window.cancelEdit = cancelEdit;
window.saveScore = saveScore;
window.showDeleteModal = showDeleteModal;