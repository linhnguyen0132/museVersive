export function animateScream(objects, time) {
    // FIGURE
    const figure = objects.figure

    // respiration
    figure.scale.y =
        1 + Math.sin(time * 3) * 0.02

    // vibration anxieuse
    figure.position.x =
        Math.sin(time * 20) * 0.02

    // légère rotation
    figure.rotation.z =
        Math.sin(time * 2) * 0.01

    
}