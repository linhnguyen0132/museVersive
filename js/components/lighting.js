import * as THREE from 'three';

export function createCeilingLamp(scene, x, z) {
    const lampGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16);
    const lampMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, emissive: 0xfff6e0, emissiveIntensity: 1.5 
    });
    const lampMesh = new THREE.Mesh(lampGeometry, lampMaterial);
    lampMesh.position.set(x, 7.9, z); 
    scene.add(lampMesh);

    const light = new THREE.PointLight(0xfff6e0, 25, 18, 1.5);
    light.position.set(x, 7.5, z);
    scene.add(light);
}