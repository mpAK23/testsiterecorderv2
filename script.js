
let appState = {
    instrument: 'soprano', // 'soprano' | 'alto' | 'bass'
    mode: 'explore',       // 'explore' | 'quiz'
    difficulty: 1,
    selectedNote: null,
    quizTarget: null,
    quizTimeout: null,
    score: 0
};

const LEVELS = {
    soprano: {
        1: ["B4", "A4", "G4", "C5", "D5"],
        2: ["F4", "E4", "D4", "C4", "A#4", "F#4"]
    },
    alto: {
        1: ["E5", "D5", "C5", "F5", "G5"],
        2: ["A#4", "A4", "G4", "F4", "D#5", "B4"]
    },
    bass: {
        1: ["E3", "D3", "C3", "F3", "G3"],
        2: ["A#2", "A2", "G2", "F2", "D#3", "B2"]
    }
};

// DOM Elements
const staffContainer = document.getElementById('staff-container');
const recorderWrapper = document.querySelector('.recorder-wrapper');
const noteBank = document.getElementById('note-bank');
const msgBox = document.getElementById('quiz-message');
const btnSoprano = document.getElementById('btn-soprano');
const btnAlto = document.getElementById('btn-alto');
const btnBass = document.getElementById('btn-bass');
const btnExplore = document.getElementById('btn-explore');
const btnQuiz = document.getElementById('btn-quiz');
const btnLvl1 = document.getElementById('btn-lvl-1');
const btnLvl2 = document.getElementById('btn-lvl-2');
const btnLvl3 = document.getElementById('btn-lvl-3');

// Initialization
function init() {
    setupListeners();
    renderNoteBank();
    renderStaff();
    if (appState.mode === 'explore') {
        selectNote(Object.keys(NOTE_DATA[appState.instrument])[0]);
    }
}

function setupListeners() {
    if (btnSoprano) btnSoprano.onclick = () => setInstrument('soprano');
    if (btnAlto) btnAlto.onclick = () => setInstrument('alto');
    if (btnBass) btnBass.onclick = () => setInstrument('bass');
    if (btnExplore) btnExplore.onclick = () => setMode('explore');
    if (btnQuiz) btnQuiz.onclick = () => setMode('quiz');
    if (btnLvl1) btnLvl1.onclick = () => setDifficulty(1);
    if (btnLvl2) btnLvl2.onclick = () => setDifficulty(2);
    if (btnLvl3) btnLvl3.onclick = () => setDifficulty(3);
}

function setDifficulty(lvl) {
    if (appState.difficulty === lvl) return;
    appState.difficulty = lvl;
    if (btnLvl1) btnLvl1.classList.toggle('active', lvl === 1);
    if (btnLvl2) btnLvl2.classList.toggle('active', lvl === 2);
    if (btnLvl3) btnLvl3.classList.toggle('active', lvl === 3);
    if (appState.mode === 'quiz') startQuiz();
}

function setInstrument(inst) {
    if (appState.instrument === inst) return;
    appState.instrument = inst;
    if (btnSoprano) btnSoprano.classList.toggle('active', inst === 'soprano');
    if (btnAlto) btnAlto.classList.toggle('active', inst === 'alto');
    if (btnBass) btnBass.classList.toggle('active', inst === 'bass');
    renderNoteBank();
    renderStaff(); // Update clef
    if (appState.mode === 'explore') {
        selectNote(Object.keys(NOTE_DATA[inst])[0]);
    } else {
        startQuiz();
    }
}

function setMode(mode) {
    if (appState.mode === mode) return;
    appState.mode = mode;
    if (btnExplore) btnExplore.classList.toggle('active', mode === 'explore');
    if (btnQuiz) btnQuiz.classList.toggle('active', mode === 'quiz');

    const advToggle = document.getElementById('difficulty-selector-container');
    const quizHint = document.getElementById('quiz-hint');
    
    if (mode === 'quiz') {
        if (advToggle) advToggle.classList.remove('hidden');
        if (quizHint) quizHint.classList.remove('hidden');
        startQuiz();
    } else {
        if (advToggle) advToggle.classList.add('hidden');
        if (quizHint) quizHint.classList.add('hidden');
        stopQuiz();
    }
}

function renderNoteBank() {
    noteBank.innerHTML = '';
    const notes = NOTE_DATA[appState.instrument];
    let noteKeys = Object.keys(notes);

    // Sort logic
    noteKeys.sort((a, b) => {
        const offMap = appState.instrument === 'bass' ? BASS_OFFSETS : NOTE_OFFSETS;
        const offA = offMap[a] || 0;
        const offB = offMap[b] || 0;
        if (offA !== offB) return offA - offB;
        return a.length - b.length;
    });

    // Separation Logic
    let splitNoteIndex = -1;
    if (appState.instrument === 'soprano') {
        // Split after D5. Find index of D5.
        // If sorting works correctly, we just find "D5".
        splitNoteIndex = noteKeys.indexOf("D5");
    } else {
        // Alto: Split after G#5.
        splitNoteIndex = noteKeys.indexOf("G#5");
    }

    const row1Div = document.createElement('div');
    row1Div.className = 'note-row';
    const row2Div = document.createElement('div');
    row2Div.className = 'note-row';

    noteKeys.forEach((noteKey, index) => {
        const btn = document.createElement('button');
        btn.className = 'note-btn';

        // Enharmonic Logic: Show Sharp/Flat e.g. F#/Gb4
        let labelHTML = noteKey.replace(/(\d+)/, '<sub>$1</sub>'); // Default
        if (noteKey.includes('#')) {
            const match = noteKey.match(/^([A-G]#)(\d+)$/);
            if (match) {
                const noteName = match[1];
                const octave = match[2];
                const map = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };
                if (map[noteName]) {
                    // "only one number for the octave" -> F#/Gb4
                    labelHTML = `${noteName}/${map[noteName]}<sub>${octave}</sub>`;
                }
            }
        }

        btn.innerHTML = labelHTML;
        btn.onclick = () => handleNoteInput(noteKey);
        btn.dataset.note = noteKey;

        if (splitNoteIndex !== -1 && index <= splitNoteIndex) {
            row1Div.appendChild(btn);
        } else {
            row2Div.appendChild(btn);
        }
    });

    noteBank.appendChild(row1Div);
    // Add a small divider or just let block display handle it
    noteBank.appendChild(row2Div);
}

function handleNoteInput(noteKey) {
    if (appState.mode === 'quiz') return; // Flashcard mode ignores input
    
    // Audio Feedback
    if (typeof playNote === 'function') {
        playNote(noteKey);
    }
    selectNote(noteKey);
}

function selectNote(noteKey) {
    appState.selectedNote = noteKey;
    document.querySelectorAll('.note-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.note-btn[data-note="${noteKey}"]`);
    if (btn) btn.classList.add('active');
    updateStaff(noteKey);
    updateRecorder(noteKey);
}

// ----------------------
// Recorder Rendering
// ----------------------
function createRecorderElement(index) {
    const wrapper = document.createElement('div');
    wrapper.className = 'recorder-visual';
    wrapper.id = `recorder-visual-${index}`;

    // Generated Cream Recorder Structure
    let html = `
        <div class="recorder-body">
            <div class="mouthpiece-area"></div>
            <div class="mouthpiece-window"></div>
            <div class="joint top"></div>
            <div class="joint middle"></div>
            <div class="joint foot"></div>
            
            <!-- Holes -->
            <!-- Thumb (0) -->
            <div class="hole" id="rec-${index}-hole-0"><div class="finger-dot"></div> <span class="thumb-label">Thumb</span></div>
            
            <!-- Standard Holes 1-5 -->
            <div class="hole" id="rec-${index}-hole-1"><div class="finger-dot"></div></div>
            <div class="hole" id="rec-${index}-hole-2"><div class="finger-dot"></div></div>
            <div class="hole" id="rec-${index}-hole-3"><div class="finger-dot"></div></div>
            <div class="hole" id="rec-${index}-hole-4"><div class="finger-dot"></div></div>
            <div class="hole" id="rec-${index}-hole-5"><div class="finger-dot"></div></div>
            
            <!-- Double Holes 6 & 7 -->
            <div class="hole-pair" id="rec-${index}-hole-6">
                <div class="hole-sub left"><div class="finger-dot"></div></div>
                <div class="hole-sub right"><div class="finger-dot"></div></div>
            </div>
            <div class="hole-pair" id="rec-${index}-hole-7">
                <div class="hole-sub left"><div class="finger-dot"></div></div>
                <div class="hole-sub right"><div class="finger-dot"></div></div>
            </div>
            
            <div class="bell">
                <div class="bell-cover" id="rec-${index}-bell-cover"></div>
            </div>
        </div>
    `;
    wrapper.innerHTML = html;
    return wrapper;
}

function updateRecorder(noteKey) {
    const container = document.querySelector('.recorder-wrapper');
    if (!container) return;
    container.innerHTML = '';

    if (!noteKey) return;
    const data = NOTE_DATA[appState.instrument][noteKey];
    if (!data) return;

    data.forEach((fingering, idx) => {
        const el = createRecorderElement(idx);
        container.appendChild(el);

        if (data.length > 1) {
            const label = document.createElement('div');
            label.className = 'alt-label';
            label.innerText = idx === 0 ? "Standard" : "Alternate";
            el.appendChild(label);
        }

        fingering.forEach((state, holeIdx) => {
            // Index 8: Bell Cover
            if (holeIdx === 8) {
                const cover = el.querySelector(`#rec-${idx}-bell-cover`);
                if (cover && state === 1) {
                    cover.classList.add('visible');
                    // Add label "Knee" or "Bell"?
                    // Could add tool tip if needed, but visual enough.
                }
            }
            // Handle Thumb & 1-5 (Single Holes)
            else if (holeIdx <= 5) {
                const hole = el.querySelector(`#rec-${idx}-hole-${holeIdx}`);
                if (!hole) return;
                hole.className = 'hole'; // reset
                if (state === 1) {
                    hole.classList.add('covered');
                } else if (state === 0.5) {
                    hole.className = 'hole half'; // Pinched thumb
                }
            }
            // Handle 6 & 7 (Double Holes)
            else {
                const pair = el.querySelector(`#rec-${idx}-hole-${holeIdx}`);
                if (!pair) return;
                const subs = pair.querySelectorAll('.hole-sub');

                // State 1: Both Covered
                if (state === 1) {
                    subs.forEach(s => s.classList.add('covered'));
                }
                // State 0.5: One Covered
                // User requirement: "when it's only one hole, it's the smaller one to the left..."
                // So cover the Left one (index 0).
                else if (state === 0.5) {
                    subs[0].classList.add('covered'); // Left Covered
                }
                // State 0: Open
            }
        });
    });
}

// ----------------------
// Staff Rendering
// ----------------------
function renderStaff() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 200 150");
    svg.classList.add("staff-svg");

    const startY = 50;
    const spacing = 10;
    for (let i = 0; i < 5; i++) {
        const line = document.createElementNS(ns, "line");
        line.setAttribute("x1", "10");
        line.setAttribute("y1", startY + (i * spacing));
        line.setAttribute("x2", "190");
        line.setAttribute("y2", startY + (i * spacing));
        line.setAttribute("stroke", "#aaa");
        line.setAttribute("stroke-width", "2");
        svg.appendChild(line);
    }

    const clefTxt = document.createElementNS(ns, "text");
    clefTxt.setAttribute("x", "15");
    clefTxt.setAttribute("fill", "#ddd");
    
    if (appState.instrument === 'bass') {
        clefTxt.setAttribute("y", "72"); // Centered on F-line roughly
        clefTxt.setAttribute("font-size", "45");
        clefTxt.textContent = "𝄢";
    } else {
        clefTxt.setAttribute("y", "85");
        clefTxt.setAttribute("font-size", "40");
        clefTxt.textContent = "𝄞";
    }
    
    svg.appendChild(clefTxt);

    const noteGroup = document.createElementNS(ns, "g");
    noteGroup.id = "staff-note-group";
    svg.appendChild(noteGroup);

    staffContainer.innerHTML = '';
    staffContainer.appendChild(svg);
}

function updateStaff(noteKey) {
    const group = document.getElementById("staff-note-group");
    if (!group) return;
    group.innerHTML = '';

    const offMap = appState.instrument === 'bass' ? BASS_OFFSETS : NOTE_OFFSETS;
    const offset = offMap[noteKey];
    if (offset === undefined) return;

    const ns = "http://www.w3.org/2000/svg";
    const centerY = 70;
    const stepSize = 5;

    // Helper to draw a single note
    function drawNote(cx, noteOffset, accidental) {
        const cy = centerY - (noteOffset * stepSize);

        // Ledgers
        // Lines are at 50, 60, 70, 80, 90.
        // Ledgers needed if cy <= 40 (High) or cy >= 100 (Low C4 is 100)

        // High Ledgers
        if (cy <= 40) {
            let curr = 40;
            while (curr >= cy) {
                const line = document.createElementNS(ns, "line");
                line.setAttribute("x1", cx - 20); line.setAttribute("x2", cx + 20);
                line.setAttribute("y1", curr); line.setAttribute("y2", curr);
                line.setAttribute("stroke", "#aaa"); line.setAttribute("stroke-width", "2");
                group.appendChild(line);
                curr -= 10;
            }
        }
        // Low Ledgers
        if (cy >= 100) {
            let curr = 100;
            while (curr <= cy) {
                const line = document.createElementNS(ns, "line");
                line.setAttribute("x1", cx - 20); line.setAttribute("x2", cx + 20);
                line.setAttribute("y1", curr); line.setAttribute("y2", curr);
                line.setAttribute("stroke", "#aaa"); line.setAttribute("stroke-width", "2");
                group.appendChild(line);
                curr += 10;
            }
        }

        // Note Head
        const noteHead = document.createElementNS(ns, "ellipse");
        noteHead.setAttribute("cx", cx);
        noteHead.setAttribute("cy", cy);
        noteHead.setAttribute("rx", "8");
        noteHead.setAttribute("ry", "6");
        noteHead.setAttribute("fill", "#fff");
        group.appendChild(noteHead);

        // Accidental
        if (accidental) {
            const acc = document.createElementNS(ns, "text");
            // Adjust position: Sharp allows a bit more left, Flat matches
            acc.setAttribute("x", cx - 25);
            acc.setAttribute("y", cy + 5);
            acc.setAttribute("fill", "#fff");
            acc.setAttribute("font-size", "22"); // Slightly larger for clarity
            acc.textContent = accidental;
            group.appendChild(acc);
        }
    }

    if (noteKey.includes("#")) {
        // Draw Both: Sharp and Enahrmonic Flat
        // Sharp: Original Offset
        drawNote(85, offset, "♯");

        // Flat: Offset + 1 (e.g. F# -> Gb) 
        drawNote(135, offset + 1, "♭");
    } else {
        // Natural
        drawNote(100, offset, null);
    }
}

function startQuiz() {
    msgBox.classList.remove('hidden');
    clearTimeout(appState.quizTimeout);
    nextQuizQuestion();
}

function stopQuiz() {
    msgBox.classList.add('hidden');
    appState.quizTarget = null;
    clearTimeout(appState.quizTimeout);
    clearVisuals();
    document.querySelectorAll('.note-btn').forEach(b => b.classList.remove('active'));
}

function nextQuizQuestion() {
    const notes = Object.keys(NOTE_DATA[appState.instrument]);
    const lvl1 = LEVELS[appState.instrument][1];
    const lvl2 = LEVELS[appState.instrument][2];
    
    let pool = [];
    if (appState.difficulty === 1) {
        pool = lvl1;
    } else if (appState.difficulty === 2) {
        pool = [...lvl1, ...lvl2]; // additive
    } else {
        pool = notes; // Level 3 is all notes
    }

    // Safety fallback
    if (!pool || pool.length === 0) pool = notes;

    const rnd = pool[Math.floor(Math.random() * pool.length)];
    appState.quizTarget = rnd;
    
    msgBox.textContent = "Play this note...";
    msgBox.className = "quiz-feedback";
    
    clearVisuals();
    document.querySelectorAll('.note-btn').forEach(b => b.classList.remove('active'));
    
    // Draw note on staff without fingering
    updateStaff(rnd);

    // Phase 1: 4 second pause
    appState.quizTimeout = setTimeout(() => revealQuizAnswer(rnd), 4000);
}

function revealQuizAnswer(noteKey) {
    if (appState.mode !== 'quiz') return;

    msgBox.textContent = "Answer:";
    msgBox.classList.add('correct');
    
    updateRecorder(noteKey);
    
    const btn = document.querySelector(`.note-btn[data-note="${noteKey}"]`);
    if (btn) btn.classList.add('active');

    if (typeof playNote === 'function') {
        playNote(noteKey);
    }
    
    // Phase 2: Show answer for 5 seconds
    appState.quizTimeout = setTimeout(transitionQuizQuestion, 5000);
}

function transitionQuizQuestion() {
    if (appState.mode !== 'quiz') return;

    msgBox.textContent = "Get ready...";
    msgBox.className = "quiz-feedback";
    
    clearVisuals();
    document.querySelectorAll('.note-btn').forEach(b => b.classList.remove('active'));
    
    // Clear the staff note so the screen is completely cleared
    const group = document.getElementById("staff-note-group");
    if (group) group.innerHTML = '';

    // Phase 3: 4 second pause before the next note
    appState.quizTimeout = setTimeout(nextQuizQuestion, 4000);
}

function clearVisuals() {
    if (appState.mode === 'explore') {
        const group = document.getElementById("staff-note-group");
        if (group) group.innerHTML = '';
    }
    const container = document.querySelector('.recorder-wrapper');
    if (container) container.innerHTML = '';
}

init();
