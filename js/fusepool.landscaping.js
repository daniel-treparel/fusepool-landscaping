/* JSlint hints: */
/*globals _,$ */
var _, $, THREE, FusePool;

/**
 * FusePool namespace.
 *
 * This is the global namespace under which we place the Landscaping part. If
 * FusePool is not yet defined (or otherwise evaluated to false) we will make
 * a new empty object.
 *
 * @type {*|{}}
 * @author: Daniël van Adrichem <daniel@treparel.com>
 */
FusePool = FusePool || {};

/**
 * FusePool.Landscaping namespace.
 *
 * It is the API to and contains all code regarding the client side landscaping
 * visualization support.
 *
 * It is assumed that jQuery is available when this script is included.
 *
 * @type {{}}
 * @author: Daniël van Adrichem <daniel@treparel.com>
 */
FusePool.Landscaping = {
    /**
     * Initialize the Landscape component.
     *
     * The node found using the given selector will be the container where the landscape
     * will be added to.
     *
     * @param selector
     * @author: Daniël van Adrichem <daniel@treparel.com>
     */
    initialize: function (selector) {
        this.$container = $(selector);
        console.info("Initializing FusePool.Landscaping on " + this.$container);
    }
}

FusePool.Landscaping.initThree = function () {
    var h = 1.0 / window.innerWidth;
    var v = 1.0 / window.innerHeight;

    this.scene = new THREE.Scene();
    this.scenePing = new THREE.Scene();
    this.scenePong = new THREE.Scene();

    this.camera = new THREE.OrthographicCamera(
        window.innerWidth / -2, window.innerWidth / 2,
        window.innerHeight / 2, window.innerHeight / -2,
        -1, 1);
    this.camera.position.z = 0;

    var tex_options = {
        magFilter: THREE.LinearFilter,
        minFilter: THREE.LinearFilter,
        generateMipmaps: false
    };
    this.rtTexturePing = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, tex_options);
    this.rtTexturePong = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, tex_options);

    // density map
    var dmap = THREE.ImageUtils.loadTexture("img/dmap.png");
    this.uniformsH = {
        sigma: { type: "f", value: 1 },
        src_tex: { type: "t", value: this.rtTexturePing },
        pixelSize: { type: "v2", value: new THREE.Vector2(h, v)}
    };
    var shaderMaterialPing = new THREE.ShaderMaterial({
        uniforms: this.uniformsH,
        vertexShader: document.getElementById('vertexshader').textContent,
        fragmentShader: document.getElementById('fragmentshaderH').textContent

    });
    this.uniformsV = {
        sigma: { type: "f", value: 1 },
        src_tex: { type: "t", value: this.rtTexturePong },
        dmap_tex: { type: "t", value: dmap },
        pixelSize: { type: "v2", value: new THREE.Vector2(h, v)}
    };
    var shaderMaterialPong = new THREE.ShaderMaterial({
        uniforms: this.uniformsV,
        vertexShader: document.getElementById('vertexshader').textContent,
        fragmentShader: document.getElementById('fragmentshaderV').textContent

    });

    this.radius = 10;
    // jsondate defines in jsondata.js, this is test data
    this.particles = jsondata.rows.length;

    var geometry = new THREE.BufferGeometry();
    geometry.attributes = {

        position: {
            itemSize: 3,
            array: new Float32Array(this.particles * 3),
            numItems: this.particles * 3
        },
        color: {
            itemSize: 3,
            array: new Float32Array(this.particles * 3),
            numItems: this.particles * 3
        }

    };

    var positions = geometry.attributes.position.array;
    var colors = geometry.attributes.color.array;

    for (var i = 0; i < this.particles; i++) {

        var pos = 3 * i;

        // positions

        positions[pos] = ((0.15 + jsondata.rows[i].PX) * window.innerHeight) - (window.innerHeight / 2);
        positions[pos + 1] = ((-0.2 + jsondata.rows[i].PY) * window.innerHeight) - (window.innerHeight / 2);
        positions[pos + 2] = 0;

        // colors

        colors[pos] = 1;
        colors[pos + 1] = 0;
        colors[pos + 2] = 0;

    }

    geometry.computeBoundingSphere();

    this.sprite = THREE.ImageUtils.loadTexture("img/dot.png");

    var material = new THREE.ParticleBasicMaterial({
        size: this.radius,
        map: sprite,
        sizeAttenuation: false,
        transparent: true,
        vertexColors: true
    });

    this.particleSystem = new THREE.ParticleSystem(geometry, material);
    this.scene.add(this.particleSystem);

    var plane = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight);
    var quadPing = new THREE.Mesh(plane, shaderMaterialPing);
    var quadPong = new THREE.Mesh(plane, shaderMaterialPong);
    this.scenePing.add(quadPing);
    this.scenePong.add(quadPong);

    this.renderer = new THREE.WebGLRenderer({
        antialias: false,
        clearAlpha: 0,
        alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.$container.append(renderer.domElement);

//        document.addEventListener('mousewheel', onMouseWheelHandler, false);
//        document.addEventListener('click', clickHandler, false);
};
