/**
 * 3D Camera Scene - Minimal Version
 * Just loads the Canon AT-1 model and slowly spins it
 */

const CameraScene = (function() {
    let scene, camera, renderer;
    let container = null;
    let animationFrameId = null;
    let isInitialized = false;
    let cameraModel = null;

    /**
     * Initialize the scene
     */
    function init(containerElement) {
        if (isInitialized) return;

        container = containerElement;
        if (!container) {
            console.error('CameraScene: No container provided');
            return;
        }

        console.log('CameraScene initializing...');

        setupScene();
        setupLights();
        loadModel();
        setupRenderer();

        window.addEventListener('resize', onWindowResize);
        animate();

        isInitialized = true;
        console.log('CameraScene initialized');
    }

    /**
     * Setup the Three.js scene
     */
    function setupScene() {
        scene = new THREE.Scene();
        // Transparent background to show page behind
        scene.background = null;

        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || window.innerHeight;

        camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
        camera.position.set(0, 0, 4);
        camera.lookAt(0, 0, 0);

        // Shift camera right so model appears more to the left (toward page center)
        camera.position.x = 1.0;
    }

    /**
     * Setup scene lighting
     */
    function setupLights() {
        // Soft ambient light for base visibility
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambient);

        // Key light from front-right-top
        const keyLight = new THREE.DirectionalLight(0xffffff, 0.7);
        keyLight.position.set(3, 4, 5);
        scene.add(keyLight);

        // Front light to illuminate the face of the camera
        const frontLight = new THREE.DirectionalLight(0xffffff, 0.5);
        frontLight.position.set(0, 0, 6);
        scene.add(frontLight);

        // Fill light from left
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
        fillLight.position.set(-5, 2, 3);
        scene.add(fillLight);

        // Fill light from right
        const fillLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight2.position.set(5, 1, 2);
        scene.add(fillLight2);

        // Bottom fill to reduce harsh shadows underneath
        const bottomLight = new THREE.DirectionalLight(0xffffff, 0.2);
        bottomLight.position.set(0, -3, 2);
        scene.add(bottomLight);

        // Back light for rim/edge definition
        const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
        backLight.position.set(0, 3, -5);
        scene.add(backLight);
    }

    /**
     * Load the Canon AT-1 GLTF model
     */
    function loadModel() {
        if (typeof THREE.GLTFLoader === 'undefined') {
            console.error('GLTFLoader not available');
            createFallbackCube();
            return;
        }

        const loader = new THREE.GLTFLoader();
        loader.load(
            'assets/models/scene.gltf',
            (gltf) => {
                cameraModel = gltf.scene;

                // Fix materials - disable transparency and ensure proper rendering
                cameraModel.traverse((child) => {
                    if (child.isMesh && child.material) {
                        const materials = Array.isArray(child.material) ? child.material : [child.material];
                        materials.forEach(mat => {
                            // Force opaque rendering
                            mat.transparent = false;
                            mat.opacity = 1;
                            mat.alphaTest = 0;
                            mat.depthWrite = true;
                            mat.side = THREE.FrontSide;

                            // Ensure proper rendering
                            if (mat.map) {
                                mat.map.encoding = THREE.sRGBEncoding;
                            }
                        });
                    }
                });

                // Calculate bounding box to center and scale properly
                const box = new THREE.Box3().setFromObject(cameraModel);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());

                // Scale to fit nicely in view (target size ~2 units)
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 2 / maxDim;
                cameraModel.scale.setScalar(scale);

                // Center the model at origin (0, 0, 0)
                cameraModel.position.set(0, 0, 0);
                box.setFromObject(cameraModel);
                box.getCenter(center);
                cameraModel.position.sub(center);

                scene.add(cameraModel);
                console.log('Canon AT-1 model loaded, scale:', scale);
            },
            (progress) => {
                if (progress.total > 0) {
                    console.log('Loading:', Math.round(progress.loaded / progress.total * 100) + '%');
                }
            },
            (error) => {
                console.error('Error loading model:', error);
                createFallbackCube();
            }
        );
    }

    /**
     * Create a simple cube as fallback
     */
    function createFallbackCube() {
        const geometry = new THREE.BoxGeometry(1, 0.7, 0.5);
        const material = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.5,
            roughness: 0.5
        });
        cameraModel = new THREE.Mesh(geometry, material);
        scene.add(cameraModel);
        console.log('Using fallback cube');
    }

    /**
     * Setup WebGL renderer
     */
    function setupRenderer() {
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });

        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || window.innerHeight;

        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);

        container.appendChild(renderer.domElement);
    }

    /**
     * Handle window resize
     */
    function onWindowResize() {
        if (!container || !camera || !renderer) return;

        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || window.innerHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    /**
     * Main animation loop
     */
    function animate() {
        animationFrameId = requestAnimationFrame(animate);

        // Slowly rotate the camera model
        if (cameraModel) {
            cameraModel.rotation.y += 0.003;
        }

        renderer.render(scene, camera);
    }

    /**
     * Clean up resources
     */
    function destroy() {
        if (!isInitialized) return;

        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        window.removeEventListener('resize', onWindowResize);

        if (renderer) {
            renderer.dispose();
            if (container && renderer.domElement) {
                container.removeChild(renderer.domElement);
            }
        }

        if (scene) {
            scene.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(m => m.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }

        scene = null;
        camera = null;
        renderer = null;
        container = null;
        cameraModel = null;
        isInitialized = false;
    }

    return {
        init,
        destroy,
        get isInitialized() { return isInitialized; }
    };
})();

window.cameraScene = CameraScene;
