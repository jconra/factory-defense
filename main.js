import * as THREE from 'three'; 
import { OrbitControls } from 'controls';
import { default as Stats } from 'stats';
import { SVGLoader } from 'svg';
import { Map } from 'map';

const clickable = [];

const levels = {waterNum:0.1868, sandyNum:0.1276, grassNum:0.3164, rockyNum:0.2576, range:0.05};
const build = {numOfContinents:90, sizeOfContinents:100, heightChance:50, irregularShape:28, height: 7};

let width = window.innerWidth;
let height = window.innerHeight;
const stats = new Stats();
stats.domElement.style.position = "fixed";
document.body.appendChild( stats.domElement );

// Create a renderer and add it to the DOM.
let renderer = new THREE.WebGLRenderer();
renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);
// Create the scene 
let scene = new THREE.Scene();
// Create a camera
let camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
camera.position.z = 150;

scene.add(camera);

// Create a light, set its position, and add it to the scene.
const pointLight = new THREE.DirectionalLight(0xffffff, 1);
pointLight.position.set(0.5,2,1);
//scene.add(pointLight);

const ambLight = new THREE.AmbientLight( 0xffffff, 1 ); // soft white light (old is 0.03)
scene.add( ambLight );

const oceanTexture = new THREE.TextureLoader().load( 'images/dark_sand.jpg' );
oceanTexture.wrapS = oceanTexture.wrapT = THREE.RepeatWrapping; 
	
const sandyTexture = new THREE.TextureLoader().load( 'images/light_sand.jpg' );
sandyTexture.wrapS = sandyTexture.wrapT = THREE.RepeatWrapping; 
	
const grassTexture = new THREE.TextureLoader().load( 'images/grass.jpg' );
grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping; 
	
const rockyTexture = new THREE.TextureLoader().load( 'images/grass2.jpg' );
rockyTexture.wrapS = rockyTexture.wrapT = THREE.RepeatWrapping; 

const world_geo = new THREE.IcosahedronGeometry(50, 20);

const ocean_mat = new THREE.MeshPhongMaterial( {color: 0x049ef4, specular: 0xe4cece, transparent: true, opacity: 0.5});
const ocean = new THREE.Mesh( world_geo.clone(), ocean_mat );
ocean.scale.multiplyScalar(1.01);
scene.add(ocean);

generate_map(world_geo);
const world_ma = new THREE.MeshPhongMaterial({ color: 0x00ff00 });

window.world_mat = new THREE.MeshStandardMaterial({
  onBeforeCompile: (shader) => {

    // storing a reference to the shader object
    window.world_mat.userData.shader = shader;

    shader.vertexShader = shader.vertexShader.replace(`#include <displacementmap_pars_vertex>`,
    `#include <displacementmap_pars_vertex>
     uniform float bumpScale;
     varying vec2 vUV;
     varying float vAmount;`);
    shader.vertexShader = shader.vertexShader.replace(`#include <fog_vertex>`,
    `#include <fog_vertex>
     vUV = uv;
     vAmount = (length( position ) - 50.0) * 0.3+ 0.1;
     `);
    shader.fragmentShader = shader.fragmentShader.replace(`#include <color_pars_fragment>`,
    `#include <color_pars_fragment>
     uniform sampler2D oceanTexture, sandyTexture, grassTexture, rockyTexture, mapTexture;
     varying vec2 vUV;
     varying float vAmount;
     uniform float waterNum, sandyNum, grassNum, rockyNum, range;
     `);

    shader.fragmentShader = shader.fragmentShader.replace(`#include <color_fragment>`,
    `#include <color_fragment>
     float dark = waterNum;
     float sand = sandyNum + dark;
     float gras = grassNum + sand;
     float rock =  gras;

     dark = smoothstep(dark - range, dark + range, vAmount);
     sand = smoothstep(sand - range, sand + range, vAmount);
     gras = smoothstep(gras - range, gras + range, vAmount);
     rock = smoothstep(rock - range, rock + range, vAmount);

     vec4 water = (1.0 - dark) * texture2D( oceanTexture, vUV * 100.0 );
     vec4 sandy = (dark - sand) * texture2D( sandyTexture, vUV * 100.0 );
     vec4 grass = (sand - gras) * texture2D( grassTexture, vUV * 200.0 );
     vec4 rocky = rock * texture2D( rockyTexture, vUV * 200.0 );

     diffuseColor = vec4(0.0, 0.0, 0.0, 1.0) + water + sandy + grass + rocky;
     `);

    shader.uniforms.oceanTexture = {value: oceanTexture};
    shader.uniforms.sandyTexture = {value: sandyTexture};
    shader.uniforms.grassTexture = {value: grassTexture};
    shader.uniforms.rockyTexture = {value: rockyTexture};
    shader.uniforms.waterNum = {value: 0.2};
    shader.uniforms.sandyNum = {value: 0.2};
    shader.uniforms.grassNum = {value: 0.2};
    shader.uniforms.rockyNum = {value: 0.2};
    shader.uniforms.range = {value: 0.05};
  }
});

const world = new THREE.Mesh( world_geo, world_mat );
scene.add( world );

function rd(n) {return Math.round(n*10000)};

function generate_map(geo) {
  const points = geo.attributes.position.array;
  const normals = geo.attributes.normal.array;
  const lookup = create_lookup(geo);
  for (let i=0; i<build.numOfContinents; i++) {
    let closed = [];
    let rand_num = Math.floor((points.length / 3) * Math.random())*3;
    let open = [get_key(rand_num, points)];
    let center = open[0];
    let key = open[0];
    for (let j=0; j<build.sizeOfContinents; j++) {
      let neighbors = find_neighbors(key, lookup, points);
      let new_key = raise_point(key, lookup, points, normals, j);
      for (let n of neighbors) {
        if (closed.indexOf(n) > -1 || open.indexOf(n) > -1) continue;
          open.push(n);
      }
      closed.push(new_key);
      open.splice(open.indexOf(key),1);
      key = get_closest(center, open);
      if (Math.random()>(100-build.irregularShape/2)/100) center = new_key;
      if (Math.random()>(100-build.heightChance/10)/100) closed = [];
    }
  }
}

function get_closest(key, open) {
  let best = 0
  let dist = distance(open[0], key);
  for( let i=1; i<open.length; i++) {
    let new_dist = distance(open[i], key)
    if (new_dist < dist) {best = i; dist = new_dist;}
  }
  return open[best];
}

function get_key(n, points) {
  return rd(points[n])+":"+rd(points[n+1])+":"+rd(points[n+2]);
}

function distance(key1, key2) {
  let p1 = key1.split(":"), p2 = key2.split(":");
  return Math.sqrt(Math.pow(p1[0]-p2[0],2) + 
         Math.pow(p1[1]-p2[1],2) + 
         Math.pow(p1[2]-p2[2],2));
}

function find_neighbors(key, lookup, points) {
  let neighbors = [];
  for (let vert of lookup[key]) {
    let face = Math.floor(vert/9)*9;
    for (let i=0; i<9; i+=3) {
      let n_key = get_key(face + i, points);
      if (neighbors.indexOf(n_key) < 0) neighbors.push(n_key);
    }
  }
  return neighbors;
}

function raise_point(key, lookup, points, normals, max) {
  let v = lookup[key][0];
  let len = get_length(points[v], points[v+1], points[v+2]);
  if (len > Math.sqrt(max)+50) {return key;}
  for (let vert of lookup[key]) {
    for (let k=0; k<3; k++) { 
         points[vert+k] += normals[vert+k]*build.height/30;
    }
  }
  let new_key = get_key(v, points);
  lookup[new_key] = lookup[key];
  delete lookup[key];
  return new_key;
}

function get_length(v1,v2,v3) {
  return Math.sqrt(Math.pow(v1,2) + Math.pow(v2,2) + Math.pow(v3,2));
}

function create_lookup(geo) {
  const points = geo.attributes.position.array;
  const uvs = geo.attributes.uv.array;
  let lookup = {};
  //Go through positions one face at a time (9 indices)
  for (let i=0; i<points.length; i+=9) {
    //Go through each vertex in the face
    for (let j=0; j<9; j+=3) {
      //Make a unique key to represent that vertex position
      //let key = rd(uvs[(i+j)*(2/3)])+":"+rd(uvs[(i+j)*(2/3)+1]);
      let key = get_key(i+j, points);
      //If the key already already exists, get it's index
      if (key in lookup) lookup[key].push(i+j);
      else lookup[key] = [i+j];
    }
  }
  return lookup;
}


// Add OrbitControls so that we can pan around with the mouse.
var controls = new OrbitControls(camera, renderer.domElement);

resize();
animate();
window.addEventListener('resize',resize);

function resize(){
  let w = window.innerWidth;
  let h = window.innerHeight;
  
  renderer.setSize(w,h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

//const build = {numOfContinents:20, sizeOfContinents:50, heightChance:2, irregularShape:10};
const gui = new lil.GUI();
const cameraFolder = gui.addFolder('Camera');
cameraFolder.add(camera.position, 'z', 110, 200);
const shaderFolder = gui.addFolder('Shader');
  shaderFolder.add(levels, 'waterNum', 0, 0.4);
  shaderFolder.add(levels, 'sandyNum', 0, 0.4);
  shaderFolder.add(levels, 'grassNum', 0, 0.4);
  shaderFolder.add(levels, 'rockyNum', 0, 0.4);
  shaderFolder.add(levels, 'range', 0, 0.2);
const buildFolder = gui.addFolder('WorldBuilder');
  buildFolder.add(build, 'numOfContinents', 1, 200);
  buildFolder.add(build, 'sizeOfContinents', 1, 200);
  buildFolder.add(build, 'heightChance', 0, 100);
  buildFolder.add(build, 'irregularShape', 0, 100);
  buildFolder.add(build, 'height', 1, 100);

buildFolder.onFinishChange( reset_geometry );

function reset_geometry() {
  let pos = world_geo.attributes.position.array;
  for (let i=0; i<pos.length; i+=3) {
    let len = get_length(pos[i], pos[i+1], pos[i+2]);
    pos[i] = pos[i]/len*50;
    pos[i+1] = pos[i+1]/len*50;
    pos[i+2] = pos[i+2]/len*50;
  }
  generate_map(world_geo);
  world_geo.attributes.position.needsUpdate = true;
}

// Renders the scene
function animate() {
  if ('shader' in window.world_mat.userData) {
    for (let i in levels) {
      window.world_mat.userData.shader.uniforms[i].value = levels[i];
    }
  }

  renderer.render( scene, camera );
  controls.update();
  stats.update();
  requestAnimationFrame( animate );
}
