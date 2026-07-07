/**
 * LIT Core: State management, AI Simulation, and Recording Logic
 */

const LITState = {
    isRecording: false,
    timer: 0,
    interval: null,
    events: [],
    dnaStats: {
        difficulty: 0,
        density: 0,
        math: 0
    },
    audioContext: null,
    analyser: null,
    waveformId: null
};

// AI Mock Generators
const AI = {
    generateConfidenceScore() {
        const types = ['critical', 'explanation', 'example', 'definition', 'formula', 'confusion', 'hint'];
        const type = types[Math.floor(Math.random() * types.length)];
        return type;
    },
    
    generateContextNote() {
        const contexts = [
            "This algorithm becomes important later when studying Trees and Graphs.",
            "You will likely see a variation of this on the midterm.",
            "This concept builds directly on last week's lecture on Data Structures.",
            "Warning: Many students confuse this with QuickSort.",
            "83% chance this topic appears in exams."
        ];
        return contexts[Math.floor(Math.random() * contexts.length)];
    },
    
    predictDecay() {
        return Math.floor(Math.random() * 5) + 2; // 2-6 days
    }
};

// Core Controls
function toggleLITRecording() {
    const btn = document.getElementById('recordBtn');
    
    if (!LITState.isRecording) {
        // Start
        LITState.isRecording = true;
        btn.classList.add('recording');
        btn.innerHTML = '<i class="fas fa-stop"></i>';
        document.getElementById('recordingStatus').innerText = 'LIT Engine Active...';
        
        LITState.interval = setInterval(() => {
            LITState.timer++;
            document.getElementById('timer').innerText = formatTime(LITState.timer);
            
            // Simulate AI processing random events every 5-10 seconds
            if (LITState.timer % (Math.floor(Math.random() * 5) + 3) === 0) {
                simulateAIEvent();
            }
        }, 1000);
        
        startMockWaveform();
        
    } else {
        // Stop
        LITState.isRecording = false;
        btn.classList.remove('recording');
        btn.innerHTML = '<i class="fas fa-microphone"></i>';
        document.getElementById('recordingStatus').innerText = 'Ready to Analyze';
        clearInterval(LITState.interval);
        cancelAnimationFrame(LITState.waveformId);
        
        // Show post-lecture modal or panels
        showPostLectureAnalysis();
    }
}

function simulateAIEvent() {
    const eventType = AI.generateConfidenceScore();
    const time = LITState.timer;
    
    const event = { time, type: eventType, note: AI.generateContextNote() };
    LITState.events.push(event);
    
    // Update Heatmap UI
    addHeatmapSegment(event);
    
    // Update live feed
    addLiveFeedItem(event);
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// Waveform Animation
function startMockWaveform() {
    const canvas = document.getElementById('waveformCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    function draw() {
        if (!LITState.isRecording) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        
        for (let i = 0; i < canvas.width; i += 5) {
            const amplitude = Math.random() * 30 + 10;
            const y = canvas.height / 2 + Math.sin(i * 0.05 + LITState.timer) * amplitude;
            ctx.lineTo(i, y);
        }
        
        ctx.strokeStyle = 'rgba(98, 72, 230, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        LITState.waveformId = requestAnimationFrame(draw);
    }
    
    draw();
}
