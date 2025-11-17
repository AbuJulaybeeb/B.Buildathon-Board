// firebase-config.js
/**
 * Firebase Configuration and Database Setup
 * Replace the placeholder values with your actual Firebase configuration
 */
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Firebase configuration object - REPLACE WITH YOUR ACTUAL CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyB-mFZzq_s3ht4sTFnou_IekVK7KnJE4QU",
    authDomain: "",
    databaseURL: "https://buildathon-leaderboard-default-rtdb.firebaseio.com",
    projectId: "buildathon-leaderboard",
    storageBucket: "buildathon-leaderboard.firebasestorage.appspot.com",
    messagingSenderId: "976413070924",
    appId: "1:976413070924:web:7770c2f9055b00e15c46e9",
    measurementId: "G-ZLJJZMPMS2",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Get database reference
const database = firebase.database();

/**
 * CRUD Operations for Ambassadors
 */

/**
 * Adds a new ambassador to the Firebase database
 * @param {Object} ambassadorData - The ambassador information
 * @param {string} ambassadorData.name - Ambassador's name
 * @param {string} ambassadorData.region - Ambassador's region
 * @param {number} ambassadorData.score - Ambassador's initial score
 * @returns {Promise} Firebase push promise
 */
function addAmbassador(ambassadorData) {
    const newAmbassadorRef = database.ref('ambassadors').push();
    return newAmbassadorRef.set({
        id: newAmbassadorRef.key,
        name: ambassadorData.name,
        region: ambassadorData.region,
        score: parseInt(ambassadorData.score),
        createdAt: new Date().toISOString()
    });
}

/**
 * Gets all ambassadors with real-time updates
 * @param {Function} callback - Function to call when data changes
 * @returns {Function} Unsubscribe function to stop listening
 */
function listenToAmbassadors(callback) {
    const ambassadorsRef = database.ref('ambassadors');
    
    const onValueChange = ambassadorsRef.on('value', (snapshot) => {
        const data = snapshot.val();
        const ambassadorsArray = data ? Object.values(data) : [];
        // Sort by score (highest first)
        ambassadorsArray.sort((a, b) => b.score - a.score);
        callback(ambassadorsArray);
    });
    
    // Return unsubscribe function
    return () => ambassadorsRef.off('value', onValueChange);
}

/**
 * Updates an ambassador's score
 * @param {string} ambassadorId - The ID of the ambassador to update
 * @param {number} newScore - The new score value
 * @returns {Promise} Firebase update promise
 */
function updateAmbassadorScore(ambassadorId, newScore) {
    return database.ref(`ambassadors/${ambassadorId}`).update({
        score: parseInt(newScore)
    });
}

/**
 * Deletes an ambassador from the database
 * @param {string} ambassadorId - The ID of the ambassador to delete
 * @returns {Promise} Firebase remove promise
 */
function deleteAmbassador(ambassadorId) {
    return database.ref(`ambassadors/${ambassadorId}`).remove();
}

/**
 * Gets a single ambassador by ID
 * @param {string} ambassadorId - The ID of the ambassador to retrieve
 * @returns {Promise} Promise that resolves with the ambassador data
 */
function getAmbassadorById(ambassadorId) {
    return database.ref(`ambassadors/${ambassadorId}`).once('value')
        .then(snapshot => snapshot.val());
}

// Connection state monitoring
database.ref('.info/connected').on('value', (snapshot) => {
    if (snapshot.val() === true) {
        console.log("Connected to Firebase");
    } else {
        console.log("Disconnected from Firebase");
    }
});