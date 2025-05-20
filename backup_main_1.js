import * as THREE from 'three'; 
import { OrbitControls } from 'controls';
import { default as Stats } from 'stats';
import { SVGLoader } from 'svg';
import { Map } from 'map';

const clickable = [];

const levels = {waterNum:0.1984, sandyNum:0.0704, grassNum:0.3164, rockyNum:0.2576, bumpScale:3.12};

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

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
const cw = canvas.width = 256;
const ch = canvas.height = 256;
const ctx = canvas.getContext('2d',{ willReadFrequently: true });

ctx.fillStyle="rgb(1,1,1)";
ctx.fillRect(0, 0, cw, ch);
/*
for (let i=0; i<256; i++) {
  let x = 256*Math.random()+21;
  let y = 240*Math.random();
  let r = 10*Math.random()+10;
  draw_circle(x, y, r);
  if (x > 236) draw_circle(x-256, y, r);
}
*/
let x = 14;
let RANGE_NUM = 15;
for (let i=0; i<RANGE_NUM; i++) {
  x += 256/RANGE_NUM*Math.random()*1.8;
  let y = 128*Math.random();
  console.log(y);
  //draw_range(x, y, 20, 100, Math.PI/4, 4);
  //draw_range(x, y+20, 5, 50, Math.PI/4, 3);
  let line = getRangeLine(10, Math.PI/4); 
  drawRange(line, x, y, 10);
  drawRange(line, x, y, 6);
  drawRange(line, x, y, 2);
}

function getRangeLine(PATH_LEN, MAX_A) {
  let line = [];
  //let ang = Math.PI -0.1 + Math.random()*0.2;
  for (let i=0; i<PATH_LEN; i++) {
    let len = 20*Math.random();
    let ang = Math.random()*1-0.5;
    line.push({length:len, angle:ang});
    //let bigAngle = (ang+nAng < Math.PI-MAX_A || ang+nAng > Math.PI+MAX_A) 
    //ang = (bigAngle)? ang-nAng:ang+nAng;
    //ang += ang+nAng;
  }
  return line;
}

function drawLine(line, x, y) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  let angle = 0;
  for (let i=0; i<line.length; i++) {
    angle =+ line[i].angle
    x += Math.sin(angle)*line[i].length;
    y += Math.cos(angle)*line[i].length;
    ctx.lineTo(x, y);
  }
  ctx.strokeWidth=5;
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.stroke();
}

function drawRange(line, x, y, GROWTH) {
  let range_path = [new THREE.Vector2(x, y)];
  let rLen = GROWTH;
  let lLen = GROWTH;
  let angle = 0;
  for (let i=0; i<line.length; i++) {
    rLen += GROWTH * Math.random() * ((i < line.length*0.5)? 1: -1);
    lLen += GROWTH * Math.random() * ((i < line.length*0.5)? 1: -1);
    //console.log("rLen:"+rLen+", lLen:"+lLen);
    angle += line[i].angle;
    x += Math.sin(angle)*line[i].length;
    y += Math.cos(angle)*line[i].length;
    let p1 = new THREE.Vector2(x + Math.sin(angle-Math.PI/4)*rLen, y + Math.cos(angle-Math.PI/4)*rLen);
    let p2 = new THREE.Vector2(x + Math.sin(angle+Math.PI/4)*lLen, y + Math.cos(angle+Math.PI/4)*lLen);
    range_path.splice(Math.floor(range_path.length/2+0.5), 0, p1, p2);
  }
  ctx.beginPath();
  ctx.moveTo(range_path[0].x, range_path[0].y);
  for (let i=1; i<range_path.length; i++) {
    ctx.lineTo(range_path[i].x, range_path[i].y);
  }
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  /*
  let gradient = ctx.createLinearGradient(sy, sx, y, x);
  gradient.addColorStop(0, "transparent");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.4)");
  gradient.addColorStop(1, "transparent");
  ctx.fillStyle=gradient;
  */
  ctx.fill();
}

function draw_circle(x,y,r) {
  let gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
  gradient.addColorStop(0, "white");
  gradient.addColorStop(1, "transparent");
  ctx.fillStyle=gradient;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI*2);
  ctx.fill();
}

const mapTexture = new THREE.CanvasTexture(canvas);


const dirtyTexture = new THREE.TextureLoader().load( 'images/dirt-512.jpg' );
dirtyTexture.wrapS = dirtyTexture.wrapT = THREE.RepeatWrapping; 
	
const sandyTexture = new THREE.TextureLoader().load( 'images/sand-512.jpg' );
sandyTexture.wrapS = sandyTexture.wrapT = THREE.RepeatWrapping; 
	
const grassTexture = new THREE.TextureLoader().load( 'images/grass.jpg' );
grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping; 
	
const rockyTexture = new THREE.TextureLoader().load( 'images/grass2.jpg' );
rockyTexture.wrapS = rockyTexture.wrapT = THREE.RepeatWrapping; 

const world_geo = toIndexedGeometry(new THREE.IcosahedronGeometry(50, 20));
const world_ma = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
window.world_mat = new THREE.MeshStandardMaterial({
  onBeforeCompile: (shader) => {

    // storing a reference to the shader object
    window.world_mat.userData.shader = shader;

    shader.vertexShader = shader.vertexShader.replace(`#include <displacementmap_pars_vertex>`,
    `#include <displacementmap_pars_vertex>
     uniform sampler2D mapTexture;
     uniform float bumpScale;
     varying vec2 vUV;
     varying float vAmount;`);
    shader.vertexShader = shader.vertexShader.replace(`#include <fog_vertex>`,
    `#include <fog_vertex>
     vUV = uv;
     vec4 mapData = texture2D( mapTexture, uv);
     vAmount = mapData.r;
     vec3 newPosition = position + normal * bumpScale * vAmount;
     gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );
     `);
    shader.fragmentShader = shader.fragmentShader.replace(`#include <color_pars_fragment>`,
    `#include <color_pars_fragment>
     uniform sampler2D dirtyTexture, sandyTexture, grassTexture, rockyTexture, mapTexture;
     varying vec2 vUV;
     varying float vAmount;
     uniform float waterNum, sandyNum, grassNum, rockyNum;
     `);

    shader.fragmentShader = shader.fragmentShader.replace(`#include <color_fragment>`,
    `#include <color_fragment>
     float dark = waterNum;
     float sand = sandyNum + dark;
     float gras = grassNum + sand;
     float rock = rockyNum + gras;
     if (vAmount < dark) diffuseColor = texture2D( dirtyTexture, vUV * 20.0 );
	   else if (vAmount < sand) diffuseColor = texture2D( sandyTexture, vUV * 20.0 );
	   else if (vAmount < gras) diffuseColor = texture2D( grassTexture, vUV * 100.0 );
	   else if (vAmount < rock) diffuseColor = texture2D( rockyTexture, vUV * 20.0 );
     `);

    shader.uniforms.mapTexture = {value: mapTexture};
    shader.uniforms.dirtyTexture = {value: dirtyTexture};
    shader.uniforms.sandyTexture = {value: sandyTexture};
    shader.uniforms.grassTexture = {value: grassTexture};
    shader.uniforms.rockyTexture = {value: rockyTexture};
    shader.uniforms.waterNum = {value: 0.2};
    shader.uniforms.sandyNum = {value: 0.2};
    shader.uniforms.grassNum = {value: 0.2};
    shader.uniforms.rockyNum = {value: 0.2};
    shader.uniforms.bumpScale = {value: 2};
  }
});


function rd(n) {return Math.round(n*100)};

function toIndexedGeometry(geo) {
  const vertices = [];
  const indices = [];
  const vertpos = [];
  const neighbors = [];
  const faces = [];
  const uvs = [];
  const link = {};
  const points = geo.attributes.position.array;
  for (let i=0; i<points.length; i+=9) {
    let face = []
    for (let j=0; j<9; j+=3) {
      let key = rd(points[i+j])+":"+rd(points[i+j+1])+":"+rd(points[i+j+2]);
      let index = vertices.indexOf(key);
      if (index == -1) {
        index = vertices.length;
        vertpos.push(points[i+j], points[i+j+1], points[i+j+2]);
        link[key] = {'vertex':index, 'faces':[i/9], 'neighbors':[], me:[i+j]};
        vertices.push(key);
        neighbors.push([i/9]);
        uvs.push(geo.attributes.uv.array[(i+j)*(2/3)],geo.attributes.uv.array[(i+j)*(2/3)+1]);
      }
      else {
        neighbors[index].push(i/9);
        link[key].faces.push(i/9);
        link[key].me.push(i+j);
      }
      face.push(index);
      indices.push(index);
    }
    faces.push(face);
    link[vertices[face[0]]].neighbors.push(face[1],face[2]);
    link[vertices[face[1]]].neighbors.push(face[0],face[2]);
    link[vertices[face[2]]].neighbors.push(face[0],face[1]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex( indices );
  geometry.setAttribute( 'position', new THREE.BufferAttribute(new Float32Array(vertpos), 3 ));
  geometry.computeVertexNormals();
  geometry.setAttribute( 'uv', new THREE.BufferAttribute(new Float32Array(uvs), 2 ));
  return geometry;
}

/*
for (let i=0; i<3000; i++) {
  let v = link[vertices[Math.floor(Math.random()*vertices.length)]];
  let att = world_geo.attributes;
  for (let j of v.me) {
    for (let k=0; k<3; k++) 
     att.position.array[k+j] += att.normal.array[k+j];
  }
}
*/

const world = new THREE.Mesh( world_geo, world_mat );
scene.add( world );

const ocean_mat = new THREE.MeshPhongMaterial( {color: 0x049ef4, specular: 0xe4cece, transparent: true, opacity: 0.5});
const ocean = new THREE.Mesh( world_geo, ocean_mat );
ocean.scale.multiplyScalar(1.01);
scene.add(ocean);

// Create a light, set its position, and add it to the scene.
const pointLight = new THREE.DirectionalLight(0xffffff, 1);
pointLight.position.set(0.5,2,1);
scene.add(pointLight);

const ambLight = new THREE.AmbientLight( 0xffffff, 0.03 ); // soft white light
scene.add( ambLight );

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

const gui = new lil.GUI();
const cameraFolder = gui.addFolder('Camera');
cameraFolder.add(camera.position, 'z', 110, 200);
cameraFolder.open();
const shaderFolder = gui.addFolder('Shader');
  shaderFolder.add(levels, 'waterNum', 0, 0.4);
  shaderFolder.add(levels, 'sandyNum', 0, 0.4);
  shaderFolder.add(levels, 'grassNum', 0, 0.4);
  shaderFolder.add(levels, 'rockyNum', 0, 0.4);
  shaderFolder.add(levels, 'bumpScale', 0, 40);

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
