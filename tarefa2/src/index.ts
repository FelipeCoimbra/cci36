import THREE from "three";
import "./controls.js";

const DIFF = 0.05;
const SPEED = 0.1;
const SCALE = 2;


/**
 * Find all the (X, Y) points that are inside a circle of radius `radius`.
 *
 * @param radius: Radius of the circle.
 *
 * @returns: All the points inside the circle.
 */
function* circlePoints(radius: number): Iterable<[number, number]> {
  const radiusSqr = radius ** 2;

  for (let x = 0; x < radius; x += DIFF) {
    const maxYabs = Math.sqrt(radiusSqr - x ** 2);

    yield [x, 0];
    yield [-x, 0];

    for (let y = DIFF; y <= maxYabs; y += DIFF) {
      yield [x, -y];
      yield [x, y];
      yield [-x, -y];
      yield [-x, y];
    }
  }
}

/**
 * Models a circular liquid superficie.
 */
class WaterPlane {
  public mesh: THREE.Mesh;
  private geometry: THREE.Geometry;
  private points: Array<[number, number]>;

  constructor(radius: number){
    this.geometry = new THREE.Geometry();
    this.points = Array.from(circlePoints(radius));

    this.buildGeometry(0);

    const material = new THREE.MeshPhongMaterial({
      color: 0x2121CE,
      emissive: 0x1A3C8E,
      specular: 0x7BC8F2,
      shininess: 100,
      fog: true,
      side: THREE.DoubleSide,
      vertexColors: THREE.NoColors,
      flatShading: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.position.set(0, 0, 0);
  }

  public updateGeometry(time: number) {
    this.points.forEach(([x, y], ix) =>
      this.geometry.vertices[ix].setZ(this.waveHeight(x, y, time)));

    this.geometry.verticesNeedUpdate = true;
  }

  /**
   * Builds the plane geometry from scratch.
   *
   * The circular plane is approximated to a square grid of points.
   * The faces of the plane are constructed by splitting each square into
   * two triangles, this way, each point (x, y) creates two faces:
   *    - The upper face: The face formed by the triangle on top of the
   *    diagonal.
   *    - The lower face: The face formed by the triangle on the bottom of
   *    the diagonal.
   */
  private buildGeometry(time: number) {
    this.geometry.vertices = this.points
      .map(([x, y]) => new THREE.Vector3(x, y, this.waveHeight(x, y, time)));

    this.geometry.faces = [];
    this.geometry.faceVertexUvs = [[]];

    this.points.forEach(([x, y]) => {
      // Upper face.
      let res = this.upperFaceFor(x, y);
      if (res != null) {
        let [face, ixs] = res;
        this.geometry.faces.push(face);

        this.geometry.faceVertexUvs[0].push(ixs.map(ix => {
          let [x, y] = this.points[ix];

          return new THREE.Vector2(x, y);
        }))
      }

      // Lower face.
      res = this.lowerFaceFor(x, y);
      if (res != null) {
        let [face, ixs] = res;
        this.geometry.faces.push(face);
        this.geometry.faceVertexUvs[0].push(ixs.map(ix => {
          let [x, y] = this.points[ix];

          return new THREE.Vector2(x, y);
        }))
      }
    });

    this.geometry.computeFaceNormals();
    this.geometry.computeVertexNormals();
    this.geometry.computeMorphNormals();

    this.geometry.colorsNeedUpdate = true;
    this.geometry.elementsNeedUpdate = true;
    this.geometry.verticesNeedUpdate = true;
    this.geometry.uvsNeedUpdate = true;
  }

  /**
   * Mathematically describes the wave that will be formed by the plane.
   * Is a function z = f(x, y).
   */
  private waveHeight(x: number, y: number, t: number): number {
    let dist = (SCALE * Math.abs(x) + t * SPEED) ** 2 + (SCALE * Math.abs(y) + t * SPEED) ** 2;

    return Math.sin(dist) / (dist + 0.1) + 1.5 * dist * Math.exp(1 - dist);
  }

  /**
   * Creates the upper face for a point (x, y).
   * The points of the face are defined as bellow:
   *
   * (x, y + DIFF) _________ (x + DIFF,  y + DIFF)
   *              |        /
   *              |      /
   *              |    /
   *              |  /
   *              |/
   *        (x, y)
   *
   * The points are walked in the clock-wise direction, starting from (x, y).
   */
  private upperFaceFor(x: number, y: number): [THREE.Face3, number[]] | null {
    const points: Array<[number, number]> = [
      [x, y],
      [x, y + DIFF],
      [x + DIFF, y + DIFF]
    ]

    return this.faceFromPoints(points);
  }

  /**
   * Creates the lower face for a point (x, y).
   * The points of the face are defined as bellow:
   *
   *                         (x + DIFF,  y + DIFF)
   *                       /|
   *                     /  |
   *                   /    |
   *                 /      |
   *               /        |
   *       (x, y) ----------- (x + DIFF, y)
   *
   * The points are walked in the clock-wise direction, starting
   * from (x + DIFF, y + DIFF).
   */
  private lowerFaceFor(x: number, y: number): [THREE.Face3, number[]] | null {
    const points: Array<[number, number]> = [
      [x + DIFF, y + DIFF],
      [x + DIFF, y],
      [x, y],
    ]

    return this.faceFromPoints(points);
  }

  /**
   * Creates a face from the set of points (x, y) for the vertices.
   *
   * @param points: Vertices (x, y) of the face.
   *
   * @returns: The face created and the indices of the vertices in the list
   * of points.
   */
  private faceFromPoints(points: Array<[number, number]>): [THREE.Face3, number[]] | null {
    let indices = [];
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const ix = this.points.findIndex(([x, y]) =>
        Math.abs(p[0] - x) < 0.0001 && Math.abs(p[1] - y) < 0.0001);

      if (ix !== -1) {
        indices.push(ix);
      }
    }

    if (indices.length !== 3) {
      return null;
    }

    return [new THREE.Face3(indices[0], indices[1], indices[2]), indices];
  }
}


class Cup {
  public mesh: THREE.Group;

  constructor(innerRadius: number, outerRadius: number) {
    const material = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      shininess: 0,
    });

    this.mesh = new THREE.Group();

    const topRing = new THREE.RingBufferGeometry(innerRadius, outerRadius, 64);
    this.mesh.add(new THREE.Mesh(topRing, material));

    const innerCylinder = new THREE.CylinderBufferGeometry(innerRadius, 0.8 * innerRadius, 10, 64, 1, true);
    innerCylinder.rotateX(Math.PI / 2);
    innerCylinder.translate(0, 0, -5);
    this.mesh.add(new THREE.Mesh(innerCylinder, material));

    const outerCylinder = new THREE.CylinderBufferGeometry(outerRadius, 0.8 * outerRadius, 10, 64, 1, true);
    outerCylinder.rotateX(Math.PI / 2);
    outerCylinder.translate(0, 0, -5);
    this.mesh.add(new THREE.Mesh(outerCylinder, material));

    const bottom = new THREE.CircleBufferGeometry(0.8 * outerRadius, 64);
    bottom.translate(0, 0, -10);
    this.mesh.add(new THREE.Mesh(bottom, material));
  }
}


let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
let renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x220000, 1);


document.body.appendChild(renderer.domElement);

let water = new WaterPlane(4.6);
water.mesh.translateZ(-0.5);
let cup = new Cup(4.5, 5);

let scene = new THREE.Scene();
scene.add(cup.mesh);
scene.add(water.mesh);

var lights = [];
lights[ 0 ] = new THREE.PointLight( 0xffffff, 1, 0 );
lights[ 1 ] = new THREE.PointLight( 0xffffff, 1, 0 );
lights[ 2 ] = new THREE.PointLight( 0xffffff, 1, 0 );

lights[ 0 ].position.set( 0, 200, 0 );
lights[ 1 ].position.set( 100, 200, 100 );
lights[ 2 ].position.set( - 100, - 200, - 100 );

scene.add( lights[ 0 ] );
scene.add( lights[ 1 ] );
scene.add( lights[ 2 ] );

let amblight = new THREE.AmbientLight(0x444444);
scene.add(amblight)

camera.position.x = 20;
camera.position.z = 20;
camera.position.y = -20;
camera.up = new THREE.Vector3(0,0,1);
camera.lookAt(new THREE.Vector3(0, 0, 0));

let controls =  new THREE.OrbitControls(camera);
controls.update();

let t = 0;

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  water.updateGeometry(t);
  t += 0.1;
  renderer.render(scene, camera);
}

window.addEventListener("resize", function () {
				camera.aspect = window.innerWidth / window.innerHeight;
				camera.updateProjectionMatrix();
				renderer.setSize( window.innerWidth, window.innerHeight );
}, false);

animate();
