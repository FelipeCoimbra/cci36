import THREE from "three";
import "./controls.js";

//
// Instantiate THREE js renderer
//

let renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x220000, 1);

document.body.appendChild(renderer.domElement);

const BOARD_SIZE = 10 as const;
const SHIP_COUNT = [1, 3, 1] as const;
const ANIMATION_STEP = 60 as const;

const lastItem = <T>(xs: {0: T} & T[]): T => xs[xs.length - 1];

/**
 *  Game scene manager. Manages game visual aspects (geometries, colors) and provides a high level interface
 * for view control.
*/
class BattleShipScene {
  private static P1BarrierGridPosition = new THREE.Vector3(-4, -1.01, 1.75);
  private static P1GridPosition = new THREE.Vector3(-4, -10.75, -0.49);

  public shipsGroup: THREE.Group;
  public pinsGroup: THREE.Group;

  public player1 = new THREE.Group();
  public player2 = new THREE.Group();

  get ships(): {0: THREE.Object3D} & THREE.Object3D[] {
    return this.shipsGroup.children as any;
  }

  get pins(): {0: THREE.Object3D} & THREE.Object3D[] {
    return this.pinsGroup.children as any;
  }

  private firstPlayer: boolean = true;

  constructor(private scene: THREE.Scene) {
    this.makeBoard();
    this.shipsGroup = new THREE.Group();
    this.pinsGroup = new THREE.Group();

    this.scene.add(this.shipsGroup);
    this.scene.add(this.pinsGroup);

    this.makeShip(2);
  };

  public changePlayer(): void {
    this.firstPlayer = !this.firstPlayer;

    const rotation = new THREE.Matrix4();
    rotation.makeRotationZ(Math.PI / ANIMATION_STEP);

    this.animate(() => {
      rotation.multiplyVector3(camera.position);
      camera.lookAt(new THREE.Vector3(0, 0, 0));
    });
  }

  public selectShip(): void {
    const ship = lastItem(this.ships);

    const delta = 2 / ANIMATION_STEP;
    this.animate(() => ship.position.z += delta);
  }

  public settleShip(): void {
    const ship = lastItem(this.ships);

    const delta = 2 / ANIMATION_STEP;
    this.animate(() => ship.position.z -= delta);
  }

  public moveShip(to: [number, number]): void {
    const ship = lastItem(this.ships);
    const finalPos = this.gridPosition(to);

    let deltaPos = new THREE.Vector3();
    deltaPos.subVectors(finalPos, ship.position);
    deltaPos.divideScalar(ANIMATION_STEP);

    this.animate(() => ship.position.add(deltaPos));
  }

  public rotateShip(): void {
    const ship = lastItem(this.ships);

    this.animate(() => ship.rotateZ(Math.PI / 120));
  }

  public selectPin(): void {
    const pin = lastItem(this.pins);

    const delta = 2 / ANIMATION_STEP;
    this.animate(() => pin.position.z += delta);
  }

  public movePin(to: [number, number]): void {
    const pin = lastItem(this.pins);
    const finalPos = this.barrierGridPosition(to);

    let deltaPos = new THREE.Vector3();
    deltaPos.subVectors(finalPos, pin.position);
    deltaPos.divideScalar(ANIMATION_STEP);

    this.animate(() => pin.position.add(deltaPos));
  }

  public settlePin(): void {
    const pin = lastItem(this.pins);

    const delta = 2 / ANIMATION_STEP;
    this.animate(() => pin.position.z -= delta);
  }

  public makeShip(length: 2 | 3 | 4): void {
    const ship = new THREE.Mesh(
      new THREE.BoxBufferGeometry(0.5, 0.8 * length, 0.5),
      new THREE.MeshBasicMaterial({
        color: 0xEEEEEE,
        side: THREE.DoubleSide
      }));
    ship.position.x = 7.5;
    ship.position.y = -9;
    ship.position.z = -0.24;

    this.shipsGroup.add(ship);
  }

  public makePin(): void {
    const pin = new THREE.Mesh(
      new THREE.BoxBufferGeometry(0.5, 1, 0.5),
      new THREE.MeshBasicMaterial({
        color: 0xFF0000,
        side: THREE.DoubleSide,
      })
    )

    pin.position.x = 8.5;
    pin.position.y = 8;
    pin.position.z = -0.8;

    this.pinsGroup.add(pin);
  }

  public locationInGrid(pos: THREE.Vector3): [number, number] | null {
    const currentGridPos = new THREE.Vector3()
      .subVectors(pos, this.currentPlayer().position)
      .sub(this.currentGrid().position)
      .multiplyScalar(BOARD_SIZE / 9)
      .subScalar(0.5)
      .ceil();

    const x = Math.abs(currentGridPos.x - (this.firstPlayer ? 0 : 9));
    const y = Math.abs(currentGridPos.y - (this.firstPlayer ? 0 : 24));

    if (x >= 0 && x < 10 && y >= 0 && y < 10)
      return [Math.floor(x), Math.floor(y)];
    else
      return null;
  }

  public locationInBarrierGrid(pos: THREE.Vector3): [number, number] | null {
    let currentGridPos = new THREE.Vector3()
      .subVectors(pos, this.currentPlayer().position)
      .sub(this.currentGrid().position)
      .multiplyScalar(BOARD_SIZE / 9);

    currentGridPos.x -= 0.5;
    currentGridPos = currentGridPos.ceil();

    const z = Math.abs(currentGridPos.z - 4);
    const x = Math.abs(currentGridPos.x - (this.firstPlayer ? 0 : 9));

    if (z >= 0 && z < 10 && x >= 0 && x < 10)
      return [Math.floor(z), Math.floor(x)];
    else
      return null;
  }

  public currentPlayer(): THREE.Group {
    return this.firstPlayer ? this.player1 : this.player2;
  }

  public currentGrid(): THREE.Object3D {
    return this.currentPlayer().children[1];
  }

  public currentBarrierGrid(): THREE.Mesh {
    return this.currentPlayer().children[3] as THREE.Mesh;
  }
  private makeBoard(): void {
    const material1 = new THREE.MeshPhongMaterial({
      color: 0x2121CE,
      emissive: 0x1A3C8E,
      specular: 0x7BC8F2,
      shininess: 100,
      fog: true,
      side: THREE.DoubleSide,
      vertexColors: THREE.NoColors,
      flatShading: false,
    });
    const material2 = new THREE.MeshPhongMaterial({
      color: 0x004242,
      emissive: 0x1A3C8E,
      specular: 0x7BC8F2,
      shininess: 100,
      fog: true,
      side: THREE.DoubleSide,
      vertexColors: THREE.NoColors,
      flatShading: false,
    });

    this.player1 = this.makePlayerSide(material1);
    this.player2 = this.makePlayerSide(material2);
    this.player2.rotateZ(Math.PI);

    this.scene.add(this.player1);
    this.scene.add(this.player2);
  }

  private makePlayerSide(material: THREE.Material): THREE.Group {
    let player = new THREE.Group();

    const board = new THREE.Mesh(
      new THREE.BoxBufferGeometry(12, 12, 1),
      material,
    );
    board.position.z = -1;
    board.position.y = -6;
    player.add(board);

    const playergrid = this.makeGrid();
    playergrid.position.copy(BattleShipScene.P1GridPosition.clone());
    player.add(playergrid);

    const barrier = new THREE.Mesh(
      new THREE.BoxBufferGeometry(12, 1, 12),
      material
    );
    barrier.position.z = 5.5;
    barrier.position.y = -0.5;
    player.add(barrier);

    const p1barrierGrid = this.makeGrid();
    p1barrierGrid.rotateX(Math.PI / 2);
    p1barrierGrid.position.copy(BattleShipScene.P1BarrierGridPosition.clone());
    player.add(p1barrierGrid);

    const p1box = new THREE.Mesh(
      new THREE.BoxBufferGeometry(2, 2, 1),
      material,
    );
    p1box.position.x = 7.5;
    p1box.position.y = -9;
    p1box.position.z = -1;
    player.add(p1box);

    console.log(player);
    return player;
  }

  private makeGrid(): THREE.Group {
    let grid = new THREE.Group();
    let size = 9 / BOARD_SIZE;
    let white = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide
    });
    let black = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.DoubleSide
    });

    for (let i = 0; i != BOARD_SIZE; i++) {
      for (let j = 0; j != BOARD_SIZE; j++) {
        let mesh = new THREE.Mesh(
          new THREE.PlaneBufferGeometry(size, size),
          ((i + j) & 1) === 0 ? black : white
        );
        mesh.position.copy(new THREE.Vector3(9 / BOARD_SIZE * i, 9 / BOARD_SIZE * j));

        grid.add(mesh);
      }
    }

    return grid;
  }

  private gridPosition(pos: [number, number]): THREE.Vector3 {
    let gridPos = BattleShipScene.P1GridPosition.clone();
    if (!this.firstPlayer) {
      let matrix = new THREE.Matrix4();
      matrix.makeRotationZ(Math.PI);
      matrix.multiplyVector3(gridPos);
    }

    const size = 9 / BOARD_SIZE;

    gridPos.x += pos[0] * size;
    gridPos.y += pos[1] * size;

    return gridPos;
  }

  private barrierGridPosition(pos: [number, number]): THREE.Vector3 {
    let barGridPos = BattleShipScene.P1BarrierGridPosition.clone();
    if (!this.firstPlayer) {
      let matrix = new THREE.Matrix4();
      matrix.makeRotationX(Math.PI / 2);
      matrix.multiplyVector3(barGridPos);
    }

    const size = 9 / BOARD_SIZE;

    barGridPos.z += pos[0] * size;
    barGridPos.x += pos[1] * size;

    return barGridPos;
  }

  private animate(animation: () => void): void {
    let steps = ANIMATION_STEP;

    const animContinuation = () => {
      steps--;
      animation();

      if (steps) setTimeout(animContinuation, 16);
    };

    animContinuation();
  }
}

const enum BSEventKind {
  /*! An object was selected (a ship or a pin). */
  SELECT,
  /*! An object was unselected (a ship or a pin). */
  UNSELECT,
  /*! Mouse movent over the grid. */
  MOVE,
  /*! Rotate a ship. */
  ROTATE,
}

const enum BSMoveLoc {
  SHIP_GRID,
  PIN_GRID,
}

abstract class BattleShipEvent {
  public abstract kind: BSEventKind;
}

class BSSelectEvent extends BattleShipEvent {
  public kind = BSEventKind.SELECT;
}

class BSUnselectEvent extends BattleShipEvent {
  public kind = BSEventKind.UNSELECT;
}

class BSMoveEvent extends BattleShipEvent {
  public kind = BSEventKind.MOVE;

  constructor(public to: [number, number], public loc: BSMoveLoc) {
    super();
  }
}

class BSRotateEvent extends BattleShipEvent {
  public kind = BSEventKind.ROTATE;
}


const enum ORIENTATION {
  HORIZONTAL,
  VERTICAL
}

type Handler<E extends BattleShipEvent> = (event: E) => void;

/*!
 *  Low level event handler. Translates low level interactions such as mouse up to high level
 *  game events.
*/
class BattleShipSensor {
  public selectHandler?: Handler<BSSelectEvent> = undefined;
  public unselectHandler?: Handler<BSUnselectEvent> = undefined;
  public moveHandler?: Handler<BSMoveEvent> = undefined;
  public rotateHandler?: Handler<BSRotateEvent> = undefined;

  private raycaster = new THREE.Raycaster();
  private selecting = false;

  constructor(private scene: BattleShipScene) {
    document.addEventListener('mousemove', eve => this.toMoveEvent(eve), false);
    document.addEventListener('mouseup', () => this.mouseUpEvent(), false);
    document.addEventListener('mousedown', eve => this.mouseDownEvent(eve), false);
  }

  private toMoveEvent(event: MouseEvent): void {
    this.raycaster.setFromCamera({
      x: (event.clientX / window.innerWidth) * 2 - 1,
      y: - (event.clientY / window.innerHeight) * 2 + 1,
    }, camera);

    let gridObjects = this.scene.currentGrid().children;
    let [intersect] = this.raycaster.intersectObjects(gridObjects);
    if (intersect) {
      const intersectionPoint = intersect.point.add(intersect.face!.normal);
      const pos = this.scene.locationInGrid(intersectionPoint);
      if (pos) {
        console.log(`Emitting BSMoveEvent over SHIP_GRID in ${pos}`);
        //this.moveHandler(new BSMoveEvent(pos, BSMoveLoc.SHIP_GRID));
      }
    } else {
      gridObjects = this.scene.currentBarrierGrid().children;
      [intersect] = this.raycaster.intersectObjects(gridObjects);

      if (intersect) {
        const intersectionPoint = intersect.point.add(intersect.face!.normal);
        const pos = this.scene.locationInBarrierGrid(intersectionPoint);
        if (pos) {
          console.log(`Emitting BSMoveEvent over PIN_GRID in ${pos}`);
          //this.moveHandler(new BSMoveEvent(pos, BSMoveLoc.PIN_GRID));
        }
      }
    }
  }

  private mouseUpEvent(): void {
    if (this.selecting && this.unselectHandler) {
      this.selecting = false;
      console.log("Emitting BSUnselectEvent");
      //this.unselectHandler(new BSUnselectEvent);
    }
  }

  private mouseDownEvent(event: MouseEvent): void {
    this.raycaster.setFromCamera({
      x: (event.clientX / window.innerWidth) * 2 - 1,
      y: - (event.clientY / window.innerHeight) * 2 + 1,
    }, camera);

    const currentShip = this.scene.ships[this.scene.ships.length - 1];
    if (this.raycaster.intersectObject(currentShip).length === 0) {
      const currentPin = this.scene.pins[this.scene.pins.length - 1];
      if (!currentPin || this.raycaster.intersectObject(currentPin).length === 0) return;
    }


    switch (event.button) {
      case 0:
        console.log("Emitting BSSelectEvent");
        this.selecting = true;
        return //this.selectHandler(new BSSelectEvent);
      case 2:
        console.log("Emitting BSRotateEvent");
        event.preventDefault();
        return //this.rotateHandler(new BSRotateEvent);
    }
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
  public id: number;
  public size: number;
  public orientation: ORIENTATION
  public position: BoardPosition;
  public damaged: boolean[];
  public damage: number;


  constructor(idx: number, size: number, orientation: ORIENTATION, position: BoardPosition) {
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

  constructor(boardSize: number) {
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
  public settleShip(ship: ShipPiece) {
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

  constructor(settings: Readonly<BattleShipSettings>) {

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
  public kind: BattleShipStateKind.SHIP_CRAFT;
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

  public apply(game: BattleShipGame, event: BattleShipEvent | null) {
    if (event === null) {
      return;
    }

    //this.gameState.apply(event);
  }
}

/**
 * Class is responsible for synchronizing the scene with the game through the BattleShipScene API.
 * Translates game-level events to view events.
 */
class BattleShipPresenter {
  constructor(gameState: AbstractBattleShipState) {

  }

  public sync(sceneState: BattleShipScene, gameState: BattleShipGame) {

  }
}

/**
 * Battleship game main class
 */
class BattleShip {
  private settings: Readonly<BattleShipSettings>;
  private game: BattleShipGame;
  private rules: BattleShipRules;
  private view: BattleShipScene;
  private sensor: BattleShipSensor;
  private viewPresenter: BattleShipPresenter;

  constructor(scene: THREE.Scene) {
    this.settings = new BattleShipSettings();

    this.game = new BattleShipGame(this.settings);
    this.rules = new BattleShipRules(this.settings);
    this.view = new BattleShipScene(scene);
    this.sensor = new BattleShipSensor(this.view);
    this.viewPresenter = new BattleShipPresenter(this.rules.getState());
  }

  /**
   * Game loop update
   * 1) Generate game events from raw user input
   * 2) Update game state from game event occurence following game rules
   * 3) Synchronize game view with updated state
   */
  public update() {
    //const userEvent = this.sensor.sense(this.view);
    //this.rules.apply(this.game, userEvent);
    //this.viewPresenter.sync(this.view);
  }
}

//
// Setup camera
//

let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

camera.position.z = 12;
camera.position.y = -16;
camera.up = new THREE.Vector3(0, 0, 1);
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
lights[0] = new THREE.PointLight(0xffffff, 1, 0);
lights[1] = new THREE.PointLight(0xffffff, 1, 0);
lights[2] = new THREE.PointLight(0xffffff, 1, 0);

lights[0].position.set(0, 20, 0);
lights[1].position.set(10, 20, 10);
lights[2].position.set(-10, -20, -10);

scene.add(lights[0]);
scene.add(lights[1]);
scene.add(lights[2]);

//
// Add ambient light to scene
//

let amblight = new THREE.AmbientLight(0x444444);
scene.add(amblight);

//
// Create orbit controls for observation and resize action
//

//let controls = new THREE.OrbitControls(camera);
//controls.update();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}, false);

//
// Animate
//

const run = () => {
  requestAnimationFrame(run);

  renderer.render(scene, camera);
};

run();
