// js/components/npc.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// 1. FONCTION POUR LES PNJ FIXES ET ASSIS (Avec le paramètre 'y' ajouté !)
export function loadAnimatedNPC(scene, mixers, modelPath, x, y, z, targetX, targetZ, scale = 1.0) {
    const loader = new GLTFLoader();
    loader.load(modelPath, (gltf) => {
        const model = gltf.scene;
        model.scale.set(scale, scale, scale);
        
        // C'est ici que le 'y' est utilisé pour l'altitude
        model.position.set(x, y, z); 
        model.lookAt(targetX, model.position.y, targetZ);

        model.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
        scene.add(model);

        if (gltf.animations && gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(model);
            const action = mixer.clipAction(gltf.animations[0]);
            action.play();
            mixers.push(mixer);
        }
    });
}

// 2. FONCTION POUR LE PNJ QUI MARCHE
export function loadPatrollingNPC(scene, mixers, movingNPCs, walkModelPath, idleModelPath, waypoints, scale = 1.0) {
    const loader = new GLTFLoader();
    
    loader.load(walkModelPath, (walkGltf) => {
        const model = walkGltf.scene;
        model.scale.set(scale, scale, scale);
        model.position.copy(waypoints[0]);

        model.traverse((node) => {
            if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; }
        });
        scene.add(model);

        const mixer = new THREE.AnimationMixer(model);
        mixers.push(mixer);

        const walkClip = walkGltf.animations[0];
        const walkAction = mixer.clipAction(walkClip);
        walkAction.play();

        let currentAction = walkAction;
        let idleAction = null;

        loader.load(idleModelPath, (idleGltf) => {
            if (idleGltf.animations && idleGltf.animations.length > 0) {
                const idleClip = idleGltf.animations[0].clone();
                const walkTrackName = walkClip.tracks[0].name;
                const prefix = walkTrackName.indexOf('mixamorig') !== -1 ? walkTrackName.substring(0, walkTrackName.indexOf('mixamorig')) : '';

                idleClip.tracks.forEach(track => {
                    track.name = track.name.replace(/^.*mixamorig/, prefix + 'mixamorig');
                });

                idleAction = mixer.clipAction(idleClip);
            }

            let currentWaypointIndex = 1;
            const speed = 0.6; 
            let isWaiting = false;
            let waitTimer = 0;
            const waitDuration = 4.0;

            const update = (delta) => {
                if (isWaiting) {
                    waitTimer += delta;
                    if (waitTimer >= waitDuration) {
                        isWaiting = false;
                        waitTimer = 0;
                        currentWaypointIndex = (currentWaypointIndex + 1) % waypoints.length;

                        if (walkAction && idleAction) {
                            walkAction.reset();
                            walkAction.setEffectiveWeight(1);
                            currentAction.crossFadeTo(walkAction, 0.5, true);
                            walkAction.play();
                            currentAction = walkAction;
                        }
                    }
                } else {
                    const target = waypoints[currentWaypointIndex];
                    const direction = new THREE.Vector3().subVectors(target, model.position);
                    direction.y = 0;
                    const distance = direction.length();

                    if (distance < 0.1) {
                        isWaiting = true;
                        if (idleAction && walkAction) {
                            idleAction.reset();
                            idleAction.setEffectiveWeight(1);
                            currentAction.crossFadeTo(idleAction, 0.5, true);
                            idleAction.play();
                            currentAction = idleAction;
                        }
                        model.lookAt(model.position.x * 2, model.position.y, model.position.z * 2);
                    } else {
                        direction.normalize();
                        model.position.addScaledVector(direction, speed * delta);
                        const lookTarget = new THREE.Vector3(model.position.x + direction.x, model.position.y, model.position.z + direction.z);
                        model.lookAt(lookTarget);
                    }
                }
            };
            movingNPCs.push({ update });
        });
    });
}