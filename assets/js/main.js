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
    const vuMeter = document.getElementById('vu-meter');

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

    // VU Meter with Realistic Physics
    function createVUMeter() {
        if (typeof anime === 'undefined') return;

        const needle = document.querySelector('#vu-meter .vu-needle');
        const segments = document.querySelectorAll('#vu-meter .vu-segment');

        if (!needle || !segments.length) return;

        // Realistic needle physics with overshoot
        const animateNeedle = (targetRotation) => {
            anime({
                targets: needle,
                rotate: targetRotation,
                duration: anime.random(150, 300),
                easing: 'easeOutElastic(1.2, .4)',
                complete: () => {
                    // Subtle vibration when hitting peaks
                    if (Math.abs(targetRotation) > 25) {
                        anime({
                            targets: needle,
                            rotate: [targetRotation, targetRotation - 1.5, targetRotation],
                            duration: 120,
                            easing: 'easeInOutSine'
                        });
                    }
                }
            });
        };

        // LED segments lighting up with stagger
        const animateSegments = (level) => {
            const activeSegments = Math.floor(level * segments.length);

            segments.forEach((segment, i) => {
                const isActive = i < activeSegments;
                const ratio = i / segments.length;
                const color = ratio < 0.6 ? '#39ff14' : // Green (0-60%)
                             ratio < 0.85 ? '#ffff00' : // Yellow (60-85%)
                             '#ff4444'; // Red (85-100%)

                anime({
                    targets: segment,
                    backgroundColor: isActive ? color : '#1a1a1a',
                    boxShadow: isActive ? `0 0 8px ${color}, inset 0 1px 0 rgba(255,255,255,0.1)` : 'inset 0 1px 2px rgba(0, 0, 0, 0.5)',
                    scale: isActive ? [1, 1.05, 1] : 1,
                    duration: 200,
                    delay: i * 15,
                    easing: 'easeOutCubic'
                });
            });
        };

        // Simulate realistic audio levels with multiple frequencies
        const animateVU = () => {
            // Combine multiple sine waves for realistic audio simulation
            const time = Date.now() * 0.001;
            const lowFreq = Math.sin(time * 0.7) * 0.3;
            const midFreq = Math.sin(time * 2.1) * 0.25;
            const highFreq = Math.sin(time * 4.3) * 0.15;
            const noise = (Math.random() - 0.5) * 0.2;

            let level = 0.3 + lowFreq + midFreq + highFreq + noise;
            level = Math.max(0, Math.min(1, level)); // Clamp between 0-1

            // Occasional peaks for realism
            if (Math.random() < 0.05) {
                level = Math.min(1, level + 0.3);
            }

            const rotation = (level - 0.5) * 60; // -30 to 30 degrees

            animateNeedle(rotation);
            animateSegments(level);

            vuAnimationId = setTimeout(animateVU, 100);
        };

        animateVU();
        return true;
    }

    function stopVUMeter() {
        if (vuAnimationId) {
            clearTimeout(vuAnimationId);
            vuAnimationId = null;
        }

        // Reset needle position
        const needle = document.querySelector('#vu-meter .vu-needle');
        if (needle) {
            anime({
                targets: needle,
                rotate: -30,
                duration: 500,
                easing: 'easeOutCubic'
            });
        }

        // Turn off all segments
        const segments = document.querySelectorAll('#vu-meter .vu-segment');
        segments.forEach(segment => {
            anime({
                targets: segment,
                backgroundColor: '#1a1a1a',
                boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.5)',
                scale: 1,
                duration: 300
            });
        });
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

    if (vuEnabled && vuToggle && vuMeter) {
        vuMeter.style.display = 'block';
        vuToggle.classList.add('active');
        createVUMeter();
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

    // VU Mode Toggle - Independent (only if button exists)
    if (vuToggle) {
        vuToggle.addEventListener('click', () => {
            const isActive = !vuMeter.style.display || vuMeter.style.display === 'none';

            if (isActive) {
                vuMeter.style.display = 'block';
                vuToggle.classList.add('active');
                createVUMeter();
            } else {
                vuMeter.style.display = 'none';
                vuToggle.classList.remove('active');
                stopVUMeter();
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