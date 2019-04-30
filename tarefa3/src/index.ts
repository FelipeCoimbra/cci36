import THREE from "three";

//
// Instantiate THREE js renderer
//

let renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x220000, 1);

document.body.appendChild(renderer.domElement);

const BOARD_SIZE = 10 as const;
const SHIP_COUNT = [1, 3, 1] as const;


/**
 *  Game scene manager. Manages game visual aspects (geometries, colors) and provides a high level API
*/
class BattleShipScene {

  constructor(scene:THREE.Scene, battle:BattleShipState) {

  }

  public abstract changePlayer();

  public abstract selectShip(idx: number);
  public abstract moveShip(idx: number, to: [number, number]);
  public abstract settleShip(idx: number);
  public abstract rotateShip(idx: number);

  public abstract selectPin();
  public abstract movePin(to: [number, number]);
  public abstract settlePin();

}

const enum BSEventKind {
  /** An object was selected (a ship or a pin). */
  SELECT,
  /** An object was unselected (a ship or a pin). */
  UNSELECT,
  /** Mouse movent over the grid. */
  MOVE,
  /** Rotate a ship. */
  ROTATE,
};

abstract class BattleShipEvent {
  public abstract kind: BSEventKind;
}

const enum ORIENTATION {
  HORIZONTAL,
  VERTICAL
}

/**
 *  Low level event handler. Translates low level interactions such as mouse up to high level
 *  game events.
*/
class BattleShipSensor {
  public sense(scene: BattleShipScene): BattleShipEvent | null {
    return null;
  }
}

enum PLAYER {
  P1,
  P2,
}

/** Board positions are pairs of integers (x,y). */
type BoardPosition = [number, number];

/** Pieces may be positioned or not. */
type PiecePosition = BoardPosition | null

/** 
 * Ship piece class.
 * Holds information about a specific Ship object
 */
class ShipPiece {
  public id:number;
  public size:number;
  public orientation:ORIENTATION
  public player:PLAYER;
  public position:PiecePosition = null;


  constructor(idx:number, size:number, player: PLAYER, orientation: ORIENTATION = ORIENTATION.HORIZONTAL) {
    this.id = idx;
    this.size = size;
    this.player = player;
    this.orientation = orientation;
  }
}

enum BoardCellKind {
  WATER,
  SHIP,
}

abstract class BattleShipBoardCell {
  public abstract cellKind: BoardCellKind;
  public attacked: boolean = false;
}

class WaterBoardCell extends BattleShipBoardCell {
  public cellKind = BoardCellKind.WATER;
  constructor() {
    super();
  }
}

class ShipBoardCell extends BattleShipBoardCell {
  public cellKind = BoardCellKind.SHIP;
  public shipId: number;
  constructor(shipId: number) {
    super();
    this.shipId = shipId;
  }
}

class BattleShipBoard {
  private board: BattleShipBoardCell[][];

  constructor(boardSize:number) {
    this.board = [] as BattleShipBoardCell[][];
    for (let i = 0; i < boardSize; i++) {
      const boardLine = [] as BattleShipBoardCell[];
      for (let j = 0; j < boardSize; j++) {
        boardLine.push(new WaterBoardCell());
      }
      this.board.push(boardLine);
    }
  }
}


/**
 * Wrapper class for generic game constants.
 */
class BattleShipSettings {
  public boardSize = 10 as const;
  public shipCountByType = [1, 3, 1];
  public shipSizeByType = [2, 3, 4];
}

/**
 * Stores current game information.
 * Must be initialized from a Battleship general settings.
 */
class BattleShipState {
  private settings: BattleShipSettings;
  private ships: ShipPiece[];
  private currentPlayer: PLAYER;
  private shipBoard: BattleShipBoard;
  private pinBoard: BattleShipBoard;

  constructor(settings:BattleShipSettings) {
    this.settings = settings;
    this.ships = [];
    this.setupShips();
    this.currentPlayer = PLAYER.P1;
    this.shipBoard = new BattleShipBoard(this.settings.boardSize);
    this.pinBoard = new BattleShipBoard(this.settings.boardSize);
  }

  public getSettings(): Readonly<BattleShipSettings> {
    return this.settings;
  }

  public getShips(): ReadonlyArray<ShipPiece> {
    return this.ships;
  }

  private setupShips() {
    let id = 0;
    [PLAYER.P1, PLAYER.P2].forEach(player => {
      for (let type in this.settings.shipCountByType) 
      for (let count = 0; count < this.settings.shipCountByType[type]; count++) {
        this.ships.push(new ShipPiece(id++, this.settings.shipSizeByType[type], player));
      }
    });
  }

}

/**
 * Class responsible for updating game state.
 * Created for reasons of decoupling game state from game rules.
 */
class BattleShipUpdater {
  constructor() {

  }

  public update(world:BattleShipState, event:BattleShipEvent | null) {
    if (event === null) {
      return;
    }


  }
}

/**
 * Actor that changes game view.
 * This class is responsible for synchronizing the scene with the game through the BattleShipScene
 * class API.
 */
class BattleShipActor {
  constructor() {

  }

  public sync(sceneState:BattleShipScene, gameState:BattleShipState) {

  }
}

/**
 * Battleship game main class
 */
class BattleShip {
  private gameState:BattleShipState;
  private updater:BattleShipUpdater;
  private gameScene:BattleShipScene;
  private sensor:BattleShipSensor;
  private actor:BattleShipActor;

  constructor(scene:THREE.Scene) {
    this.gameState = new BattleShipState(new BattleShipSettings());
    this.updater = new BattleShipUpdater();
    this.gameScene = new BattleShipScene(scene, this.gameState);
    this.sensor = new BattleShipSensor();
    this.actor = new BattleShipActor();
  }

  /**
   * Game loop update
   * 1) Generate game events from raw user input
   * 2) Update game state from game event occurence
   * 3) Synchronize game view with updated state
   */
  public update() {
    const gameEvent = this.sensor.sense(this.gameScene);
    this.updater.update(this.gameState, gameEvent);
    this.actor.sync(this.gameScene,this.gameState);
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
