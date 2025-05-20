import * as THREE from 'three';

class Map {
  constructor(position) {
    this.model = new THREE.Group();
    this.body = this.hexagon();
    this.body.rotateX(Math.PI/2);
    this.body.position.copy(position);
    this.model.add(this.body);
  }
  hexagon() {
    let geometry = new THREE.CylinderGeometry( 5, 5, 3, 6 ); 
    let material = new THREE.MeshPhongMaterial( {color: 0x00ff00} ); 
    return new THREE.Mesh( geometry, material );
  }
}

export { Map };
