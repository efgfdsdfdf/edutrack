/**
 * LIT Components: Renders the premium UI pieces dynamically
 */

function addHeatmapSegment(event) {
    const track = document.getElementById('heatmapTrack');
    if (!track) return;
    
    // Convert time to percentage (mocking a 60 min max for visual)
    const maxTime = 60 * 60; 
    const percent = Math.min((event.time / maxTime) * 100, 100);
    
    const segment = document.createElement('div');
    segment.className = 'heatmap-segment fade-in';
    segment.style.position = 'absolute';
    segment.style.left = `${percent}%`;
    segment.style.width = '4px';
    segment.style.backgroundColor = getBadgeColor(event.type);
    
    // Tooltip
    segment.title = `${formatTime(event.time)} - ${event.type}\n${event.note}`;
    
    track.appendChild(segment);
}

function getBadgeColor(type) {
    const colors = {
        'critical': '#ff3b3b',
        'explanation': '#00ff9d',
        'example': '#3b82f6',
        'definition': '#f59e0b',
        'formula': '#ef4444',
        'repeated': '#a855f7',
        'confusion': '#ff00ff',
        'hint': '#eab308'
    };
    return colors[type] || '#fff';
}

function addLiveFeedItem(event) {
    const feed = document.getElementById('liveFeed');
    if (!feed) return;
    
    const item = document.createElement('div');
    item.className = 'lit-panel fade-in';
    item.style.padding = '12px';
    item.style.marginBottom = '10px';
    
    const iconMap = {
        'critical': '⭐',
        'explanation': '🟢',
        'example': '🔵',
        'definition': '🟠',
        'formula': '🔴',
        'repeated': '🟣',
        'confusion': '⚠',
        'hint': '⚡'
    };
    
    item.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span class="badge ${event.type}">
                ${iconMap[event.type] || '✨'} ${event.type.toUpperCase()}
            </span>
            <span style="color:var(--lit-muted); font-size:0.8rem;">${formatTime(event.time)}</span>
        </div>
        <div style="font-size:0.9rem; line-height:1.4;">
            ${event.note}
        </div>
    `;
    
    feed.prepend(item);
}

function showPostLectureAnalysis() {
    // Reveal post-lecture panels
    const postPanels = document.getElementById('postLectureAnalysis');
    if (postPanels) postPanels.style.display = 'grid';
    
    // Render DNA Canvas
    renderDNACanvas();
    
    // Render Concept Graph
    renderConceptGraph();
}

function renderDNACanvas() {
    const canvas = document.getElementById('dnaCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Create an abstract, animated visual fingerprint
    ctx.clearRect(0,0, canvas.width, canvas.height);
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "rgba(98, 72, 230, 0.5)");
    gradient.addColorStop(1, "rgba(255, 59, 59, 0.5)");
    
    ctx.beginPath();
    for(let i=0; i<Math.PI*2; i+=0.1) {
        const r = 50 + Math.random() * 20;
        const x = canvas.width/2 + Math.cos(i) * r;
        const y = canvas.height/2 + Math.sin(i) * r;
        if(i===0) ctx.moveTo(x,y);
        else ctx.lineTo(x,y);
    }
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
}

function renderConceptGraph() {
    const container = document.getElementById('conceptGraph');
    if (!container) return;
    
    const concepts = ['Sorting', 'Binary Search', 'Trees', 'AVL Trees', 'Graphs'];
    
    let html = '';
    concepts.forEach((c, index) => {
        html += `<div class="graph-node"><i class="fas fa-brain" style="color:var(--lit-accent)"></i> ${c}</div>`;
        if (index < concepts.length - 1) {
            html += `<i class="fas fa-arrow-right graph-arrow"></i>`;
        }
    });
    
    container.innerHTML = html;
}
