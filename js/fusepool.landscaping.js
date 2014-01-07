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
    /// When set a redraw occurs next timer event
    update: true,
    debugRenderParticlesOnly: false,
    debugFullBlast: true, // if set ignore this.update
    /**
     * Initialize the Landscape component.
     *
     * The node found using the given selector will be the container where
     * the landscape will be added to.
     *
     * @param selector
     * @author: Daniël van Adrichem <daniel@treparel.com>
     */
    initialize: function (selector) {
        var thisLandscaping = this;

        // for debug purposes
        $("#landscape-render-button").on("click", function () {
            thisLandscaping.renderAll();
        });

        $( document ).ready(function () {
            thisLandscaping.$container = $(selector);
            console.info("Initializing FusePool.Landscaping: " + thisLandscaping.$container);
            var canvasElement = thisLandscaping.initThree(
                thisLandscaping.$container.width(),
                thisLandscaping.$container.height()
            );
            thisLandscaping.$canvas = $(canvasElement);
            thisLandscaping.$container.append(canvasElement);

            thisLandscaping.initMouseHandlers();

            console.info("Initializing FusePool.Landscaping Done (" +
                thisLandscaping.$canvas.width() + "x" + thisLandscaping.$canvas.height() + ")");

            thisLandscaping.renderAll();
        });
    }
};

/**
 * Initialize mouse event handlers
 *
 * @author: Daniël van Adrichem <daniel@treparel.com>
 */
FusePool.Landscaping.initMouseHandlers = function () {
    var thisLandscaping = this;
    this.$canvas.on("click", function () {
        thisLandscaping.update = true;
    });
};

FusePool.Landscaping.renderAll = function () {
    // only render when this bool is set
    if (this.update || this.debugFullBlast) {
        console.info("Landscape redraw");
        // reset update bool
        this.update = false;

        // update size of dots
        this.scene.children[0].material.size = this.radius;

        if (this.debugRenderParticlesOnly) {
            this.renderer.render(this.scene, this.camera);
        } else {
            // firstly render the scene containing the dots particle system to
            // the this.rtTexturePing render target and force clear (the true param)
            this.renderer.render(this.scene, this.camera, this.rtTexturePing, true);
            // next render the scene with a quad and shader having source rtTexturePing
            // this applies horizontal convolution the output is rendered to
            // this.rtTexturePong
            this.renderer.render(this.scenePing, this.camera, this.rtTexturePong, true);
            // finally render the scene consisting of a quad and its shader does
            // vertical convolution with rtTexturePong as source and no render
            // target, so output on canvas.
            this.renderer.render(this.scenePong, this.camera);
        }
    }
    window.requestAnimationFrame(FusePool.Landscaping.renderAll);
};

/**
 * Initialize all web GL components using THREE.js.
 *
 * @param width
 * @param height
 * @author: Daniël van Adrichem <daniel@treparel.com>
 */
FusePool.Landscaping.initThree = function (width, height) {
    // we will be adding the canvas to $container. The size of this
    // container determines the size of the canvas.
    
    // one over size
    var h = 1.0 / width;
    var v = 1.0 / height;

    // the main scene
    this.scene = new THREE.Scene();
    // two scenes used to apply convolution fragment shader
    this.scenePing = new THREE.Scene();
    this.scenePong = new THREE.Scene();

    // the main view port
    // origin in center of $container, params are:
    // left right top bottom
    this.camera = new THREE.OrthographicCamera(
        -1, 1, // l r
        1, -1, // t b
        -1, 1);
    this.camera.position.z = 0;

    // texture filtering options
    // bi-linear filtering and no mip maps
    var tex_options = {
        magFilter: THREE.NearestFilter,
        minFilter: THREE.NearestFilter,
        generateMipmaps: false
    };

    // two render targets on which we will do multiple convolutions filters
    // back and forth.
    this.rtTexturePing = new THREE.WebGLRenderTarget(
        width, height, tex_options);
    this.rtTexturePong = new THREE.WebGLRenderTarget(
        width, height, tex_options);

    // density texture map
    // this is a 1d colormap to represent the density color on the background
    var dmap = THREE.ImageUtils.loadTexture("img/dmap.png");


    // horizontal convolution shader uniforms
    this.uniformsH = {
        sigma: { type: "f", value: 1 },
        src_tex: { type: "t", value: this.rtTexturePing },
        pixelSize: { type: "v2", value: new THREE.Vector2(h, v)}
    };
    // horizontal convolution shader itself
    var shaderMaterialPing = new THREE.ShaderMaterial({
        depthTest: false,
        uniforms: this.uniformsH,
        vertexShader: FusePool.Landscaping.Shaders.vertexShader,
        fragmentShader: FusePool.Landscaping.Shaders.fragmentShaderH
    });


    // vertical convolution shader uniforms
    this.uniformsV = {
        sigma: { type: "f", value: 1 },
        src_tex: { type: "t", value: this.rtTexturePong },
        dmap_tex: { type: "t", value: dmap },
        pixelSize: { type: "v2", value: new THREE.Vector2(h, v)}
    };
    // vertical convolution shader itself
    var shaderMaterialPong = new THREE.ShaderMaterial({
        depthTest: false,
        uniforms: this.uniformsV,
        vertexShader: FusePool.Landscaping.Shaders.vertexShader,
        fragmentShader: FusePool.Landscaping.Shaders.fragmentShaderV
    });

    // jsondata defined in jsondata.js, this is test data
    this.datapointsCount = jsondata.rows.length;

    // geometry mesh data, allocate float arrays for
    // both color (rgb) and positions (xyz)
    var geometry = new THREE.BufferGeometry();
    //this.geometry = geometry;
    geometry.attributes = {
        position: {
            itemSize: 3,
            array: new Float32Array(this.datapointsCount * 3),
            numItems: this.datapointsCount * 3
        },
        color: {
            itemSize: 3,
            array: new Float32Array(this.datapointsCount * 3),
            numItems: this.datapointsCount * 3
        }
    };

    // for convenience
    var positions = geometry.attributes.position.array;
    var colors = geometry.attributes.color.array;

    // loop all dataPoints
    for (var i = 0; i < this.datapointsCount; i++) {
        // stride of 3 (xyz)
        var pos = 3 * i;

        // load positions from jsondata and translate them
        // positions in json data must not exceed 0..1 for both x and y
        positions[pos] = (jsondata.rows[i].PX)-0.5;
        positions[pos + 1] = (jsondata.rows[i].PY)-0.5;
        positions[pos + 2] = 0;

        // load colors, init on red
        colors[pos] = 1;
        colors[pos + 1] = 0;
        colors[pos + 2] = 0;
    }
    // THREE bounds calculation
    geometry.computeBoundingSphere();

    // load dot.png
    this.sprite = THREE.ImageUtils.loadTexture("img/dot.png");
    // size of the dot
    this.radius = 10;
    // material used for dot rendering
    var material = new THREE.ParticleBasicMaterial({
        depthTest: false,
        size: this.radius,
//        map: this.sprite,
        sizeAttenuation: false,
        transparent: true,
        vertexColors: true
    });

    // add particle system to the main scene
    this.particleSystem = new THREE.ParticleSystem(geometry, material);
    this.scene.add(this.particleSystem);

    // plane geometry used to render fullscreen using convolution shader
    var plane = new THREE.PlaneGeometry(width, height);
    // for both shaders we add a full screen quad
    var quadPing = new THREE.Mesh(plane, shaderMaterialPing);
    var quadPong = new THREE.Mesh(plane, shaderMaterialPong);
    // add geometry to both scenes
    this.scenePing.add(quadPing);
    this.scenePong.add(quadPong);

    // initialize the renderer
    this.renderer = new THREE.WebGLRenderer({
        antialias: false,
        clearAlpha: 0,
        clearColor: 0x000000,
        alpha: true
    });
    // resize
    this.renderer.setSize(width, height);

    // return the canvas
    return this.renderer.domElement;
};


/**
 * Namespace to keep all shader code.
 *
 * @author: Daniël van Adrichem <daniel@treparel.com>
 */
FusePool.Landscaping.Shaders = {
    // screen aligned quad
    vertexShader: [
        "varying vec2 pixel;",
        "",
        "void main(void) {",
        //"    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
        "    gl_Position = sign( vec4(position, 1.0) );",
        // pixel will be in range 0..1
        "    pixel = (vec2( gl_Position.x, -gl_Position.y ) + vec2( 1.0 ) ) / vec2( 2.0 );",
        "}"
    ].join('\n'),
    
    fragmentShaderH: [
        "uniform sampler2D src_tex;",
        "uniform vec2 pixelSize;",
        "uniform float sigma;",
        "",
        "varying vec2 pixel;",
        "",
        "void main(void) {",
        "    float h = sigma * pixelSize.x;",
        "    vec4 sum = vec4(0.0);",
        "",
        "    sum += texture2D(src_tex, vec2(pixel.x - 9.0*h, pixel.y) ) * 0.008074244714835564;",
        "    sum += texture2D(src_tex, vec2(pixel.x - 8.0*h, pixel.y) ) * 0.01373475292908177;",
        "    sum += texture2D(src_tex, vec2(pixel.x - 7.0*h, pixel.y) ) * 0.02194807268686863;",
        "    sum += texture2D(src_tex, vec2(pixel.x - 6.0*h, pixel.y) ) * 0.032947959470316014;",
        "    sum += texture2D(src_tex, vec2(pixel.x - 5.0*h, pixel.y) ) * 0.0464640702427165;",
        "    sum += texture2D(src_tex, vec2(pixel.x - 4.0*h, pixel.y) ) * 0.06155489208605796;",
        "    sum += texture2D(src_tex, vec2(pixel.x - 3.0*h, pixel.y) ) * 0.07660630093247092;",
        "    sum += texture2D(src_tex, vec2(pixel.x - 2.0*h, pixel.y) ) * 0.08956183951296363;",
        "    sum += texture2D(src_tex, vec2(pixel.x - 1.0*h, pixel.y) ) * 0.09836443747572207;",
        "    sum += texture2D(src_tex, vec2(pixel.x + 0.0*h, pixel.y) ) * 0.10148685989793388;",
        "    sum += texture2D(src_tex, vec2(pixel.x + 1.0*h, pixel.y) ) * 0.09836443747572207;",
        "    sum += texture2D(src_tex, vec2(pixel.x + 2.0*h, pixel.y) ) * 0.08956183951296363;",
        "    sum += texture2D(src_tex, vec2(pixel.x + 3.0*h, pixel.y) ) * 0.07660630093247092;",
        "    sum += texture2D(src_tex, vec2(pixel.x + 4.0*h, pixel.y) ) * 0.06155489208605796;",
        "    sum += texture2D(src_tex, vec2(pixel.x + 5.0*h, pixel.y) ) * 0.0464640702427165;",
        "    sum += texture2D(src_tex, vec2(pixel.x + 6.0*h, pixel.y) ) * 0.032947959470316014;",
        "    sum += texture2D(src_tex, vec2(pixel.x + 7.0*h, pixel.y) ) * 0.02194807268686863;",
        "    sum += texture2D(src_tex, vec2(pixel.x + 8.0*h, pixel.y) ) * 0.01373475292908177;",
        "    sum += texture2D(src_tex, vec2(pixel.x + 9.0*h, pixel.y) ) * 0.008074244714835564;",
        "",
        "    gl_FragColor = sum;",
        //"    gl_FragColor = vec4(pixel, 0, 1);",
        "}"
    ].join('\n'),

    fragmentShaderV: [
        "uniform sampler2D src_tex;",
        "uniform sampler2D dmap_tex;",
        "uniform vec2 pixelSize;",
        "uniform float sigma;",
        "",
        "varying vec2 pixel;",
        "",
        "void main(void) {",
        "",
        "    float v = sigma * pixelSize.y;",
        "    vec4 sum = vec4(0.0);",
        "",
        "    sum += texture2D(src_tex, vec2(pixel.x, - 9.0*v + pixel.y) ) * 0.008074244714835564;",
        "    sum += texture2D(src_tex, vec2(pixel.x, - 8.0*v + pixel.y) ) * 0.01373475292908177;",
        "    sum += texture2D(src_tex, vec2(pixel.x, - 7.0*v + pixel.y) ) * 0.02194807268686863;",
        "    sum += texture2D(src_tex, vec2(pixel.x, - 6.0*v + pixel.y) ) * 0.032947959470316014;",
        "    sum += texture2D(src_tex, vec2(pixel.x, - 5.0*v + pixel.y) ) * 0.0464640702427165;",
        "    sum += texture2D(src_tex, vec2(pixel.x, - 4.0*v + pixel.y) ) * 0.06155489208605796;",
        "    sum += texture2D(src_tex, vec2(pixel.x, - 3.0*v + pixel.y) ) * 0.07660630093247092;",
        "    sum += texture2D(src_tex, vec2(pixel.x, - 2.0*v + pixel.y) ) * 0.08956183951296363;",
        "    sum += texture2D(src_tex, vec2(pixel.x, - 1.0*v + pixel.y) ) * 0.09836443747572207;",
        "    sum += texture2D(src_tex, vec2(pixel.x, + 0.0*v + pixel.y) ) * 0.10148685989793388;",
        "    sum += texture2D(src_tex, vec2(pixel.x, + 1.0*v + pixel.y) ) * 0.09836443747572207;",
        "    sum += texture2D(src_tex, vec2(pixel.x, + 2.0*v + pixel.y) ) * 0.08956183951296363;",
        "    sum += texture2D(src_tex, vec2(pixel.x, + 3.0*v + pixel.y) ) * 0.07660630093247092;",
        "    sum += texture2D(src_tex, vec2(pixel.x, + 4.0*v + pixel.y) ) * 0.06155489208605796;",
        "    sum += texture2D(src_tex, vec2(pixel.x, + 5.0*v + pixel.y) ) * 0.0464640702427165;",
        "    sum += texture2D(src_tex, vec2(pixel.x, + 6.0*v + pixel.y) ) * 0.032947959470316014;",
        "    sum += texture2D(src_tex, vec2(pixel.x, + 7.0*v + pixel.y) ) * 0.02194807268686863;",
        "    sum += texture2D(src_tex, vec2(pixel.x, + 8.0*v + pixel.y) ) * 0.01373475292908177;",
        "    sum += texture2D(src_tex, vec2(pixel.x, + 9.0*v + pixel.y) ) * 0.008074244714835564;",
        "",
        "    //sum = vec4(0.6);",
        "    gl_FragColor = /*vec4(pixel * vec2(0.6), 0, 0.1) + */texture2D(dmap_tex, vec2(sum.r, 1));",
        "    gl_FragColor.a = 1.0;",
        "}"
    ].join('\n')
};