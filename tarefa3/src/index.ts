import THREE from "three";

//
// Instantiate THREE js renderer
//

let renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x220000, 1);

document.body.appendChild(renderer.domElement);

/*!
 *  Wrapper class to game configurations
*/
class BattleShipSettings {
  public boardSize:number;

  constructor() {
    this.boardSize = 12;
    this.shipCount = [

    ]
  }
}

/*!
 *  Game scene manager. Manages game visual aspects (geometries, colors) from a high level API
*/
 class BattleShipScene {

}

/*!
 *  Low level event handler. Translates low level interactions such as mouse up to high level
 *  game events.
*/
class BattleShipSensor {

}

// BattleShip game manager
class BattleShip {
  private gameSettings:BattleShipSettings;  
  private gameScene:BattleShipScene;
  private sensor:BattleShipSensor;
  private actor:BattleShipActor;
  private gameState:BattleShipState;

  constructor(_scene:THREE.Scene) {
    this.gameSettings = new BattleShipSettings();
    this.gameScene = new BattleShipScene(_scene, this.gameSettings);
    this.sensor = new BattleShipSensor();
  }

  public update() {
    const worldEvent = this.sensor.sense(this.gameScene);
    this.gameState.update(worldEvent);
    this.actor.link(this.gameState, this.gameScene);
  }
}

//
// Setup camera
//

let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

camera.position.x = 5;
camera.position.z = 3;
camera.position.y = -5;
camera.up = new THREE.Vector3(0,0,1);
camera.lookAt(new THREE.Vector3(0, 0, 0));

//
// Setup scene
//

const scene = new THREE.Scene();
const game = new BattleShip(scene);

//
//  Add light spots to scene
//

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

//
// Add ambient light to scene
//

let amblight = new THREE.AmbientLight(0x444444);
scene.add(amblight)

//
// Create orbit controls for observation and resize action
//

window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}, false);

//
// Animate
//

const run = () => {
  requestAnimationFrame(run);

  game.update();
  renderer.render(scene, camera);
}

run();
