import * as THREE from 'three';

const raycaster = new THREE.Raycaster();

class Controls {
  constructor( object, domElement, clickable ) {
    this.camera = object;
    this.domElement = domElement;
    this.clickable = clickable;
    this.mouse = {
      x: -1, 
      y: -1, 
      down: false,
      xD: -1,
      yD: -1
    }
    this.addEventListeners();
  }
  addEventListeners() {
    this.domElement.addEventListener('mousedown', (e) => this.mouseDown(e));
    this.domElement.addEventListener('mouseup', (e) => this.mouseUp(e));
    this.domElement.addEventListener('mousemove', (e) => this.mouseMove(e));
  }
  mouseDown(e) {
    this.mouse.down = true;
    this.mouse.xD = e.clientX;
    this.mouse.yD = e.clientY;
  }
  mouseUp(e) {
    this.mouse.down = false;
  }
  mouseMove(e) {
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;
  }
  update() {
    if (this.mouse.down) {
      let xChange = (this.mouse.xD - this.mouse.x) / 15;
      let yChange = (this.mouse.yD - this.mouse.y) / 15;
      this.mouse.xD = this.mouse.x;
      this.mouse.yD = this.mouse.y;
      let clicks = this.isClick();
      if (clicks.length > 0) {
        clicks[0].object.position.x -= xChange;
        clicks[0].object.position.y += yChange;
      } else {
        this.camera.position.x += xChange;
        this.camera.position.y -= yChange;
      }
    }
  }
  isClick() {
    const pointer = new THREE.Vector2(
      (this.mouse.x / window.innerWidth) * 2 - 1,
      -(this.mouse.y / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera( pointer, this.camera);
    console.log(pointer);
    return raycaster.intersectObjects( this.clickable );
  }
}

export { Controls };
