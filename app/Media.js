import { Mesh, Program, Texture } from 'ogl'

import fragment from './shaders/image-fragment.glsl'
import vertex from './shaders/image-vertex.glsl'

import { map } from './utils/math'

export default class {
  constructor ({ geometry, gl, image, index, length, renderer, scene, screen, text, viewport }) {
    this.extra = 0

    this.geometry = geometry
    this.gl = gl
    this.image = image
    this.index = index
    this.length = length
    this.renderer = renderer
    this.scene = scene
    this.screen = screen
    this.text = text
    this.viewport = viewport

    this.createShader()
    this.createMesh()

    this.onResize()
  }

  createShader () {
    const texture = new Texture(this.gl, {
      generateMipmaps: false
    })

    this.program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      fragment,
      vertex,
      uniforms: {
        tMap: { value: texture },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [0, 0] },
        uViewportSizes: { value: [this.viewport.width, this.viewport.height] },
        uSpeed: { value: 0 },
        uTime: { value: 0 } //100 * Math.random()
      },
      transparent: true
    })

    const image = new Image()

    image.src = this.image
    image.onload = _ => {
      texture.image = image

      this.program.uniforms.uImageSizes.value = [image.naturalWidth, image.naturalHeight]
    }
  }

  createMesh () {
    this.plane = new Mesh(this.gl, {
      geometry: this.geometry,
      program: this.program
    })

    this.plane.setParent(this.scene)
  }

  update (scroll) {
    this.speed = 0 //0.5

    this.program.uniforms.uTime.value += 0 //0.025
    this.program.uniforms.uSpeed.value = this.speed
  }

  /**
   * Events.
   */
  onResize ({ screen, viewport } = {}) {
    if (screen) {
      this.screen = screen
    }

    if (viewport) {
      this.viewport = viewport

      this.plane.program.uniforms.uViewportSizes.value = [this.viewport.width, this.viewport.height]
    }

    this.scale = this.screen.height / 170

    this.plane.scale.y = this.viewport.height * (100 * this.scale) / this.screen.height
    this.plane.scale.x = this.viewport.width * (175 * this.scale) / this.screen.width

    this.plane.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y]
  }
}
