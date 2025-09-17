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

function addRadioDebug(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    console.log(`[RADIO DEBUG] ${logEntry}`);
    radioDebugLog.push(logEntry);

    // Keep only last 10 messages
    if (radioDebugLog.length > 10) {
        radioDebugLog.shift();
    }

    const debugElement = document.getElementById('radio-debug');
    if (debugElement) {
        debugElement.innerHTML = radioDebugLog.join('<br>');
        debugElement.scrollTop = debugElement.scrollHeight;
    }
}

async function initRadioVisualizer() {
    try {
        const audioPlayer = document.getElementById('radio-player');

        if (!radioAudioContext) {
            radioAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            addRadioDebug('Audio context created', 'success');
        }

        // Resume audio context if suspended (browser security)
        if (radioAudioContext.state === 'suspended') {
            await radioAudioContext.resume();
            addRadioDebug('Audio context resumed', 'success');
        }

        // Create analyzer node
        radioAnalyzer = radioAudioContext.createAnalyser();
        radioAnalyzer.fftSize = 256;
        radioAnalyzer.smoothingTimeConstant = 0.8;

        // Connect audio element to analyzer
        if (!radioSource) {
            try {
                radioSource = radioAudioContext.createMediaElementSource(audioPlayer);
                radioSource.connect(radioAnalyzer);
                radioAnalyzer.connect(radioAudioContext.destination);
                addRadioDebug('Audio analyzer connected', 'success');

                // Debug audio context state
                console.log('[RADIO] Audio Context State:', radioAudioContext.state);
                console.log('[RADIO] Sample Rate:', radioAudioContext.sampleRate);
                console.log('[RADIO] Audio Element:', audioPlayer);
                console.log('[RADIO] Audio Source URL:', audioPlayer.src);
                console.log('[RADIO] Audio Ready State:', audioPlayer.readyState);

            } catch (err) {
                addRadioDebug(`Failed to create audio source: ${err.message}`, 'error');
                console.error('[RADIO] Audio source creation error:', err);
            }
        } else {
            addRadioDebug('Reusing existing audio source', 'info');
        }

        const bufferLength = radioAnalyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const canvas = document.getElementById('frequency-canvas');
        const canvasCtx = canvas.getContext('2d');

        // Set canvas size properly
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width || 256;
        canvas.height = rect.height || 128;

        addRadioDebug(`Canvas size: ${canvas.width}x${canvas.height}`, 'info');
        addRadioDebug(`Visualizer initialized: ${bufferLength} frequency bins`, 'info');
        console.log('[RADIO] Canvas element:', canvas);
        console.log('[RADIO] Canvas actual size:', canvas.width, canvas.height);
        console.log('[RADIO] Canvas CSS size:', rect.width, rect.height);

        // Debug counter for logging
        let frameCount = 0;
        let lastDebugTime = Date.now();
        let corsBlocked = false;
        let checkCount = 0;

        // Animation function
        function drawFrequencyBars() {
            radioAnimationId = requestAnimationFrame(drawFrequencyBars);

            radioAnalyzer.getByteFrequencyData(dataArray);

            // Check if we're getting real data or if CORS is blocking
            if (checkCount < 60) { // Check for first 60 frames (about 1 second)
                checkCount++;
                const hasData = dataArray.some(v => v > 0);
                if (checkCount === 60 && !hasData) {
                    corsBlocked = true;
                    addRadioDebug('CORS blocking analyzer - no visualization available', 'warning');
                    addRadioDebug('Try a different stream or use a local proxy', 'info');
                }
            }

            // Debug: Log frequency data every second
            frameCount++;
            const now = Date.now();
            if (now - lastDebugTime > 1000) {
                const maxFreq = Math.max(...dataArray);
                const avgFreq = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                const nonZeroCount = dataArray.filter(v => v > 0).length;

                const dataType = corsBlocked ? 'BLOCKED' : 'REAL';
                addRadioDebug(`[${dataType}] Frame ${frameCount}: Max=${maxFreq}, Avg=${avgFreq.toFixed(1)}, NonZero=${nonZeroCount}/${bufferLength}`, 'debug');
                console.log('[RADIO ANALYZER] Data sample:', Array.from(dataArray).slice(0, 10));
                console.log('[RADIO ANALYZER] Canvas size:', canvas.width, 'x', canvas.height);
                console.log('[RADIO ANALYZER] Audio state:', audioPlayer.paused ? 'paused' : 'playing', 'Volume:', audioPlayer.volume);

                lastDebugTime = now;
                frameCount = 0;
            }

            // Clear canvas
            canvasCtx.fillStyle = 'rgba(14, 14, 14, 0.8)';
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

            // If CORS blocked, show message
            if (corsBlocked) {
                canvasCtx.fillStyle = '#5FA9A8';
                canvasCtx.font = '12px monospace';
                canvasCtx.textAlign = 'center';
                canvasCtx.fillText('CORS BLOCKED - Audio Only', canvas.width / 2, canvas.height / 2 - 10);
                canvasCtx.fillText('No Visualization Available', canvas.width / 2, canvas.height / 2 + 10);
                return; // Don't draw bars if no data
            }

            // Draw grid lines for visual reference
            canvasCtx.strokeStyle = 'rgba(217, 164, 65, 0.1)';
            canvasCtx.beginPath();
            for (let i = 0; i <= 4; i++) {
                const y = (canvas.height / 4) * i;
                canvasCtx.moveTo(0, y);
                canvasCtx.lineTo(canvas.width, y);
            }
            canvasCtx.stroke();

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = (dataArray[i] / 255) * canvas.height * 0.8;

                // Make bars more visible - minimum height if there's any data
                if (dataArray[i] > 0) {
                    barHeight = Math.max(barHeight, 2);
                }

                // Simpler solid color for debugging
                const intensity = dataArray[i] / 255;
                canvasCtx.fillStyle = `rgba(217, 164, 65, ${0.5 + intensity * 0.5})`;
                canvasCtx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

                x += barWidth + 1;
            }

            // Draw animated frequency line using anime.js
            if (anime && dataArray.some(val => val > 0)) {
                const points = [];
                for (let i = 0; i < bufferLength; i += 4) {
                    const x = (i / bufferLength) * canvas.width;
                    const y = canvas.height - (dataArray[i] / 255) * canvas.height * 0.6;
                    points.push({ x, y });
                }

                canvasCtx.strokeStyle = '#5FA9A8';
                canvasCtx.lineWidth = 2;
                canvasCtx.beginPath();
                points.forEach((point, index) => {
                    if (index === 0) {
                        canvasCtx.moveTo(point.x, point.y);
                    } else {
                        canvasCtx.lineTo(point.x, point.y);
                    }
                });
                canvasCtx.stroke();
            }
        }

        drawFrequencyBars();

    } catch (error) {
        addRadioDebug(`Visualizer error: ${error.message}`, 'error');
    }
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

        // Try different stream URLs - unfortunately most streams block CORS
        // To get working visualization, you'd need to:
        // 1. Use a local proxy server, or
        // 2. Find streams with proper CORS headers, or
        // 3. Host audio files on same domain
        const streamUrls = [
            // SomaFM streams (sometimes work with CORS)
            'https://ice1.somafm.com/groovesalad-256-mp3',
            'https://ice4.somafm.com/deepspaceone-128-mp3',
            'https://ice2.somafm.com/defcon-128-mp3',
            // Radio Paradise
            'https://stream.radioparadise.com/aac-320',
            // Original streams (likely CORS blocked but audio will play)
            'https://stream.starfm.de/blues/mp3-192/',
            'https://icecast.starfm.de/blues/mp3-192/',
            // Public radio attempts
            'https://icecast.radiofrance.fr/fip-midfi.mp3',
            'https://kexp-mp3-128.streamguys1.com/kexp128.mp3'
        ];

        let connected = false;

        for (const url of streamUrls) {
            try {
                addRadioDebug(`Trying stream: ${url}`, 'info');
                statusElement.textContent = 'Radio: Connecting...';

                audioPlayer.src = url;
                audioPlayer.volume = 0.5;

                // Try to play
                await audioPlayer.play();

                connected = true;
                radioIsPlaying = true;
                statusElement.textContent = 'Radio: Online';
                addRadioDebug(`Connected to: ${url}`, 'success');

                // Wait for audio to be actually playing
                audioPlayer.addEventListener('playing', async () => {
                    addRadioDebug('Audio is now playing, initializing visualizer', 'info');
                    await initRadioVisualizer();
                }, { once: true });

                // Also try after a delay as backup
                setTimeout(async () => {
                    if (radioIsPlaying && !radioAnimationId) {
                        addRadioDebug('Backup visualizer initialization', 'info');
                        await initRadioVisualizer();
                    }
                }, 1000);

                break;
            } catch (error) {
                addRadioDebug(`Failed to connect to ${url}: ${error.message}`, 'error');
            }
        }

        if (!connected) {
            statusElement.textContent = 'Radio: Connection Failed';
            addRadioDebug('All stream URLs failed. Check CORS or network.', 'error');
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