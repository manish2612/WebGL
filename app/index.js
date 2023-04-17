import { Renderer, Camera, Transform, Plane, Flowmap, Vec2, Post } from 'ogl'
import NormalizeWheel from 'normalize-wheel'

import debounce from 'lodash/debounce'
import fragment from './shaders/flow-fragment.glsl'

import Image1 from './images/sky.jpg'
import Media from './Media'

export default class App {
  constructor () {
    document.documentElement.classList.remove('no-js')

    this.lastTime;
    this.lastMouse = new Vec2();
    this.mouse = new Vec2(-1);
    this.velocity = new Vec2();
    this.aspect=1
    this.resolution = {
        value: new Vec2()
    };

    this.createRenderer()
    this.createCamera()
    this.createScene()
    this.createFlowmap()
    this.onResize()

    this.createGeometry()
    this.createMedias()
    this.update()

    this.addEventListeners()

    this.createPreloader()
  }

  createPreloader () {
    if(this.mediasImages){
      Array.from(this.mediasImages).forEach(({ image: source }) => {
        const image = new Image()
  
        this.loaded = 0
  
        image.src = source
        image.onload = _ => {
          this.loaded += 1
  
          if (this.loaded === this.mediasImages.length) {
            document.documentElement.classList.remove('loading')
            document.documentElement.classList.add('loaded')
          }
        }
      })
    }
  }

  createRenderer () {
    this.renderer = new Renderer()

    this.gl = this.renderer.gl
    this.gl.clearColor(0.10196, 0.10196, 0.10980, 1.0)

    document.body.appendChild(this.gl.canvas)
  }

  createFlowmap(){
    this.flowmap = new Flowmap(this.gl, { falloff: 0.15, dissipation: 0.88});
    this.post = new Post(this.gl);
    this.program = this.post.addPass({
        fragment: "precision highp float;\n#define GLSLIFY 1\n\nuniform sampler2D tMap;\nuniform sampler2D tFlow;\n\nvarying vec2 vUv;\n\nvoid main() {\n  vec3 flow = texture2D(tFlow, vUv).rgb;\n\n  vec2 uv = vUv;\n\n  uv -= flow.xy * (0.15 * 0.5);\n\n  vec4 color = texture2D(tMap, uv);\n\n  gl_FragColor = color;\n}\n",
        uniforms: {
          uResolution: this.resolution,
          tFlow: this.flowmap.uniform,
          uTime: { value : 0 }
        },
    });
  }

  createCamera () {
    this.camera = new Camera(this.gl)
    this.camera.fov = 45
    this.camera.position.z = 20
  }

  createScene () {
    this.scene = new Transform()
  }

  createGeometry () {
    this.planeGeometry = new Plane(this.gl, {
      heightSegments: 50,
      widthSegments: 100
    })
  }

  createMedias () {
    this.mediasImages = [
      { image: Image1, text: 'New Synagogue' }
    ]

    this.medias = this.mediasImages.map(({ image, text }, index) => {
      const media = new Media({
        geometry: this.planeGeometry,
        gl: this.gl,
        image,
        index,
        length: this.mediasImages.length,
        renderer: this.renderer,
        scene: this.scene,
        screen: this.screen,
        text,
        viewport: this.viewport
      })

      return media
    })
  }

  /**
   * Resize.
   */
  onResize () {
    this.screen = {
      height: window.innerHeight,
      width: window.innerWidth
    }
    this.resolution.value.set(this.screen.width, this.screen.height);
    this.renderer.setSize(this.screen.width, this.screen.height)

    this.camera.perspective({
      aspect: this.gl.canvas.width / this.gl.canvas.height
    })

    const fov = this.camera.fov * (Math.PI / 180)
    const height = 2 * Math.tan(fov / 2) * this.camera.position.z
    const width = height * this.camera.aspect

    this.viewport = {
      height,
      width
    }
    if(this.post){
        this.post.resize();
    }
    if (this.medias) {
      this.medias.forEach(media => media.onResize({
        screen: this.screen,
        viewport: this.viewport
      }))
    }
  }

  /**
   * Update
   */
  update (t) {

    if (!this.velocity.needsUpdate) {
        this.mouse.set(-1);
        this.velocity.set(0);
    }
    this.velocity.needsUpdate = false;

    if(this.flowmap){
        // Update flowmap inputs
        this.flowmap.aspect = this.aspect;
        this.flowmap.mouse.copy(this.mouse);
        // Ease velocity input, slower when fading out
        this.flowmap.velocity.lerp(this.velocity, 0.1);
        this.flowmap.update();
    }
    if (this.medias) {
      this.medias.forEach(media => media.update(t))
    }

    if(this.post){
      this.post.render({
        scene: this.scene,
        camera: this.camera
      })
    }else{
      this.renderer.render({
        scene: this.scene,
        camera: this.camera
      })
    }

    window.requestAnimationFrame(this.update.bind(this))
  }
  updateMouse(e){
    if (e.changedTouches && e.changedTouches.length) {
        e.x = e.changedTouches[0].pageX;
        e.y = e.changedTouches[0].pageY;
    }
    if (e.x === undefined) {
        e.x = e.pageX;
        e.y = e.pageY;
    }
    this.mouse.set(e.x / this.gl.renderer.width, 1.0 - e.y / this.gl.renderer.height);
    // Calculate velocity
    if (!this.lastTime) {
        // First frame
        this.lastTime = performance.now();
        this.lastMouse.set(e.x, e.y);
    }
    const deltaX = e.x - this.lastMouse.x;
    const deltaY = e.y - this.lastMouse.y;

    this.lastMouse.set(e.x, e.y);

    let time = performance.now();

    // Avoid dividing by 0
    let delta = Math.max(14, time - this.lastTime);
    this.lastTime = time;

    this.velocity.x = deltaX / delta;
    this.velocity.y = deltaY / delta;

    // Flag update to prevent hanging velocity values when not moving
    this.velocity.needsUpdate = true;
  }

  /**
   * Listeners.
   */
  addEventListeners () {
    window.addEventListener('resize', this.onResize.bind(this))

    const isTouchCapable = 'ontouchstart' in window;
    if (isTouchCapable) {
        window.addEventListener('touchstart', this.updateMouse.bind(this));
        window.addEventListener('touchmove', this.updateMouse.bind(this));
    } else {
        window.addEventListener('mousemove', this.updateMouse.bind(this));
    }
  }
}

new App()
