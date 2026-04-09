// audio.js - Web Audio API Version (Guaranteed Pitch Shift)

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const baseUrl = "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/recorder-mp3/";

// Note Map (Alto Samples)
const sampleMap = {
    "C4": "C4.mp3",
    "E4": "E4.mp3",
    "A4": "A4.mp3",
    "C5": "C5.mp3"
};

const audioBuffers = {};

async function loadSample(note) {
    if (audioBuffers[note]) return audioBuffers[note];

    try {
        const response = await fetch(baseUrl + sampleMap[note]);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        audioBuffers[note] = audioBuffer;
        return audioBuffer;
    } catch (e) {
        console.error("Sample Load Error:", e);
        return null;
    }
}

function initAudio() {
    // Preload all
    Object.keys(sampleMap).forEach(loadSample);

    // Resume context on interaction (standard browser policy)
    if (audioCtx.state === 'suspended') {
        const resume = () => {
            audioCtx.resume();
            document.removeEventListener('click', resume);
            document.removeEventListener('keydown', resume);
        };
        document.addEventListener('click', resume);
        document.addEventListener('keydown', resume);
    }
}

// Helper to get nearest sample and rate logic
function getSampleInfo(targetNote) {
    const noteToMidi = (note) => {
        const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        // Handle flats
        const n = note.replace("Db", "C#").replace("Eb", "D#").replace("Gb", "F#").replace("Ab", "G#").replace("Bb", "A#");
        const octave = parseInt(n.slice(-1));
        const name = n.slice(0, -1);
        const idx = notes.indexOf(name);
        return (octave + 1) * 12 + idx;
    };

    const targetMidi = noteToMidi(targetNote);

    // Find nearest
    const samples = Object.keys(sampleMap);
    let nearest = samples[0];
    let minDiff = Infinity;

    samples.forEach(s => {
        const sMidi = noteToMidi(s);
        const diff = Math.abs(targetMidi - sMidi);
        if (diff < minDiff) {
            minDiff = diff;
            nearest = s;
        }
    });

    const sampleMidi = noteToMidi(nearest);
    const semitoneDiff = targetMidi - sampleMidi;
    // Rate = 2 ^ (semitones / 12)
    const rate = Math.pow(2, semitoneDiff / 12);

    return { note: nearest, rate: rate };
}

async function playNote(noteKey) {
    if (audioCtx.state === 'suspended') await audioCtx.resume();

    // Parse logic
    let targetNote = noteKey;
    let extraRate = 1.0;

    if (typeof appState !== 'undefined' && appState.instrument === 'soprano') {
        // "shift pitch one octave higher"
        extraRate = 2.0;
    }

    const info = getSampleInfo(targetNote);
    const finalRate = info.rate * extraRate;

    // Get Buffer
    let buffer = audioBuffers[info.note];
    if (!buffer) {
        buffer = await loadSample(info.note);
    }
    if (!buffer) return;

    // Play
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = finalRate;
    source.connect(audioCtx.destination);
    source.start(0);
}

// Init immediately
initAudio();
