uniform sampler2D uTexture;
uniform float uTime;

varying vec2 vUv;

void main() {

    vec2 uv = vUv;

    uv.x +=
        sin(uv.y * 15.0 + uTime) * 0.01;

    uv.y +=
        cos(uv.x * 8.0 + uTime) * 0.005;

    gl_FragColor =
        texture2D(uTexture, uv);
}