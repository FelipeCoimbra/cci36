import THREE from "three";

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

const lastItem = <T>(xs: T[]): T => xs[xs.length - 1];

class BSAnimation {
  private _finished = false;

  constructor(private update: () => boolean,
              private finish: () => void) {
    this.trigger();
  }

  public cancel(): void {
    this._finished = true;
    this.finish();
  }

  public finished(): boolean {
    return this._finished;
  }

  private trigger() {
    setTimeout(() => this.run(), 16);
  }

  private run() {
    if (!this._finished && this.update()) {
      this.trigger();
    } else {
      this.cancel();
    }
  }
}

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

  get pins(): THREE.Object3D[] {
    return this.pinsGroup.children;
  }

  private firstPlayer: boolean = true;

  constructor(private scene: THREE.Scene) {
    this.makeBoard();
    this.shipsGroup = new THREE.Group();
    this.pinsGroup = new THREE.Group();

    this.scene.add(this.shipsGroup);
    this.scene.add(this.pinsGroup);
  };

  public changePlayer(): Promise<void> {
    this.firstPlayer = !this.firstPlayer;

    let steps = 60;
    const rotation = new THREE.Matrix4();
    rotation.makeRotationZ(Math.PI / steps);

    return new Promise((resolve) =>
      new BSAnimation(() => {
        camera.position.applyMatrix4(rotation);
        camera.lookAt(new THREE.Vector3(0, 0, 0));
        return --steps > 0;
      }, resolve));
  }

  public selectShip(): void {
    const ship = lastItem(this.ships);

    ship.position.z += 2;
  }

  public settleShip(): void {
    const ship = lastItem(this.ships);

    ship.position.z -= 1;
  }

  public moveShip(to: [number, number]): void {
    const ship = lastItem(this.ships);
    ship.position.copy(this.gridPosition(to));
  }

  public rotateShip(): void {
    const ship = lastItem(this.ships);

    ship.rotateZ(Math.PI / 2);
  }

  public selectPin(): void {
    const pin = lastItem(this.pins);

    pin.position.z += 2;
  }

  public movePin(to: [number, number]): void {
    const pin = lastItem(this.pins);
    pin.position.copy(this.barrierGridPosition(to));
  }

  public settlePin(): void {
    const pin = lastItem(this.pins);
    pin.position.z -= 1;
  }

  public makeShip(length: ShipSize): void {
    const ship = new THREE.Mesh(
      new THREE.BoxBufferGeometry(0.5, length, 0.5),
      new THREE.MeshBasicMaterial({
        color: 0xEEEEEE,
        side: THREE.DoubleSide
      }));

    const curP = this.currentPlayer().children;
    ship.position.copy(curP[curP.length - 1].position);

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

    const curP = this.currentPlayer().children;
    pin.position.copy(curP[curP.length - 1].position);

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

  public equals(other: BSMoveEvent): boolean {
    return this.to[0] === other.to[0]
      && this.to[1] === other.to[1]
      && this.loc === other.loc;
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
  private lastMoveEvent?: BSMoveEvent;

  constructor(private scene: BattleShipScene) {
    document.onmousemove = e => this.moveEvent(e);
    document.onmouseup = e => this.mouseUpEvent(e);
    document.onmousedown = e => this.mouseDownEvent(e);
    document.oncontextmenu = () => false;
  }

  private moveEvent(event: MouseEvent): void {
    this.raycaster.setFromCamera({
      x: (event.clientX / window.innerWidth) * 2 - 1,
      y: - (event.clientY / window.innerHeight) * 2 + 1,
    }, camera);

    let nextEvent: BSMoveEvent | undefined;
    let gridObjects = this.scene.currentGrid().children;
    let [intersect] = this.raycaster.intersectObjects(gridObjects);
    if (intersect) {
      const intersectionPoint = intersect.point.add(intersect.face!.normal);
      const pos = this.scene.locationInGrid(intersectionPoint);
      if (pos) {
        nextEvent = new BSMoveEvent(pos, BSMoveLoc.SHIP_GRID);
      }
    } else {
      gridObjects = this.scene.currentBarrierGrid().children;
      [intersect] = this.raycaster.intersectObjects(gridObjects);

      if (intersect) {
        const intersectionPoint = intersect.point.add(intersect.face!.normal);
        const pos = this.scene.locationInBarrierGrid(intersectionPoint);
        if (pos) {
          nextEvent = new BSMoveEvent(pos, BSMoveLoc.PIN_GRID);
        }
      }
    }

    if (nextEvent) {
      if (this.lastMoveEvent && nextEvent.equals(this.lastMoveEvent)) {
        return
      }

      const emit = !this.lastMoveEvent;

      this.lastMoveEvent = nextEvent;
      if (emit) {
        setTimeout(() => {
          console.log(`Emitting BSMoveEvent over ${this.lastMoveEvent!.loc} in ${this.lastMoveEvent!.to}`);
          if (this.moveHandler) this.moveHandler(this.lastMoveEvent!);
          this.lastMoveEvent = undefined;
        }, 100);
      }
    }
  }

  private mouseUpEvent(e: MouseEvent): void {
    if (this.selecting && this.unselectHandler && e.button === 0) {
      this.selecting = false;
      console.log("Emitting BSUnselectEvent");
      this.unselectHandler(new BSUnselectEvent);
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
        if (!this.selectHandler) return;

        console.log("Emitting BSSelectEvent");
        this.selecting = true;
        return this.selectHandler(new BSSelectEvent);
      case 2:
        if (!this.rotateHandler) return;

        console.log("Emitting BSRotateEvent");
        return this.rotateHandler(new BSRotateEvent);
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
  WATER = 'WATER',
  SHIP = 'SHIP',
}

/**
 * Generic board cell
 */
abstract class AbstractBoardCell {
  public abstract cellKind: BoardCellKind;
  public attacked: boolean = false;
}

/**
 * Board cell filled with water
 */
class WaterBoardCell extends AbstractBoardCell {
  public cellKind:BoardCellKind.WATER;
  constructor() {
    super();
    this.cellKind = BoardCellKind.WATER;
  }
}

/**
 * Board cell occupied by a ship
 */
class ShipBoardCell extends AbstractBoardCell {
  public cellKind:BoardCellKind.SHIP;
  public shipId: number;
  public shipPart: number;

  constructor(shipId: number, shipPart: number) {
    super();
    this.cellKind = BoardCellKind.SHIP;
    this.shipId = shipId;
    this.shipPart = shipPart;
  }
}

type BattleShipBoardCell = WaterBoardCell | ShipBoardCell;

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
      if (y - (ship.size - 1)/2 < 0 || y + (ship.size - 1)/2 >= this.boardSize) {
        throw new Error(`Ship ${ship.id} with size ${ship.size} out of bounds.`)
      }

      for (let pos = y - (ship.size - 1)/2; pos <= y + (ship.size - 1)/2; pos++) {
        if (this.board[x][pos].cellKind === BoardCellKind.SHIP) {
          throw new Error(`Ship ${ship.id} with size ${ship.size} already occupied.`)
        }
      }

      for (let pos = y - (ship.size - 1)/2; pos <= y + (ship.size - 1)/2; pos++) {
        delete this.board[x][pos];
        this.board[x][pos] = new ShipBoardCell(ship.id, pos);
      }
    } else if (ship.orientation === ORIENTATION.VERTICAL) {
      if (x - (ship.size - 1)/2 < 0 || x + (ship.size - 1)/2 >= this.boardSize) {
        throw new Error(`Ship ${ship.id} with size ${ship.size} out of bounds.`)
      }

      for (let pos = x - (ship.size - 1)/2; pos <= x + (ship.size - 1)/2; pos++) {
        if (this.board[pos][y].cellKind === BoardCellKind.SHIP) {
          throw new Error(`Ship ${ship.id} with size ${ship.size} already occupied.`)
        }
      }

      for (let pos = x - (ship.size - 1)/2; pos <= x + (ship.size - 1)/2; pos++) {
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
  public attack(target: BoardPosition): BoardPosition | null {
    const x = target[0], y = target[1];
    if (x < 0 || y < 0 || x >= this.boardSize || y >= this.boardSize) {
      throw new Error(`Attack position (${x}, ${y}) out of bounds`);
    }
    const cell = this.board[x][y];
    if (cell.attacked) {
      throw new Error(`Attack position (${x}, ${y}) already attacked`);
    }
    cell.attacked = true;
    return cell.cellKind === BoardCellKind.SHIP ? [cell.shipId, cell.shipPart]
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

type ShipSize = 1 | 3 | 5;

/**
 * Wrapper class for generic game constants.
 */
class BattleShipSettings {
  public boardSize = 10 as const;
  public playerShipCount = 5 as const;
  public shipCountByType = [2, 2, 1];
  public shipSizeByType = [1, 3, 5] as ShipSize[];

  constructor() {
    for (let size of this.shipSizeByType) {
      if (size%2 === 0) {
        throw new Error(`Ships with even size are not allowed.`);
      }
    }
  }

  public buildShipSizeSequence(): ShipSize[] {
    const sizeSequence = [] as ShipSize[];
    for (let shipType in this.shipCountByType) {
      const shipCount = this.shipCountByType[shipType];
      for (let shipTypeCreated = 0; shipTypeCreated < shipCount; shipTypeCreated++) {
        sizeSequence.push(this.shipSizeByType[shipType]);
      }
    }
    return sizeSequence;
  }
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
  public attack(target: BoardPosition): BoardPosition | null {
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
  public settleShip(player: PLAYER, shipSize: ShipSize, shipOrientation: ORIENTATION, shipPosition: BoardPosition) {
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
  SHIP_CRAFTING = 'SHIP CRAFTING',
  BATTLE = 'BATTLE',
  GAME_OVER = 'GAME OVER',
}

/**
 * Class to represent a generic game state
 */
abstract class AbstractBattleShipState {
  public abstract kind: BattleShipStateKind; // Game state kind
  public abstract player: PLAYER; // Current active player

  public abstract clone(): AbstractBattleShipState;
}

/**
 * Class that represents the moment of the game where players place their ships
 */
class ShipCraftState implements AbstractBattleShipState {
  public kind: BattleShipStateKind.SHIP_CRAFTING;
  public player: PLAYER;
  public selected: boolean;
  public shipSizeSequence: ShipSize[];
  public shipSizeIterator: number;
  public orientation: ORIENTATION;
  public pos: BoardPosition | null;

  constructor(shipSizeSequence: ShipSize[], player: PLAYER) {
    this.kind = BattleShipStateKind.SHIP_CRAFTING;
    this.player = player;
    this.selected = false;
    this.shipSizeSequence = shipSizeSequence;
    this.shipSizeIterator = 0;
    this.orientation = ORIENTATION.HORIZONTAL;
    this.pos = null; // Initially the crafted ship is out of the grid
  }

  public clone(): ShipCraftState {
    const cloneState = new ShipCraftState(this.shipSizeSequence, this.player);
    cloneState.selected = this.selected;
    cloneState.shipSizeIterator = this.shipSizeIterator;
    cloneState.orientation = this.orientation;
    cloneState.pos = this.pos;

    return cloneState;
  }

  public nextShipSize(): ShipSize | null {
    if (this.shipSizeIterator === this.shipSizeSequence.length) return null;
    const size = this.shipSizeSequence[this.shipSizeIterator++];
    return size;
  }

  public reset() {
    this.selected = false;
    this.shipSizeIterator = 0;
    this.orientation = ORIENTATION.HORIZONTAL;
    this.pos = null;
  }

}

/**
 * Class that represents the moment of the game where players try to destroy each
 * one's ships in turns.
 */
class BattleState implements AbstractBattleShipState {
  public kind: BattleShipStateKind.BATTLE;
  public player: PLAYER;
  public selected: boolean;
  public pos: BoardPosition | null;

  constructor() {
    this.kind = BattleShipStateKind.BATTLE;
    this.player = PLAYER.P1;
    this.selected = false;
    this.pos = null; // Initially the crafted pin is out of the grid
  }

  public clone(): BattleState {
    const cloneState = new BattleState();
    cloneState.selected = this.selected;
    cloneState.pos = this.pos;

    return cloneState;
  }

  public reset() {
    this.selected = false;
    this.pos = null;
  }
}

/**
 * Class that represents the end of the game.
 */
class GameOverState implements AbstractBattleShipState {
  public kind: BattleShipStateKind.GAME_OVER;
  public player: PLAYER; // Player that won the match

  constructor(winningPlayer: PLAYER) {
    this.kind = BattleShipStateKind.GAME_OVER;
    this.player = winningPlayer;
  }

  public clone(): GameOverState {
    return new GameOverState(this.player);
  }
}

/** Rule states */
type BattleShipState = ShipCraftState | BattleState | GameOverState;

/**
 * Class responsible for updating game state.
 * Created for decoupling game state update from game rules.
 */
class BattleShipRules {
  private gameState: BattleShipState;

  constructor(gameSettings: BattleShipSettings) {

    this.gameState = new ShipCraftState(gameSettings.buildShipSizeSequence(), PLAYER.P1);
  }

  public getState(): Readonly<BattleShipState> {
    return this.gameState;
  }

  public init(): [BattleShipCommand [], BattleShipControl[]] {
    return [this.initView(), this.initInteraction()]
  }

  private initView(): BattleShipCommand [] {
    if (this.gameState.kind !== BattleShipStateKind.SHIP_CRAFTING) {
      throw new Error(`BattleShip should start in the Ship crafting stage.`);
    }
    // Game starts with a ship already available to be placed
    const size = this.gameState.nextShipSize();
    let initCmd;
    if (size) {
      initCmd = new MakeShipCmd(size);
    } else {
      initCmd = new ErrorCmd();
      initCmd.log = `Player 1 has no ships.`
    }
    return [initCmd];
  }

  private initInteraction(): BattleShipControl[] {
    return [new EnableSelection(), new EnableUnselection(), new EnableRotation(), new EnableMove()];
  }

  public apply(event: BattleShipEvent, game: BattleShipGame): [BattleShipCommand [], BattleShipControl[]] {
    let cmds = [] as BattleShipCommand [];

    const beforeState = this.gameState.clone();

    if (event.kind === BSEventKind.SELECT) {
      console.log('Got select event');
      cmds = this.processSelect(game);
    } else if (event.kind === BSEventKind.UNSELECT) {
      console.log('Got unselect event');
      cmds = this.processUnselect(game);
    } else if (event.kind === BSEventKind.ROTATE) {
      console.log('Got rotate event');
      cmds = this.processRotate(game);
    } else if (event.kind === BSEventKind.MOVE) {
      console.log('Got move event');
      cmds = this.processMove(game, (event as BSMoveEvent).loc, (event as BSMoveEvent).to);
    }

    const controls = this.generateControls(beforeState);

    return [cmds, controls];
  }

  /**
   * Generate control signals to manage the BattleShipSensor event triggering
   * @param beforeState The previous BattleShipState the game was in
   * @returns List of BattleShipControl, the control signals to manage event handling
   */
  private generateControls(beforeState: BattleShipState): BattleShipControl[] {
    if (beforeState.kind === BattleShipStateKind.SHIP_CRAFTING && beforeState.player === PLAYER.P2
      && this.gameState.player === PLAYER.P1) {
      return [new DisableRotation()];
    }

    if (beforeState.kind === BattleShipStateKind.BATTLE && this.gameState.kind === BattleShipStateKind.GAME_OVER) {
      return [new DisableSelection(), new DisableUnselection, new DisableMove()];
    }

    return [];
  }

  private processSelect(game: BattleShipGame): BattleShipCommand [] {
    const cmds = [] as BattleShipCommand [];
    if (this.gameState.kind === BattleShipStateKind.SHIP_CRAFTING && !this.gameState.selected) {
      cmds.push(new SelectShipCmd());
      this.gameState.selected = true;
    }

    if (this.gameState.kind === BattleShipStateKind.BATTLE && !this.gameState.selected) {
      cmds.push(new SelectPinCmd());
      this.gameState.selected = true;
    }

    return cmds;
  }

  private processUnselect(game: BattleShipGame): BattleShipCommand [] {
    const cmds = [] as BattleShipCommand [];
    if (this.gameState.kind === BattleShipStateKind.SHIP_CRAFTING && this.gameState.selected) {
      const player = this.gameState.player;
      const shipSize = this.gameState.shipSizeSequence[this.gameState.shipSizeIterator];
      const orientation = this.gameState.orientation;
      const pos = this.gameState.pos;

      this.gameState.selected = false; // Automatically unselect to maintain coherence

      if (pos === null) {
        // No position yet, just lay it back down
        cmds.push(new SettleShipCmd());
      } else {
        try {
          game.settleShip(player, shipSize, orientation, pos);
        } catch (e) {
          const errorCmd = new ErrorCmd();
          errorCmd.log = 'Error trying to settle ship.'
            + `\nPlayer: ${player}`
            + `\nSize: ${shipSize}`
            + `\nOrientation: ${orientation}`
            + `\nPosition: ${pos}`
            + `\n\n${e.message}`;
          
          cmds.push(errorCmd);
          return cmds;
        }
  
        cmds.push(new SettleShipCmd());
        let nextSize = this.gameState.nextShipSize();
        if (nextSize !== null) {
          cmds.push(new MakeShipCmd(nextSize));
        } else if (this.gameState.player === PLAYER.P1) {
          // Restart state now from player 2 perspective
          cmds.push(new ChangePlayerCmd());
          this.gameState.reset();
          this.gameState.player = PLAYER.P2;
  
          nextSize = this.gameState.nextShipSize()
          if (nextSize === null) {
            const p2InitCmd = new ErrorCmd();
            p2InitCmd.log = `Game settings of Player 2 has no ships.`;
            cmds.push(p2InitCmd);
          } else {
            cmds.push(new MakeShipCmd(nextSize));
          }
          console.log(`Player ${this.gameState.player}\nSize ${nextSize}\n${cmds}`);
        } else {
          this.gameState = new BattleState();
        }
      }
    } else if (this.gameState.kind === BattleShipStateKind.BATTLE && this.gameState.selected) {
      const player = this.gameState.player;
      const pos = this.gameState.pos;
      let gameEnded = false;

      if (pos === null) {
        // No position yet, just lay it back down
        cmds.push(new SettlePinCmd());
        this.gameState.selected = false;
      } else {
        try {
          gameEnded = game.attack(player, pos);
        } catch (e) {
          const errorCmd = new ErrorCmd();
          errorCmd.log = 'Error trying to attack position.'
            + `\nPlayer: ${player}`
            + `\nPosition: ${pos}`
            + `\n\n${e.message}`;
  
          cmds.push(errorCmd);
          return cmds;
        }
  
        if (!gameEnded) {
          cmds.push(new SettlePinCmd());
          this.gameState.reset();
          cmds.push(new ChangePlayerCmd());
          cmds.push(new MakePinCmd());
        } else {
          this.gameState = new GameOverState(player);
        }
      } 
    }

    return cmds;
  }

  private processRotate(game: BattleShipGame): BattleShipCommand [] {
    const cmds = [] as BattleShipCommand [];
    if (this.gameState.kind === BattleShipStateKind.SHIP_CRAFTING && this.gameState.selected) {
      this.gameState.orientation = this.gameState.orientation === ORIENTATION.VERTICAL ?
        ORIENTATION.HORIZONTAL : ORIENTATION.VERTICAL;
      cmds.push(new RotateShipCmd());
    }
    return cmds;
  }

  private processMove(game: BattleShipGame, loc: BSMoveLoc, to: BoardPosition): BattleShipCommand [] {
    const cmds = [] as BattleShipCommand [];
    if (this.gameState.kind === BattleShipStateKind.SHIP_CRAFTING && loc === BSMoveLoc.SHIP_GRID
      && this.gameState.selected) {
      this.gameState.pos = to;
      cmds.push(new MoveShipCmd(to));
    }

    if (this.gameState.kind === BattleShipStateKind.BATTLE && loc === BSMoveLoc.PIN_GRID && this.gameState.selected) {
      this.gameState.pos = to;
      cmds.push(new MovePinCmd(to));
    }

    return cmds;
  }
}

enum BattleShipCommandKind {
  CHANGE_PLAYER = 'CHANGE PLAYER',
  MAKE_PIN = 'MAKE PIN',
  MAKE_SHIP = 'MAKE SHIP',
  MOVE_PIN = 'MOVE PIN',
  MOVE_SHIP = 'MOVE SHIP',
  ROTATE_SHIP = 'ROTATE SHIP',
  SELECT_PIN = 'SELECT PIN',
  SELECT_SHIP = 'SELECT SHIP',
  SETTLE_PIN = 'SETTLE PIN',
  SETTLE_SHIP = 'SETTLE SHIP',

  ERROR = 'ERROR',
}

/**
 * Abstract class for planning interaction of the Presenter with the Scene
 */
abstract class AbstractCommand {
  public abstract kind: BattleShipCommandKind;
  public log?: string;
}

class ChangePlayerCmd implements AbstractCommand {
  public kind: BattleShipCommandKind.CHANGE_PLAYER;
  constructor () {
    this.kind = BattleShipCommandKind.CHANGE_PLAYER;
  }
}

class MakeShipCmd implements AbstractCommand {
  public kind: BattleShipCommandKind.MAKE_SHIP;
  public size: ShipSize;
  constructor(size: ShipSize) {
    this.kind = BattleShipCommandKind.MAKE_SHIP;
    this.size = size;
  }
}

class MakePinCmd implements AbstractCommand {
  public kind: BattleShipCommandKind.MAKE_PIN;
  constructor () {
    this.kind = BattleShipCommandKind.MAKE_PIN;
  }
}

class SelectPinCmd implements AbstractCommand {
  public kind: BattleShipCommandKind.SELECT_PIN;
  constructor () {
    this.kind = BattleShipCommandKind.SELECT_PIN;
  }
}

class SelectShipCmd implements AbstractCommand {
  public kind: BattleShipCommandKind.SELECT_SHIP;
  constructor () {
    this.kind = BattleShipCommandKind.SELECT_SHIP;
  }
}

class MovePinCmd implements AbstractCommand {
  public kind: BattleShipCommandKind.MOVE_PIN;
  public to: BoardPosition;
  constructor(to: BoardPosition) {
    this.kind = BattleShipCommandKind.MOVE_PIN;
    this.to = to;
  }
}

class RotateShipCmd implements AbstractCommand {
  public kind: BattleShipCommandKind.ROTATE_SHIP;
  constructor () {
    this.kind = BattleShipCommandKind.ROTATE_SHIP;
  }
}

class MoveShipCmd implements AbstractCommand {
  public kind: BattleShipCommandKind.MOVE_SHIP;
  public to: BoardPosition;
  constructor(to: BoardPosition) {
    this.kind = BattleShipCommandKind.MOVE_SHIP;
    this.to = to;
  }
}

class SettlePinCmd implements AbstractCommand {
  public kind: BattleShipCommandKind.SETTLE_PIN;
  constructor () {
    this.kind = BattleShipCommandKind.SETTLE_PIN;
  }
}

class SettleShipCmd implements AbstractCommand {
  public kind: BattleShipCommandKind.SETTLE_SHIP;
  constructor () {
    this.kind = BattleShipCommandKind.SETTLE_SHIP;
  }
}

class ErrorCmd implements AbstractCommand {
  public kind: BattleShipCommandKind.ERROR;
  public log = 'An error occurred.';
  constructor () {
    this.kind = BattleShipCommandKind.ERROR;
  }
}

type BattleShipCommand = ChangePlayerCmd | MakeShipCmd | MakePinCmd | SelectPinCmd 
| SelectShipCmd | MovePinCmd | RotateShipCmd | MoveShipCmd | SettlePinCmd | SettleShipCmd 
| ErrorCmd;

/**
 * Class is responsible for synchronizing the scene with the game through the BattleShipScene API.
 * Translates game-level events to view events.
 */
class BattleShipPresenter {
  private view: BattleShipScene;
  private execution: Promise<void>;
  constructor(scene: BattleShipScene) {
    this.view = scene;
    this.execution = Promise.resolve();
  }

  public update = async (cmds: BattleShipCommand[]) => {
    for (let cmd of cmds) {
      console.log(`Send command request ${cmd.kind}`);
      if (cmd.kind === BattleShipCommandKind.ERROR) {
        console.log(`Command ${cmd.kind}:\n${cmd.log}`)
      }
      if (cmd.kind === BattleShipCommandKind.CHANGE_PLAYER) {
        this.execution = this.execution.then(() => this.view.changePlayer());
      } else if (cmd.kind === BattleShipCommandKind.MAKE_SHIP) {
        const size = cmd.size;
        this.execution = this.execution.then(() => this.view.makeShip(size));
      } else if (cmd.kind === BattleShipCommandKind.MAKE_PIN) {
        this.execution = this.execution.then(() => this.view.makePin());
      } else if (cmd.kind === BattleShipCommandKind.SELECT_PIN) {
        this.execution = this.execution.then(() => this.view.selectPin());
      } else if (cmd.kind === BattleShipCommandKind.SELECT_SHIP) {
        this.execution = this.execution.then(() => this.view.selectShip());
      } else if (cmd.kind === BattleShipCommandKind.MOVE_PIN) {
        const to = cmd.to;
        this.execution = this.execution.then(() => this.view.movePin(to));
      } else if (cmd.kind === BattleShipCommandKind.ROTATE_SHIP) {
        this.execution = this.execution.then(() => this.view.rotateShip());
      } else if (cmd.kind === BattleShipCommandKind.MOVE_SHIP) {
        const to = cmd.to;
        this.execution = this.execution.then(() => this.view.moveShip(to));
      } else if (cmd.kind === BattleShipCommandKind.SETTLE_PIN) {
        this.execution = this.execution.then(() => this.view.settlePin());
      } else if (cmd.kind === BattleShipCommandKind.SETTLE_SHIP) {
        this.execution = this.execution.then(() => this.view.settleShip());
      }
    }
  }
}

enum BattleShipControlKind {
  ENABLE_SELECTION = 'ENABLE_SELECTION',
  DISABLE_SELECTION = 'DISABLE_SELECTION',
  ENABLE_UNSELECTION = 'ENABLE_UNSELECTION',
  DISABLE_UNSELECTION = 'DISABLE_UNSELECTION',
  ENABLE_ROTATION = 'ENABLE_ROTATION',
  DISABLE_ROTATION = 'DISABLE_ROTATION',
  ENABLE_MOVE = 'ENABLE_MOVE',
  DISABLE_MOVE = 'DISABLE_MOVE',
}

/**
 * Abstract class for planning management of user interactions
 */
abstract class BattleShipControl {
  public abstract kind: BattleShipControlKind;
  public log?: string;
}

class EnableSelection extends BattleShipControl {
  public kind = BattleShipControlKind.ENABLE_SELECTION;
}

class DisableSelection extends BattleShipControl {
  public kind = BattleShipControlKind.DISABLE_SELECTION;
}

class EnableUnselection extends BattleShipControl {
  public kind = BattleShipControlKind.ENABLE_UNSELECTION;
}

class DisableUnselection extends BattleShipControl {
  public kind = BattleShipControlKind.DISABLE_UNSELECTION;
}

class EnableRotation extends BattleShipControl {
  public kind = BattleShipControlKind.ENABLE_ROTATION;
}

class DisableRotation extends BattleShipControl {
  public kind = BattleShipControlKind.DISABLE_ROTATION;
}

class EnableMove extends BattleShipControl {
  public kind = BattleShipControlKind.ENABLE_MOVE;
}

class DisableMove extends BattleShipControl {
  public kind = BattleShipControlKind.DISABLE_MOVE;
}


/**
 * Battleship game main class
 */
class BattleShip {
  private game: BattleShipGame;
  private rules: BattleShipRules;
  private sensor: BattleShipSensor;
  private viewPresenter: BattleShipPresenter;

  constructor(settings: BattleShipSettings, sensor: BattleShipSensor, presenter: BattleShipPresenter) {

    this.game = new BattleShipGame(settings);
    this.rules = new BattleShipRules(settings);

    this.sensor = sensor;
    this.viewPresenter = presenter;
  }

  public async init() {
    const [initCmds, initControls] = await this.rules.init();
    this.viewPresenter.update(initCmds);
    this.updateSensor(initControls);
  }

  /**
   * Event based update
   * 1) Update game state from interaction event occurence following game rules
   * 2) Synchronize game view with command signals from game logic
   * 3) Update event handling with control signals from game logic
   */
  public async update(event: BattleShipEvent) {
    const [cmds, controls] = await this.rules.apply(event, this.game);
    this.viewPresenter.update(cmds);
    this.updateSensor(controls);
  }

  private async updateSensor(controls: BattleShipControl[]) {
    for (let control of controls) {
      console.log(`Executing control signal ${control.kind}`);
      if (control.log) {
        console.log(`Control Signal ${control.kind}:\n${control.log}`)
      }

      if (control.kind === BattleShipControlKind.ENABLE_SELECTION) {
        this.sensor.selectHandler = (event:BattleShipEvent) => this.update(event);
      } else if (control.kind === BattleShipControlKind.DISABLE_SELECTION) {
        this.sensor.selectHandler = undefined;
      } else if (control.kind === BattleShipControlKind.ENABLE_UNSELECTION) {
        this.sensor.unselectHandler = (event:BattleShipEvent) => this.update(event);
      } else if (control.kind === BattleShipControlKind.DISABLE_UNSELECTION) {
        this.sensor.unselectHandler = undefined;
      } else if (control.kind === BattleShipControlKind.ENABLE_ROTATION) {
        this.sensor.rotateHandler = (event:BattleShipEvent) => this.update(event);
      } else if (control.kind === BattleShipControlKind.DISABLE_ROTATION) {
        this.sensor.rotateHandler = undefined;
      } else if (control.kind === BattleShipControlKind.ENABLE_MOVE) {
        this.sensor.moveHandler = (event:BattleShipEvent) => this.update(event);
      } else if (control.kind === BattleShipControlKind.DISABLE_MOVE) {
        this.sensor.moveHandler = undefined;
      } else {
        throw new Error(`Unsupported Control Signal ${control.kind}`);
      }
    }
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
// Setup scene and event handling
//

const scene = new THREE.Scene();
const gameScene = new BattleShipScene(scene);
const gameEventHandler = new BattleShipSensor(gameScene);
const gameViewPresenter = new BattleShipPresenter(gameScene);

const gameSettings = new BattleShipSettings() as Readonly<BattleShipSettings>;
const game = new BattleShip(gameSettings, gameEventHandler, gameViewPresenter);
game.init();

//

var lights = [];
lights[0] = new THREE.PointLight(0xffffff, 1, 0);
lights[1] = new THREE.PointLight(0xffffff, 1, 0);
lights[2] = new THREE.PointLight(0xffffff, 1, 0);

lights[0].position.set(0, 200, 0);
lights[1].position.set(100, 200, 100);
lights[2].position.set(- 100, - 200, - 100);

scene.add(lights[0]);
scene.add(lights[1]);
scene.add(lights[2]);

//
// Add ambient light to scene
//

let amblight = new THREE.AmbientLight(0x444444);
scene.add(amblight)

//
// Create orbit controls for observation and resize action
//

// let controls = new THREE.OrbitControls(camera);
// controls.update();

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
