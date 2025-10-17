let highlightIndex = 0;
let score = 0;
let timerDuration = 5; // New variable for initial timer duration
let currentTimer = timerDuration; // The actual countdown value
let tuto = true;
let restartTimer = false;
let gameEnd = false;
let isResetting = false;
let timerRunning = false; // Flag to indicate if the timer loop is active


const correctSoundsList = [
    'assets/sfx/correct1.mp3',
    'assets/sfx/correct2.mp3',
    'assets/sfx/correct3.mp3',
    'assets/sfx/correct4.mp3',
    'assets/sfx/correct5.mp3',
    // 'assets/sfx/correct6.mp3',
    'assets/sfx/correct7.mp3',
    'assets/sfx/correct8.mp3',
    'assets/sfx/correct9.mp3',
];

const wrongSoundsList = [
    'assets/sfx/wrong1.mp3',
    'assets/sfx/wrong2.mp3',
    'assets/sfx/wrong3.mp3',
    // 'assets/sfx/wrong4.mp3',
    // 'assets/sfx/wrong5.mp3',
    'assets/sfx/wrong6.mp3',
    'assets/sfx/wrong7.mp3',
    'assets/sfx/wrong8.mp3',
];

function getRandomSoundPath(soundList) {
    const randomIndex = Math.floor(Math.random() * soundList.length);
    return soundList[randomIndex];
}


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function switchToPage(name) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        if (page.classList.contains(name)) {
            page.style.opacity = '1';
            page.style.pointerEvents = 'auto';
        } else {
            page.style.opacity = '0';
            page.style.pointerEvents = 'none';
        }
    });
}

switchToPage('main-menu');

function closeTuto() {
    const pages = document.querySelectorAll('.game-rule');
    pages.forEach(page => {
        page.style.opacity = '0';
        page.style.pointerEvents = 'none';
    });
    tuto = false;
    startTimer(); // Start the timer when tutorial closes
    setTimeout(() => {
        document.querySelector('input[name="answer"]').focus();
    }, 10);
}

function setRandomGlon(skipHighlight = false) {
    const randomGlon = glons[Math.floor(Math.random() * glons.length)];
    localStorage.setItem('currentGlon', JSON.stringify(randomGlon));
    const glonElement = document.getElementById('glon-section');

    glonElement.innerHTML = ''; // Clear existing content

    for (let i = 0; i < randomGlon["บทประพันธ์"].length; i++) {
        const line = document.createElement('p');
        line.textContent = randomGlon["บทประพันธ์"][i];

        if (i === 0) {
            line.style.textIndent = '2em';
        }
        glonElement.appendChild(line);
    }
    if (!skipHighlight) {
        // This is for initial load or when setRandomGlon is called without skipHighlight
        setTimeout(() => { highlight(); }, 100);
    }
}

function highlight() {
    // If a reset is in progress, only prevent other calls while resetting.
    // The final call after reset will proceed.
    if (isResetting && highlightIndex > 0) { // Allow the initial highlight after reset
        return;
    }

    const randomGlon = JSON.parse(localStorage.getItem('currentGlon'));
    document.querySelector('input[name="answer"]').value = '';
    document.querySelector('input[name="answer"]').disabled = false;
    setTimeout(() => {
        document.querySelector('input[name="answer"]').focus();
    }, 10);

    // If highlightIndex has gone past the available words to highlight, reset the glon
    if (highlightIndex >= randomGlon["highlight"].length) {
        isResetting = true; // Set the flag immediately
        transitionPage();
        // Add a delay before loading the new glon
        setTimeout(() => { // This outer setTimeout adds the delay before new glon appears
            highlightIndex = 0;
            setRandomGlon(true); // Load a new glon without immediately calling highlight

            // Reset isResetting to false *before* calling highlight for the new glon
            isResetting = false;
            highlight();        // Then call highlight to show the first word of the new glon
        }, 250); // 500ms delay before loading and highlighting the new glon
        return;
    }

    const glonElement = document.getElementById('glon-section');
    const paragraphs = glonElement.querySelectorAll('p');

    // First, remove any existing highlights from all paragraphs
    paragraphs.forEach(p => {
        p.innerHTML = p.innerHTML.replace(/<mark class="highlight">(.*?)<\/mark>/gi, '$1');
    });

    // Get the word to highlight based on the current highlightIndex
    const textToHighlight = randomGlon["highlight"][highlightIndex];
    
    // Escape special characters for regex
    const escapedTextToHighlight = textToHighlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTextToHighlight})`, 'g'); // Capture group for replacement

    let foundHighlight = false;
    // Iterate through paragraphs to find and highlight the word
    for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        const originalText = p.textContent; // Use textContent to avoid issues with existing HTML

        // Check if the word exists in this paragraph
        if (regex.test(originalText)) {
            p.innerHTML = originalText.replace(regex, '<mark class="highlight">$1</mark>');
            foundHighlight = true;
            break; // Stop after highlighting the first match for the current word
        }
    }

    if (!foundHighlight) {
        console.warn(`Text to highlight "${textToHighlight}" for index ${highlightIndex} not found in current glon.`);
    }

    highlightIndex++;
    restartTimer = true; // Signal the timer to reset
}

async function playSound(soundPath) {
    try {
        // Create a *new* Audio object each time to allow for simultaneous playback
        // if answers come in very quickly, and to ensure preload/playback from scratch.
        const audioElement = new Audio(soundPath);
        audioElement.preload = 'auto'; // Preload each new audio element
        // audioElement.volume = 0.5; // Optionally set volume for each new element

        await audioElement.play();

        // Optional: Release resources after playback if needed, but modern browsers
        // handle this fairly well. For very short sounds, it's often not critical.
        audioElement.onended = () => {
            audioElement.remove(); // Clean up the element after it finishes playing
        };

    } catch (error) {
        console.warn('Audio playback prevented or failed:', error);
    }
}

function checkAnswer() {
    const randomGlon = JSON.parse(localStorage.getItem('currentGlon'));
    const userInput = document.getElementById('answer-input').value.trim();

    if (userInput === randomGlon["answers"][highlightIndex - 1]) {
        showResult('ถูกต้อง!', "#00a51bff");
        score++;
        document.getElementById('score').textContent = `คะแนน: ${score}`;
        
        // Play a random correct sound
        const soundPath = getRandomSoundPath(correctSoundsList);
        playSound(soundPath);
        
        highlight();
    } else {
        showResult('ผิด!', "#b30505ff");
        console.log(`Expected: ${randomGlon["answers"][highlightIndex - 1]}, but got: ${userInput}`);
        
        // Play a random wrong sound
        const soundPath = getRandomSoundPath(wrongSoundsList);
        playSound(soundPath);
    }
}


function showResult(text, color) {
    const resultElement = document.getElementById('result');
    resultElement.textContent = text;
    resultElement.style.color = color;
    resultElement.style.opacity = '1';
    resultElement.style.bottom = '11em';

    setTimeout(() => {
        resultElement.style.bottom = '10em';
    }, 100);

    setTimeout(() => {
        resultElement.style.opacity = '0';
    }, 1000);
}

async function startTimer() {
    const timerElement = document.getElementById('timer');
    timerElement.style.display = 'block';
    timerRunning = true; // Set flag when timer starts

    while (timerRunning && !gameEnd && !tuto) {
        if (restartTimer) {
            currentTimer = timerDuration; // Reset to full duration
            restartTimer = false;
        }

        timerElement.textContent = `เหลือเวลา ${currentTimer}s`;

        if (currentTimer <= 0) {
            timerRunning = false; // Stop the loop
            break; // Exit the loop immediately
        }

        await sleep(1000);
        currentTimer--;
    }

    if (gameEnd || tuto) { // If game ended or tutorial is active, just return
        return;
    }

    // If loop finished because currentTimer <= 0
    timerElement.style.display = 'none';
    switchToPage('end');
    document.getElementById('final-score').textContent = score;
    
    // Reset game state for next potential game
    transitionPage();
    score = 0;
    document.getElementById('score').textContent = `คะแนน: ${score}`;
    gameEnd = true;
    currentTimer = timerDuration; // Reset for next game
    timerRunning = false; // Ensure flag is false
    document.querySelector('input[name="answer"]').disabled = true;
}

let transitionToggle = true

function transitionPage() {
    if (transitionToggle) {
        transitionToggle = false;
        const transitionElement = document.getElementById('transition');
        transitionElement.style.left = '100%';
    } else {
        transitionToggle = true;
        const transitionElement = document.getElementById('transition');
        transitionElement.style.left = '-100%';
    }
}

transitionPage();
transitionPage();