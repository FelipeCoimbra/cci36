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
 *  Game scene manager. Manages game visual aspects (geometries, colors) and provides a high level interface
 * for view control.
*/
class BattleShipScene {

  constructor(scene:THREE.Scene, battle:BattleShipGame) {

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

/**
 * Player identifier
 */
enum PLAYER {
  P1,
  P2,
}

/** Board positions are pairs of integers (x,y). */
type BoardPosition = [number, number];

/** 
 * Ship piece class.
 * Holds information about a specific Ship object
 */
class ShipPiece {
  public id:number;
  public size:number;
  public orientation:ORIENTATION
  public position:BoardPosition;
  public damaged:boolean[];
  public damage:number;


  constructor(idx:number, size:number, orientation: ORIENTATION, position: BoardPosition) {
    this.id = idx;
    this.size = size;
    this.orientation = orientation;
    this.position = position;
    this.damaged = []
    for (let i = 0; i < this.size; i++) {
      this.damaged.push(false);
    }
    this.damage = 0;
  }
}

enum BoardCellKind {
  WATER,
  SHIP,
}

/**
 * Generic board cell
 */
abstract class BattleShipBoardCell {
  public abstract cellKind: BoardCellKind;
  public attacked: boolean = false;
}

/**
 * Board cell filled with water
 */
class WaterBoardCell extends BattleShipBoardCell {
  public cellKind = BoardCellKind.WATER;
  constructor() {
    super();
  }
}

/**
 * Board cell occupied by a ship
 */
class ShipBoardCell extends BattleShipBoardCell {
  public cellKind = BoardCellKind.SHIP;
  public shipId: number;
  public shipPart: number;

  constructor(shipId: number, shipPart: number) {
    super();
    this.shipId = shipId;
    this.shipPart = shipPart;
  }
}

/**
 * Battleship board representation. This representations works both as a pin board
 * and as a ship board.
 * Initially filled with water, cells are modified to ship cells when a ship is settled
 * on them. 
 */
class BattleShipBoard {
  private board: BattleShipBoardCell[][];
  private boardSize: number;

  constructor(boardSize:number) {
    this.board = [] as BattleShipBoardCell[][];
    this.boardSize = boardSize;
    this.initBoard();
  }
  
  /**
   * Adds a ship piece to the board
   * @param ship Ship piece to add to the board
   * @throws Error if ship's position is out of board bounds
   * @throws Error if ship's orientation makes it partially out of board bounds
   * @throws Error if ship's overlaps with an already settled ship
   */
  public settleShip(ship:ShipPiece) {
    const x = ship.position[0], y = ship.position[1];
    if (x < 0 || x >= this.boardSize || y < 0 || y > this.boardSize) {
      throw new Error(`Ship ${ship.id} position out of board bounds`);
    }

    if (ship.orientation === ORIENTATION.HORIZONTAL) {
      if (y + ship.size >= this.boardSize) {
        throw new Error(`Ship ${ship.id} with size ${ship.size} out of bounds.`)
      }

      for (let pos = y; pos < y + ship.size; pos++) {
        if (this.board[x][pos].cellKind === BoardCellKind.SHIP) {
          throw new Error(`Ship ${ship.id} with size ${ship.size} already occupied.`)
        }
      }

      for (let pos = y; pos < y + ship.size; pos++) {
        delete this.board[x][pos];
        this.board[x][pos] = new ShipBoardCell(ship.id, pos);
      }
    } else if (ship.orientation === ORIENTATION.VERTICAL) {
      if (x + ship.size >= this.boardSize) {
        throw new Error(`Ship ${ship.id} with size ${ship.size} out of bounds.`)
      }

      for (let pos = x; pos < x + ship.size; pos++) {
        if (this.board[pos][y].cellKind === BoardCellKind.SHIP) {
          throw new Error(`Ship ${ship.id} with size ${ship.size} already occupied.`)
        }
      }

      for (let pos = x; pos < x + ship.size; pos++) {
        delete this.board[pos][y];
        this.board[pos][y] = new ShipBoardCell(ship.id, pos);
      }
    } else {
      // Never reaches
    }
  }

  /**
   * Attacks a specific target of the board
   * @param target Board position to attack
   * @returns [ID of damaged ship, damaged ship part] or null if no ship was damaged
   * @throws Error if target is outside board limits
   * @throws Error if target has already been attacked
   */
  public attack(target: BoardPosition): [number, number] | null {
    const x = target[0], y = target[1];
    if (x < 0 || y < 0 || x >= this.boardSize || y >= this.boardSize) {
      throw new Error(`Attack position (${x}, ${y}) out of bounds`);
    }
    const cell = this.board[x][y];
    if (cell.attacked) {
      throw new Error(`Attack position (${x}, ${y}) already attacked`);
    }
    cell.attacked = true;
    return cell.cellKind === BoardCellKind.SHIP ? [(cell as ShipBoardCell).shipId, (cell as ShipBoardCell).shipPart] 
    : null;
  }

  private initBoard() {
    for (let i = 0; i < this.boardSize; i++) {
      const boardLine = [] as BattleShipBoardCell[];
      for (let j = 0; j < this.boardSize; j++) {
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
  public playerShipCount = 5 as const;
  public shipCountByType = [1, 3, 1];
  public shipSizeByType = [2, 3, 4];
}

/**
 * Stores player-specific game information
 */
class BattleShipPlayer {
  private playerId: PLAYER;
  private ships: ShipPiece[];
  private shipBoard: BattleShipBoard;
  private pinBoard: BattleShipBoard;
  private shipCount: number;

  constructor(playerId: PLAYER, shipBoard: BattleShipBoard, pinBoard: BattleShipBoard) {
    this.playerId = playerId;
    this.ships = [];
    this.shipBoard = shipBoard;
    this.pinBoard = pinBoard;
    this.shipCount = 0;
  }

  public getId(): PLAYER {
    return this.playerId;
  }

  public getShipCount(): Readonly<number> {
    return this.shipCount;
  }

  /**
   * Adds new ship to the player's ship board
   * @param size Size of ship
   * @param orientation Orientation of ship
   * @param position Position of ship in ship board
   * @throws
   */
  public settleShip(size: number, orientation: ORIENTATION, position: BoardPosition) {
    const ship = new ShipPiece(this.shipCount, size, orientation, position);
    this.shipBoard.settleShip(ship);
    this.ships.push(ship);
    this.shipCount++;
  }

  /**
   * Attacks a position of the player's pin board
   * @param target Position to attack
   * @return @see{@link BattleShipBoard#attack}
   * @throws @see{@link BattleShipBoard#attack}
   */
  public attack(target: BoardPosition): [number, number] | null {
    return this.pinBoard.attack(target);
  }
  
  /**
   * Grants damage in a specific ship and ship part
   * @param shipId Id of ship to be damaged
   * @param part Board position to damage
   * @returns True if damaged ship was destroyed
   * @throws Error if ship is not found
   * @throws Error if ship part is out of ship bounds
   * @throws Error if ship part is already damaged
   */
  public receiveDamage(shipId: number, part: number): boolean {
    if (shipId < 0 || shipId >= this.ships.length) {
      throw new Error(`Invalid ship id ${shipId}`);
    }
    const ship = this.ships[shipId];
    if (part < 0 || part >= ship.size) {
      throw new Error(`Damage location is not within ship limits`);
    }
    if (ship.damaged[part]) {
      throw new Error(`Part ${part} of ship ${shipId} is already damaged`);
    }
    ship.damaged[part] = true;
    ship.damage++;
    if (ship.damage === ship.size) {
      this.shipCount--;
      return true;
    }
    return false;
  }
}

/**
 * Stores current game information.
 * Must be initialized from a Battleship general settings.
 */
class BattleShipGame {
  private p1: BattleShipPlayer;
  private p2: BattleShipPlayer;

  constructor(settings:Readonly<BattleShipSettings>) {

    const p1Board = new BattleShipBoard(settings.boardSize);
    const p2Board = new BattleShipBoard(settings.boardSize);
    this.p1 = new BattleShipPlayer(PLAYER.P1, p1Board, p2Board);
    this.p2 = new BattleShipPlayer(PLAYER.P2, p2Board, p1Board);
  }

  /**
   * Adds a ship to a specific player in a specified configuration
   * @param player The player to add a ship
   * @param shipSize The size of the ship to be added
   * @param shipOrientation The orientation of the ship to be added
   * @param shipPosition The board position to settle the ship
   */
  public settleShip(player: PLAYER, shipSize: number, shipOrientation: ORIENTATION, shipPosition: BoardPosition) {
    if (this.p1.getId() === player) {
      this.p1.settleShip(shipSize, shipOrientation, shipPosition);
    } else {
      this.p2.settleShip(shipSize, shipOrientation, shipPosition);
    }
  }

  /**
   * Executes a player attack in game context
   * @param attackerId Id of attacking player
   * @param target Position to attack
   * @returns true if there are no ships left in the attacked board after attack
   */
  public attack(attackerId: PLAYER, target: BoardPosition) {
    const [attacker, attacked] = attackerId === PLAYER.P1 ? [this.p1, this.p2] : [this.p2, this.p1];
    const attackReport = attacker.attack(target);
    if (attackReport !== null) {
      const [damagedShipId, damagedShipPart] = attackReport;
      attacked.receiveDamage(damagedShipId, damagedShipPart);
      return attacked.getShipCount() === 0;
    }
    return false;
  }
}

enum BattleShipStateKind {
  SHIP_CRAFT,
}

/**
 * Class to represent a generic game state
 */
interface AbstractBattleShipState {
  kind: BattleShipStateKind;
}

class ShipCraftState implements AbstractBattleShipState {
  public kind:BattleShipStateKind.SHIP_CRAFT;
  private shipSizeSequence: number[];
  private shipSizeIterator: number;

  constructor(gameSettings: BattleShipSettings) {
    this.kind = BattleShipStateKind.SHIP_CRAFT;
    this.shipSizeSequence = this.buildShipSizeSequence(gameSettings);
    this.shipSizeIterator = 0;
  }

  public nextShipSize(): number {
    const size = this.shipSizeSequence[this.shipSizeIterator++];
    this.shipSizeIterator %= this.shipSizeSequence.length;  // Iterate circularly in sequence
    return size;
  }

  public getShipSizeIterator(): number {
    return this.shipSizeIterator;
  }

  private buildShipSizeSequence(gameSettings: BattleShipSettings): number[] {
    const sizeSequence = [] as number[];
    for (let shipType in gameSettings.shipCountByType) {
      for (let shipTypeCount = 0; shipTypeCount < gameSettings.shipCountByType[shipType]; shipTypeCount++) {
        sizeSequence.push(gameSettings.shipSizeByType[shipType]);
      }
    }
    return sizeSequence;
  }
}

type BattleShipState = ShipCraftState;

/**
 * Class responsible for updating game state.
 * Created for decoupling game state update from game rules.
 */
class BattleShipRules {
  private currentPlayer: PLAYER;
  private gameState: BattleShipState;
  constructor(gameSettings: BattleShipSettings) {
    this.currentPlayer = PLAYER.P1;
    this.gameState = new ShipCraftState(gameSettings);
  }

  public getState(): Readonly<BattleShipState> {
    return this.gameState;
  }

  public apply(game:BattleShipGame, event:BattleShipEvent | null) {
    if (event === null) {
      return;
    }

    this.gameState.apply(event);
  }
}

/**
 * Class is responsible for synchronizing the scene with the game through the BattleShipScene API.
 * Translates game-level events to view events.
 */
class BattleShipPresenter {
  constructor(gameState:AbstractBattleShipState) {

  }

  public sync(sceneState:BattleShipScene, gameState:BattleShipGame) {

  }
}

/**
 * Battleship game main class
 */
class BattleShip {
  private settings:Readonly<BattleShipSettings>;
  private game:BattleShipGame;
  private rules:BattleShipRules;
  private view:BattleShipScene;
  private sensor:BattleShipSensor;
  private viewPresenter:BattleShipPresenter;

  constructor(scene:THREE.Scene) {
    this.settings = new BattleShipSettings();
    this.sensor = new BattleShipSensor();

    this.game = new BattleShipGame(this.settings);
    this.rules = new BattleShipRules(this.settings);
    this.view = new BattleShipScene(scene, this.game);
    this.viewPresenter = new BattleShipPresenter(this.rules.getState());
  }

  /**
   * Game loop update
   * 1) Generate game events from raw user input
   * 2) Update game state from game event occurence following game rules
   * 3) Synchronize game view with updated state
   */
  public update() {
    const userEvent = this.sensor.sense(this.view);
    this.rules.apply(this.game, userEvent);
    this.viewPresenter.sync(this.view);
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
