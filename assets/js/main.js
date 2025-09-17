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

// Mode toggles (CCD, Shader, Anime, and VU) - All combinable
document.addEventListener('DOMContentLoaded', () => {
    const ccdToggle = document.getElementById('ccd-toggle');
    const shaderToggle = document.getElementById('shader-toggle');
    const animeToggle = document.getElementById('anime-toggle');
    const vuToggle = document.getElementById('vu-toggle');
    const body = document.body;
    const shaderCanvas = document.getElementById('shader-canvas');

    // Three.js shader setup
    let renderer, scene, camera;
    let animationId = null;
    let animeAnimation = null;
    let vuAnimationId = null;

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

    // Radio stream setup for VU meters
    async function setupRadioStream() {
        try {
            // Check if we already have an audio context
            if (window.radioAudio) {
                return true; // Already set up
            }

            // Create audio element for radio stream
            const audio = document.createElement('audio');
            audio.crossOrigin = 'anonymous';

            // Try different stream URLs (some may work better with CORS)
            const streamUrls = [
                'https://stream.starfm.de/blues/mp3-192/',
                'https://icecast.starfm.de/blues/mp3-192/',
                'https://cors-anywhere.herokuapp.com/https://stream.starfm.de/blues/mp3-192/'
            ];

            audio.src = streamUrls[0];
            audio.preload = 'none';
            audio.volume = 1.0;

            // Append to body (sometimes needed for mobile)
            document.body.appendChild(audio);
            audio.style.display = 'none';

            // Store reference for controls
            window.radioAudio = audio;

            // Wait for audio to be ready
            await new Promise((resolve) => {
                audio.addEventListener('canplay', resolve, { once: true });
                audio.load();
            });

            const audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Resume context if suspended
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            const source = audioContext.createMediaElementSource(audio);

            window.vuAudioAnalyser = audioContext.createAnalyser();
            window.vuAudioAnalyser.fftSize = 2048; // Higher resolution for better time domain analysis
            window.vuAudioAnalyser.smoothingTimeConstant = 0.8; // Smoother for VU meters
            window.vuAudioAnalyser.minDecibels = -90;
            window.vuAudioAnalyser.maxDecibels = -10;

            source.connect(window.vuAudioAnalyser);
            source.connect(audioContext.destination);
            // Create data array for time domain data (full FFT size for time domain)
            window.vuDataArray = new Float32Array(window.vuAudioAnalyser.fftSize);

            console.log('📻 Radio stream connected to VU meters');
            return true;
        } catch (error) {
            console.log('📻 Radio stream connection failed:', error);
            return false;
        }
    }

    // Start radio and show VU meters
    async function startRadio() {
        const technicsContainer = document.getElementById('technics-vu');
        if (!technicsContainer) return;

        // Setup radio stream
        const radioConnected = await setupRadioStream();
        if (!radioConnected) {
            console.log('Failed to setup radio stream');
            return;
        }

        try {
            // Start playing radio
            await window.radioAudio.play();

            // Fade in VU meters
            technicsContainer.classList.remove('hidden');
            technicsContainer.style.opacity = '0';
            technicsContainer.style.transition = 'opacity 1s ease-in-out';

            setTimeout(() => {
                technicsContainer.style.opacity = '1';
            }, 100);

            // Initialize dual VU meters
            initializeTechnicsVU('left');
            initializeTechnicsVU('right');

            console.log('📻 Radio playing with VU meters active');
            return true;
        } catch (error) {
            console.log('Failed to start radio playback:', error);
            return false;
        }
    }

    // Stop radio and hide VU meters
    function stopRadio() {
        if (window.radioAudio) {
            window.radioAudio.pause();
            window.radioAudio.currentTime = 0;
        }

        // Stop VU animation
        vuAnimationId = null;

        // Fade out VU meters
        const technicsContainer = document.getElementById('technics-vu');
        if (technicsContainer) {
            technicsContainer.style.opacity = '0';
            setTimeout(() => {
                technicsContainer.classList.add('hidden');
            }, 1000);
        }

        console.log('📻 Radio stopped');
    }

    function initializeTechnicsVU(channel) {
        // CONFIG for each meter
        const PIVOT = { x: 205, y: 300 };            // pivot in SVG coordinates
        const RADIUS = 210;                          // needle length
        const MIN_DB = -60, MAX_DB = +5;             // display range
        const SWEEP_MIN = -64, SWEEP_MAX = 64;       // degrees mapped from MIN_DB..MAX_DB
        const TAU = 0.065;                           // seconds (≈65 ms) for envelope smoothing
        const REF_DBFS = -12;                        // calibrate: which dBFS should show 0 dB on meter

        // Helper functions
        const deg2rad = a => a * Math.PI / 180;
        const rad2deg = r => r * 180 / Math.PI;

        // Get elements for this channel
        const svgNS = "http://www.w3.org/2000/svg";
        const scaleG = document.getElementById(`scale-${channel}`);
        const needleEl = document.getElementById(`needle-${channel}`);

        if (!scaleG || !needleEl) return;

        function polarToCartesian(cx, cy, r, angleDeg) {
            const a = deg2rad(angleDeg - 90);
            return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
        }

        function describeArc(x, y, radius, startAngle, endAngle) {
            const start = polarToCartesian(x, y, radius, endAngle);
            const end = polarToCartesian(x, y, radius, startAngle);
            const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
            return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
        }

        // Map display dB (linear) to angle (degrees)
        function dbToAngle(db) {
            const t = (db - MIN_DB) / (MAX_DB - MIN_DB);
            return SWEEP_MIN + t * (SWEEP_MAX - SWEEP_MIN);
        }

        // Draw ticks and scales dynamically
        function drawTicks() {
            // Clear any existing scales first
            scaleG.innerHTML = '';

            // Draw the main scale arc
            const startAngle = SWEEP_MIN;
            const endAngle = SWEEP_MAX;
            const arcPath = describeArc(PIVOT.x, PIVOT.y, RADIUS, startAngle, endAngle);
            const arc = document.createElementNS(svgNS, "path");
            arc.setAttribute("d", arcPath);
            arc.setAttribute("class", "tick");
            arc.setAttribute("fill", "none");
            scaleG.appendChild(arc);

            // Draw many ticks between MIN_DB..MAX_DB
            const dbStep = 2; // 2 dB small ticks for cleaner look
            for (let db = MIN_DB; db <= MAX_DB; db += dbStep) {
                const angle = dbToAngle(db);
                const outer = polarToCartesian(PIVOT.x, PIVOT.y, RADIUS + 8, angle);
                const inner = polarToCartesian(PIVOT.x, PIVOT.y, (db % 10 === 0 ? RADIUS - 25 : RADIUS - 15), angle);
                const line = document.createElementNS(svgNS, "line");
                line.setAttribute("x1", outer.x);
                line.setAttribute("y1", outer.y);
                line.setAttribute("x2", inner.x);
                line.setAttribute("y2", inner.y);
                line.setAttribute("class", (db % 10 === 0) ? "tick" : "tick small");
                scaleG.appendChild(line);

                if (db % 10 === 0) {
                    // dB label inside the ring
                    const labPos = polarToCartesian(PIVOT.x, PIVOT.y, RADIUS - 40, angle);
                    const t = document.createElementNS(svgNS, "text");
                    t.setAttribute("x", labPos.x);
                    t.setAttribute("y", labPos.y + 4);
                    t.setAttribute("class", "label dblabel");
                    t.textContent = String(db);
                    scaleG.appendChild(t);
                }
            }

            // Watt labels (logarithmic) along the outer area
            const wattAngles = [
                { w: 0.0001, a: dbToAngle(-60) },
                { w: 0.001, a: dbToAngle(-50) },
                { w: 0.01, a: dbToAngle(-40) },
                { w: 0.1, a: dbToAngle(-30) },
                { w: 1, a: dbToAngle(-20) },
                { w: 10, a: dbToAngle(-10) },
                { w: 100, a: dbToAngle(0) },
                { w: 200, a: dbToAngle(3) },
                { w: 300, a: dbToAngle(5) }
            ];

            wattAngles.forEach(o => {
                const angle = o.a;
                const outer = polarToCartesian(PIVOT.x, PIVOT.y, RADIUS + 25, angle);
                const tt = document.createElementNS(svgNS, "text");
                tt.setAttribute("x", outer.x);
                tt.setAttribute("y", outer.y + 5);
                tt.setAttribute("class", "label");
                tt.setAttribute("font-size", "9");
                tt.setAttribute("text-anchor", "middle");
                // Adjust positioning for extreme left and right labels
                if (angle < -45) {
                    tt.setAttribute("text-anchor", "start");
                    tt.setAttribute("x", outer.x + 8);
                } else if (angle > 45) {
                    tt.setAttribute("text-anchor", "end");
                    tt.setAttribute("x", outer.x - 8);
                }
                tt.textContent = String(o.w);
                scaleG.appendChild(tt);
            });

            // Center labels
            const wattsLabel = document.createElementNS(svgNS, "text");
            wattsLabel.setAttribute("x", PIVOT.x);
            wattsLabel.setAttribute("y", PIVOT.y - 6);
            wattsLabel.setAttribute("class", "label");
            wattsLabel.textContent = "watts (8Ω)";
            scaleG.appendChild(wattsLabel);

            const dbLabel = document.createElementNS(svgNS, "text");
            dbLabel.setAttribute("x", PIVOT.x);
            dbLabel.setAttribute("y", PIVOT.y + 10);
            dbLabel.setAttribute("class", "label");
            dbLabel.textContent = "dB";
            scaleG.appendChild(dbLabel);
        }

        drawTicks();

        // Animation variables for this channel
        let env = MIN_DB;
        let lastTime = performance.now();

        function computeAlpha(dt) {
            return 1 - Math.exp(-dt / TAU);
        }

        // Audio analysis - live radio stream (proper VU meter response)
        function getCurrentDbFS() {
            if (!window.vuAudioAnalyser || !window.vuDataArray) {
                return -60; // Silent if no audio
            }

            // Use time domain data for VU meters (actual audio waveform)
            window.vuAudioAnalyser.getFloatTimeDomainData(window.vuDataArray);

            // Calculate RMS (Root Mean Square) of the audio signal
            let sum = 0;
            for (let i = 0; i < window.vuDataArray.length; i++) {
                sum += window.vuDataArray[i] * window.vuDataArray[i];
            }
            const rms = Math.sqrt(sum / window.vuDataArray.length);

            // Convert RMS to dBFS
            let dBFS = 20 * Math.log10(rms);

            // Handle silence/very quiet audio
            if (!isFinite(dBFS) || dBFS < -80) {
                dBFS = -80;
            }

            // Add slight channel variation for stereo effect
            const channelVariation = channel === 'right' ?
                0.9 + Math.random() * 0.2 :
                1.0 + Math.random() * 0.1;

            // Scale for VU meter response (boost the signal)
            const vuLevel = dBFS + 20; // Boost signal for better VU response
            const finalLevel = vuLevel * channelVariation;

            return Math.max(-60, Math.min(5, finalLevel));
        }

        // Animation loop for this channel
        function frame(t) {
            const now = t || performance.now();
            const dt = Math.max(1e-3, (now - lastTime) / 1000);
            lastTime = now;

            const alpha = computeAlpha(dt);
            const dbfs = getCurrentDbFS();
            let disp = dbfs - REF_DBFS;

            // Clamp
            if (disp < MIN_DB) disp = MIN_DB;
            if (disp > MAX_DB) disp = MAX_DB;

            // Smooth in dB domain (exponential)
            env = env + alpha * (disp - env);

            // Map env to angle and rotate needle
            const ang = dbToAngle(env);
            needleEl.parentNode.setAttribute("transform", `translate(${PIVOT.x} ${PIVOT.y}) rotate(${ang})`);

            // Debug audio levels occasionally
            if (Math.random() < 0.01) {
                console.log(`${channel} channel: dBFS=${disp.toFixed(1)}, env=${env.toFixed(1)}, angle=${ang.toFixed(1)}`);
            }

            // Continue animation if VU meters are still active
            if (vuAnimationId) {
                requestAnimationFrame(frame);
            }
        }

        vuAnimationId = true; // Both channels need animation
        requestAnimationFrame(frame);
    }



    // Load saved states from localStorage
    const ccdEnabled = localStorage.getItem('ccdMode') === 'true';
    const shaderEnabled = localStorage.getItem('shaderMode') === 'true';
    const animeEnabled = localStorage.getItem('animeMode') === 'true';
    const vuEnabled = localStorage.getItem('vuMode') === 'true';

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

    if (vuEnabled && vuToggle) {
        vuToggle.classList.add('active');
        startRadio();
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

    // Radio Mode Toggle - Independent (only if button exists)
    if (vuToggle) {
        vuToggle.addEventListener('click', () => {
            const isActive = !vuToggle.classList.contains('active');

            if (isActive) {
                vuToggle.classList.add('active');
                startRadio();
            } else {
                vuToggle.classList.remove('active');
                stopRadio();
            }

            localStorage.setItem('vuMode', isActive);
        });
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        if (renderer) {
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
    });
});