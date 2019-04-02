import THREE from "three";
import "./controls.js";

/**
    Generic Object for the THREE.js scene
*/
abstract class SceneObject {
  constructor(protected mesh: THREE.Mesh) {}

  get position(): THREE.Vector3 {
    return this.mesh.position;
  }

  public moveTo(newPosition: THREE.Vector3) {
    this.mesh.position.copy(newPosition);
  }

  public addTo(scene: { add: (obj: THREE.Object3D) => any }) {
    scene.add(this.mesh);
  }
}

/**
    Class representation of a single dot
    Dots populate a dice face.
*/
class Dot extends SceneObject {
  static Material = new THREE.MeshBasicMaterial({
    color: 0x0f0,
    side: THREE.DoubleSide
  });

  constructor(radius: number, position: THREE.Vector3) {
    const geometry = new THREE.CircleBufferGeometry(radius, 20);
    super(new THREE.Mesh(geometry, Dot.Material));
    this.moveTo(position);
  }
}

type NDiceFace = 1 | 2 | 3 | 4 | 5 | 6;

/**
    Class representation of a single dice face.
    Dice faces combined create a Dice object
*/
class DiceFace extends SceneObject {
  static Material = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0
  });

  private size: number;
  private dots: THREE.Group;

  constructor(size: number, position: THREE.Vector3) {
    const geometry = new THREE.PlaneBufferGeometry(size, size);
    super(new THREE.Mesh(geometry, DiceFace.Material));
    this.moveTo(position);

    this.size = size;
    this.dots = new THREE.Group();
    this.dots.add(this.mesh);
  }

  public addTo(scene: { add: (obj: THREE.Object3D) => any }) {
    scene.add(this.dots);
  }

  public rotate(vec: THREE.Vector3, rot: number) {
    const oldPos = this.position.clone();
    this.dots.position.copy(new THREE.Vector3());
    this.dots.rotateOnAxis(vec, rot);
    this.dots.position.copy(oldPos);
  }

  public createDots(n: NDiceFace) {
    const radius = this.size / 10;
    const positions = this.getDotsPositions(n);

    for (let i = 0; i < n; i++) {
      const dot = new Dot(radius, positions[i]);
      dot.addTo(this.dots);
    }
  }

  private getDotsPositions(n: NDiceFace): THREE.Vector3[] {
    let trans: THREE.Vector3;
    // Divide dice face into a 5x5 grid
    const half = this.size / 5;

    switch (n) {
      case 1:
      // Single central dot
        return [this.position.clone()];
      case 2:
      // Two diagonally opposite dots on main diagonal
        trans = new THREE.Vector3(half, half, 0);

        return [
          this.position.clone().sub(trans),
          this.position.clone().add(trans)
        ];
      case 3:
        return [...this.getDotsPositions(1), ...this.getDotsPositions(2)];
      case 4:
      // Four dots on the vertices of a square
        let transPos = new THREE.Vector3(half, half, 0);
        let transNeg = new THREE.Vector3(half, -half, 0);
        return [
          this.position.clone().add(transPos),
          this.position.clone().sub(transPos),
          this.position.clone().add(transNeg),
          this.position.clone().sub(transNeg)
        ];
      case 5:
        return [...this.getDotsPositions(1), ...this.getDotsPositions(4)];
      case 6:
      // Four dots combined with two vertically opposite dots
        trans = new THREE.Vector3(0, half, 0);
        return [
          ...this.getDotsPositions(4),
          this.position.clone().add(trans),
          this.position.clone().sub(trans)
        ];
    }
  }
}

/**
    Class representation of a single Dice
*/
class Dice extends SceneObject {
  static Material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide
  });
  private size: number;
  private faces: THREE.Group;

  constructor(size: number) {
    // Shrink box size a little bit so there's no conflict between faces and
    // dot meshes
    const geom = new THREE.BoxBufferGeometry(
      size * 0.99,
      size * 0.99,
      size * 0.99
    );
    super(new THREE.Mesh(geom, Dice.Material));
    this.moveTo(new THREE.Vector3());

    this.size = size;
    this.faces = new THREE.Group();

    this.createDiceFaces();
  }

  public addTo(scene: { add: (obj: THREE.Object3D) => any }) {
    super.addTo(scene);
    scene.add(this.faces);
  }

  public asGroup(): THREE.Group {
    let group = new THREE.Group();

    this.addTo(group);

    return group;
  }

  private createDiceFaces() {
    for (let i = 1; i <= 6; i++) {
      const position = this.getDiceFacePosition(i as NDiceFace);
      const face = new DiceFace(this.size, position);
      face.createDots(i as NDiceFace);
      face.rotate(...this.getDiceFaceRotation(i as NDiceFace));
      face.addTo(this.faces);
    }

    this.position.z = this.size / 2;
  }

  private getDiceFacePosition(n: NDiceFace) {
    const half = this.size / 2;

    // Center of cube is the origin of our relative coordinate system
    let relPos = new THREE.Vector3(0, 0, 0);
    switch (n) {
      case 1:
        relPos.z = half;
        break;
      case 2:
        relPos.y = half;
        break;
      case 3:
        relPos.x = half;
        break;
      case 4:
        relPos.x = -half;
        break;
      case 5:
        relPos.y = -half;
        break;
      case 6:
        relPos.z = 0;
    }

    return this.position.clone().add(relPos);
  }

  private getDiceFaceRotation(n: NDiceFace): [THREE.Vector3, number] {
    switch (n) {
      case 1:
        return [new THREE.Vector3(0, 0, 0), Math.PI / 2];
      case 2:
        return [new THREE.Vector3(1, 0, 0), Math.PI / 2];
      case 3:
        return [new THREE.Vector3(0, -1, 0), Math.PI / 2];
      case 4:
        return [new THREE.Vector3(0, -1, 0), -Math.PI / 2];
      case 5:
        return [new THREE.Vector3(1, 0, 0), -Math.PI / 2];
      case 6:
        return [new THREE.Vector3(0, 0, 0), Math.PI / 2];
    }
  }
}

//
// Camera and control setup
//
let camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 200;

//
// Renderer setup
//
let renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

let controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.update();

document.body.appendChild(renderer.domElement);

//
// Object positioning
//
let scene = new THREE.Scene();
let positions: [THREE.Vector3, THREE.Euler][] = [
  [new THREE.Vector3(10, 10, 0), new THREE.Euler(Math.PI / 2, 0, 0)],
  [new THREE.Vector3(20, -20, 0), new THREE.Euler(0, 0, 0)],
  [new THREE.Vector3(-20, 40, 0), new THREE.Euler(-Math.PI, 0, Math.PI)],
  [
    new THREE.Vector3(-40, -40, 0),
    new THREE.Euler(0, Math.PI / 2, -Math.PI / 2)
  ],
  [
    new THREE.Vector3(40, 40, 0),
    new THREE.Euler(-Math.PI / 2, Math.PI / 2, Math.PI / 2)
  ]
];

for (let position of positions) {
  let cube = new Dice(10).asGroup();
  cube.position.copy(position[0]);
  cube.setRotationFromEuler(position[1]);
  cube.position.z = 0;
  scene.add(cube);
}

//
// Camera rotation for whole scene visualization
//
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  scene.rotation.x += 0.01;

  scene.rotation.y += 0.01;
  scene.rotation.z += 0.01;

  renderer.render(scene, camera);
}

//
// Start animation
//
animate();
