import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';

export class SceneSetup {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    public controls: OrbitControls;

    constructor(container: HTMLElement) {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);
        /**
         * Add some soft fog to provide depth cues and prevent infinite black void.
         */
        this.scene.fog = new THREE.Fog(0x1a1a1a, 1, 20);

        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.01,
            10
        );

        /**
         * Position camera closer for better view of the small coin (approx 1.2cm radius).
         * Started slightly above and back to view the toss.
         */
        this.camera.position.set(0, 0.4, 0.5);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        /** Enable shadow map for realistic depth. */
        this.renderer.shadowMap.enabled = true;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        /** Use standard sRGB color space for correct color rendering. */
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        container.appendChild(this.renderer.domElement);

        this.setupLights();
        this.setupGround();

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 0.05;
        this.controls.maxDistance = 5;

        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    private setupLights() {
        /** Ambient light provides soft fill to avoid pitch black shadows. */
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        /** Directional light simulates sun/main source and casts shadows. */
        const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
        /** Position closer and brighter for small scale scene. */
        dirLight.position.set(0.5, 1, 0.5);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        /** Tighten shadow camera frustum for small object to improve shadow resolution. */
        dirLight.shadow.camera.left = -0.1;
        dirLight.shadow.camera.right = 0.1;
        dirLight.shadow.camera.top = 0.1;
        dirLight.shadow.camera.bottom = -0.1;
        this.scene.add(dirLight);

        /** Point lights add specular highlights and reflections. */
        const pLight1 = new THREE.PointLight(0x0088ff, 1.0);
        pLight1.position.set(-0.2, 0.2, 0);
        this.scene.add(pLight1);

        const pLight2 = new THREE.PointLight(0xffaa00, 0.8);
        pLight2.position.set(0.2, 0.2, 0.1);
        this.scene.add(pLight2);
    }

    private setupGround() {
        /**
         * Grid helper adjusted for cm-scale objects.
         * 0.5 meters size with 10 divisions results in 5cm cells.
         */
        const grid = new THREE.GridHelper(0.5, 10, 0x444444, 0x222222);
        this.scene.add(grid);

        /** Invisible plane to catch shadows without obscuring the background. */
        const planeGeo = new THREE.PlaneGeometry(1, 1);
        const planeMat = new THREE.ShadowMaterial({ opacity: 0.3 });
        const plane = new THREE.Mesh(planeGeo, planeMat);
        plane.rotation.x = -Math.PI / 2;
        plane.receiveShadow = true;
        this.scene.add(plane);
    }

    private onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    public render() {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
