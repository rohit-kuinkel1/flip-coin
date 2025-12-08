import * as THREE from 'three';
import { Quaternion, Vec3 } from 'flip-coin/debug';

export class CoinMesh {
    public mesh: THREE.Group;
    private cylinder: THREE.Mesh;

    constructor(radius: number, thickness: number) {
        this.mesh = new THREE.Group();

        /**
         * Create the cylinder geometry.
         * CylinderGeometry(radiusTop, radiusBottom, height, radialSegments)
         * Note: In Three.js cylinder is oriented along Y axis by default.
         */
        const geometry = new THREE.CylinderGeometry(radius, radius, thickness, 32);

        /**
         * Materials for the coin faces:
         * 0: side (edge) - Copper-ish
         * 1: top (Heads) - Gold
         * 2: bottom (Tails) - Silver
         */
        const matSide = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.8, roughness: 0.3 });
        const matHeads = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 });
        const matTails = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.9, roughness: 0.2 });

        this.cylinder = new THREE.Mesh(geometry, [matSide, matHeads, matTails]);
        this.cylinder.castShadow = true;
        this.cylinder.receiveShadow = true;

        /**
         * In Three.js Cylinder is Y-up.
         * If the physics body assumes Y-up is the normal of the disc, then cylinder matches.
         * Cylinder top face is +Y. So Top = Heads.
         */

        this.mesh.add(this.cylinder);
    }

    /**
     * Update visual state from Physics Vec3/Quaternion.
     */
    public updateState(position: Vec3, orientation: Quaternion) {
        this.mesh.position.set(position.x, position.y, position.z);

        /**
         * Flip-coin Quaternion to Three.js Quaternion.
         * Assuming component order x, y, z, w is the same.
         */
        this.mesh.quaternion.set(orientation.x, orientation.y, orientation.z, orientation.w);
    }

    public addToScene(scene: THREE.Scene) {
        scene.add(this.mesh);
    }
}
