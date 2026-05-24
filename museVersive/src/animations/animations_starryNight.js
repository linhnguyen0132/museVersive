export function animateStarryNight(objects, time) {
    const { tree, bg } = objects

    if (tree && bg) {
        
        tree.rotation.z = Math.sin(time * 1.5) * 0.02

        
        tree.rotation.y = Math.cos(time * 8.0) * 0.005

        
        bg.position.x = Math.sin(time * 0.5) * 0.02
    }
}