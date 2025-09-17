// Mobile menu toggle
window.mobileMenuOpen = false;
function toggleMobileMenu() {
    window.mobileMenuOpen = !window.mobileMenuOpen;
    const menu = document.getElementById('mobile-menu');
    if (window.mobileMenuOpen) {
        menu.classList.add('open');
    } else {
        menu.classList.remove('open');
    }
}

// Animations on load
window.addEventListener('DOMContentLoaded', () => {
    // Background and photos are now always visible - no animations needed
});

// Radio Stream and Audio Visualizer
let radioAudioContext = null;
let radioAnalyzer = null;
let radioSource = null;
let radioAnimationId = null;
let radioIsPlaying = false;
let radioDebugLog = [];
let microphoneStream = null;
let microphoneSource = null;
let usingMicrophone = false;

function addRadioDebug(message, type = 'info') {
    // Simplified logging - console only
    console.log(`[RADIO] ${message}`);
}

function updateRadioTicker(text) {
    const ticker = document.getElementById('radio-ticker');
    if (ticker) {
        ticker.textContent = text;
    }
}

function showMicrophoneOption() {
    const radioContainer = document.getElementById('radio-container');
    const existingButton = document.getElementById('use-mic-button');

    if (!existingButton) {
        const micButton = document.createElement('button');
        micButton.id = 'use-mic-button';
        micButton.className = 'mt-2 px-3 py-1 bg-cyan-mist/20 border border-cyan-mist/50 text-cyan-mist text-xs font-mono rounded hover:bg-cyan-mist/30 transition-all';
        micButton.textContent = 'USE MIC FOR VISUALIZATION';
        micButton.onclick = enableMicrophoneCapture;

        const statusElement = document.getElementById('radio-status');
        statusElement.insertAdjacentElement('afterend', micButton);
    }
}

async function enableMicrophoneCapture() {
    if (usingMicrophone) return; // Already enabled

    try {
        addRadioDebug('Requesting microphone for visualization');

        // Request microphone permission
        microphoneStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });

        // Initialize audio context if needed
        if (!radioAudioContext) {
            radioAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (radioAudioContext.state === 'suspended') {
            await radioAudioContext.resume();
        }

        // Create analyzer
        if (!radioAnalyzer) {
            radioAnalyzer = radioAudioContext.createAnalyser();
            radioAnalyzer.fftSize = 256;
            radioAnalyzer.smoothingTimeConstant = 0.8;
        }

        // Create microphone source and connect to analyzer ONLY
        microphoneSource = radioAudioContext.createMediaStreamSource(microphoneStream);
        microphoneSource.connect(radioAnalyzer);

        usingMicrophone = true;
        addRadioDebug('Microphone visualization enabled');

        // Start visualization
        initVisualization();

    } catch (error) {
        addRadioDebug(`Microphone access failed: ${error.message}`);
    }
}

function initVisualization() {
    const canvas = document.getElementById('frequency-canvas');
    const canvasCtx = canvas.getContext('2d');

    // Set canvas size properly
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || 256;
    canvas.height = rect.height || 128;

    const bufferLength = radioAnalyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Animation function
    function drawFrequencyBars() {
        radioAnimationId = requestAnimationFrame(drawFrequencyBars);

        radioAnalyzer.getByteFrequencyData(dataArray);

        // Clear canvas
        canvasCtx.fillStyle = 'rgba(14, 14, 14, 0.8)';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        // Show MIC indicator only
        canvasCtx.fillStyle = '#5FA9A8';
        canvasCtx.font = '10px monospace';
        canvasCtx.textAlign = 'right';
        canvasCtx.fillText('MIC', canvas.width - 5, 15);

        // Draw grid lines
        canvasCtx.strokeStyle = 'rgba(217, 164, 65, 0.1)';
        canvasCtx.beginPath();
        for (let i = 0; i <= 4; i++) {
            const y = (canvas.height / 4) * i;
            canvasCtx.moveTo(0, y);
            canvasCtx.lineTo(canvas.width, y);
        }
        canvasCtx.stroke();

        // Draw clean frequency bars across all ranges
        // Use first 60 bins (covers most important frequencies 0-11kHz)
        const displayBins = 60;
        const barWidth = canvas.width / displayBins;

        for (let i = 0; i < displayBins; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height * 0.85;

            // Single gradient for all bars - like the mids section
            const gradient = canvasCtx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
            gradient.addColorStop(0, '#B46C3A'); // Film burn rose base
            gradient.addColorStop(1, '#5FA9A8');  // Cyan top

            canvasCtx.fillStyle = gradient;
            canvasCtx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 1, barHeight);
        }

        // Draw frequency line
        if (dataArray.some(val => val > 0)) {
            canvasCtx.strokeStyle = '#5FA9A8';
            canvasCtx.lineWidth = 2;
            canvasCtx.beginPath();

            for (let i = 0; i < bufferLength; i += 4) {
                const x = (i / bufferLength) * canvas.width;
                const y = canvas.height - (dataArray[i] / 255) * canvas.height * 0.6;

                if (i === 0) {
                    canvasCtx.moveTo(x, y);
                } else {
                    canvasCtx.lineTo(x, y);
                }
            }
            canvasCtx.stroke();
        }
    }

    drawFrequencyBars();
}

async function toggleRadio() {
    console.log('[RADIO] toggleRadio called, radioIsPlaying:', radioIsPlaying);

    const radioContainer = document.getElementById('radio-container');
    const radioToggle = document.getElementById('radio-toggle');
    const audioPlayer = document.getElementById('radio-player');
    const statusElement = document.getElementById('radio-status');

    if (!radioContainer || !radioToggle || !audioPlayer || !statusElement) {
        console.error('[RADIO] Missing required elements:', {
            radioContainer: !!radioContainer,
            radioToggle: !!radioToggle,
            audioPlayer: !!audioPlayer,
            statusElement: !!statusElement
        });
        return;
    }

    if (!radioIsPlaying) {
        // Show container
        radioContainer.style.display = 'block';
        radioToggle.classList.add('bg-amber-glow/20', 'border-amber-glow');

        // Radio stations - cycling through different genres and styles
        const radioStations = [
            { name: 'SomaFM Groove Salad', url: 'https://ice1.somafm.com/groovesalad-256-mp3' },
            { name: 'SomaFM Deep Space One', url: 'https://ice4.somafm.com/deepspaceone-128-mp3' },
            { name: 'SomaFM DEF CON Radio', url: 'https://ice2.somafm.com/defcon-128-mp3' },
            { name: 'Radio Paradise', url: 'https://stream.radioparadise.com/aac-320' },
            { name: 'Star FM Blues', url: 'https://stream.starfm.de/blues/mp3-192/' },
            { name: 'France Inter FIP', url: 'https://icecast.radiofrance.fr/fip-midfi.mp3' },
            { name: 'KEXP Seattle', url: 'https://kexp-mp3-128.streamguys1.com/kexp128.mp3' },
            { name: 'BBC Radio 6 Music', url: 'https://stream.live.vc.bbcmedia.co.uk/bbc_6music' }
        ];

        // Get current station index or start with random
        let currentStationIndex = parseInt(localStorage.getItem('radioStationIndex')) || Math.floor(Math.random() * radioStations.length);
        const station = radioStations[currentStationIndex];

        // Update to next station for next time
        const nextIndex = (currentStationIndex + 1) % radioStations.length;
        localStorage.setItem('radioStationIndex', nextIndex.toString());

        try {
            statusElement.textContent = `Radio: ${station.name}`;
            updateRadioTicker(`♫ Now Playing: ${station.name} ♫`);

            audioPlayer.src = station.url;
            audioPlayer.volume = 0.5;

            // Try to play
            await audioPlayer.play();
            radioIsPlaying = true;

            // Auto-enable microphone for visualization
            setTimeout(async () => {
                if (radioIsPlaying && !usingMicrophone) {
                    await enableMicrophoneCapture();
                }
            }, 500);

        } catch (error) {
            statusElement.textContent = 'Radio: Connection Failed';
            updateRadioTicker('♫ Connection Failed ♫');
            radioContainer.style.display = 'none';
            radioToggle.classList.remove('bg-amber-glow/20', 'border-amber-glow');
        }

    } else {
        // Stop radio
        audioPlayer.pause();
        audioPlayer.src = '';
        radioIsPlaying = false;

        if (radioAnimationId) {
            cancelAnimationFrame(radioAnimationId);
        }

        // Stop microphone if active
        if (microphoneStream) {
            microphoneStream.getTracks().forEach(track => track.stop());
            microphoneStream = null;
            microphoneSource = null;
            usingMicrophone = false;
        }

        // Clear visualizer
        const canvas = document.getElementById('frequency-canvas');
        const canvasCtx = canvas.getContext('2d');
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

        radioContainer.style.display = 'none';
        radioToggle.classList.remove('bg-amber-glow/20', 'border-amber-glow');
        statusElement.textContent = 'Radio: Offline';
        addRadioDebug('Radio stopped', 'info');
        radioDebugLog = [];
    }
}

// Mode toggles (CCD, Shader, and Anime) - All combinable
document.addEventListener('DOMContentLoaded', () => {
    const ccdToggle = document.getElementById('ccd-toggle');
    const shaderToggle = document.getElementById('shader-toggle');
    const animeToggle = document.getElementById('anime-toggle');
    const radioToggle = document.getElementById('radio-toggle');
    const body = document.body;
    const shaderCanvas = document.getElementById('shader-canvas');

    // Three.js shader setup
    let renderer, scene, camera;
    let animationId = null;
    let animeAnimation = null;

    function initShader() {
        if (typeof THREE === 'undefined') return;

        // Setup renderer
        renderer = new THREE.WebGLRenderer({ canvas: shaderCanvas, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);

        // Setup scene and camera
        scene = new THREE.Scene();
        camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        // Create custom shader material
        const vintageShaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                intensity: { value: 1.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float intensity;
                varying vec2 vUv;

                void main() {
                    vec2 uv = vUv;

                    // Create vintage digital camera color grading
                    vec3 color = vec3(0.0);

                    // Color shift - old CCD sensor characteristics
                    color.r = sin(uv.x * 3.14159 + time * 0.5) * 0.1 + 0.9;
                    color.g = sin(uv.y * 3.14159 + time * 0.3) * 0.08 + 0.85;
                    color.b = sin((uv.x + uv.y) * 3.14159) * 0.05 + 0.75;

                    // Add noise/grain
                    float noise = fract(sin(dot(uv + time * 0.01, vec2(12.9898, 78.233))) * 43758.5453);
                    color += noise * 0.08;

                    // Vignetting
                    float vignette = smoothstep(1.0, 0.4, length(uv - 0.5));
                    color *= vignette;

                    // Scanline effect
                    float scanline = sin(uv.y * 800.0 + time * 2.0) * 0.02;
                    color -= scanline;

                    // Chromatic aberration
                    color.r *= 1.02;
                    color.b *= 0.98;

                    // Output with transparency
                    gl_FragColor = vec4(color, intensity * 0.3);
                }
            `,
            transparent: true
        });

        // Create fullscreen quad
        const geometry = new THREE.PlaneGeometry(2, 2);
        const mesh = new THREE.Mesh(geometry, vintageShaderMaterial);
        scene.add(mesh);

        // Animation loop
        function animate() {
            animationId = requestAnimationFrame(animate);
            vintageShaderMaterial.uniforms.time.value += 0.01;
            renderer.render(scene, camera);
        }

        return animate;
    }

    // Initialize Anime.js effects - focus on image filters only
    function initAnimeEffects() {
        if (typeof anime === 'undefined') return;

        // No text animations - effects are applied via CSS animations on images
        // The vintageFilter keyframes in CSS handle the image animations
        return true;
    }

    // Stop Anime.js effects
    function stopAnimeEffects() {
        // CSS animations will stop when anime-mode class is removed
        return true;
    }

    // Load saved states from localStorage
    const ccdEnabled = localStorage.getItem('ccdMode') === 'true';
    const shaderEnabled = localStorage.getItem('shaderMode') === 'true';
    const animeEnabled = localStorage.getItem('animeMode') === 'true';

    // Apply saved states on load
    if (ccdEnabled) {
        body.classList.add('ccd-mode');
        ccdToggle.classList.add('active');
    }

    if (shaderEnabled) {
        body.classList.add('shader-mode');
        shaderToggle.classList.add('active');
        shaderCanvas.style.display = 'block';
        const animateFn = initShader();
        if (animateFn) animateFn();
    }

    if (animeEnabled && animeToggle) {
        body.classList.add('anime-mode');
        animeToggle.classList.add('active');
        initAnimeEffects();
    }

    // CCD Mode Toggle - Independent
    ccdToggle.addEventListener('click', () => {
        body.classList.toggle('ccd-mode');
        ccdToggle.classList.toggle('active');

        const isActive = body.classList.contains('ccd-mode');
        localStorage.setItem('ccdMode', isActive);
    });

    // Shader Mode Toggle - Independent
    shaderToggle.addEventListener('click', () => {
        const isActive = !body.classList.contains('shader-mode');

        if (isActive) {
            body.classList.add('shader-mode');
            shaderToggle.classList.add('active');
            shaderCanvas.style.display = 'block';
            const animateFn = initShader();
            if (animateFn) animateFn();
        } else {
            body.classList.remove('shader-mode');
            shaderToggle.classList.remove('active');
            shaderCanvas.style.display = 'none';
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
        }

        localStorage.setItem('shaderMode', isActive);
    });

    // Anime Mode Toggle - Independent (only if button exists)
    if (animeToggle) {
        animeToggle.addEventListener('click', () => {
            const isActive = !body.classList.contains('anime-mode');

            if (isActive) {
                body.classList.add('anime-mode');
                animeToggle.classList.add('active');
                initAnimeEffects();
            } else {
                body.classList.remove('anime-mode');
                animeToggle.classList.remove('active');
                stopAnimeEffects();
            }

            localStorage.setItem('animeMode', isActive);
        });
    }

    // Radio Toggle
    if (radioToggle) {
        console.log('[RADIO] Radio toggle button found, adding event listener');
        radioToggle.addEventListener('click', () => {
            console.log('[RADIO] Radio button clicked');
            toggleRadio();
        });
    } else {
        console.error('[RADIO] Radio toggle button not found!');
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        if (renderer) {
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
    });
});