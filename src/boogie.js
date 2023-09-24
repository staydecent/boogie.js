let _called = false;

const input = {
  M_LEFT: -1,
  M_MIDDLE: -2,
  M_RIGHT: -3,
  M_WHEELDOWN: -4,
  M_WHEELUP: -5,

  TAB: 9,
  ENTER: 13,
  ESC: 27,
  SPACE: 32,
  LEFT_ARROW: 37,
  UP_ARROW: 38,
  RIGHT_ARROW: 39,
  DOWN_ARROW: 40,

  _bindings: {},
  _down: {},
  _pressed: {},
  _released: [],
  _mouse: { x: 0, y: 0 },

  eventCode: function (e) {
    if (e.type === "keydown" || e.type === "keyup") {
      return e.keyCode;
    } else if (e.type === "mousedown" || e.type === "mouseup") {
      if (e.button === 0) return this.M_LEFT;
      else if (e.button === 1) return this.M_MIDDLE;
      else if (e.button === 2) return this.M_RIGHT;
    } else if (e.type === "mousewheel") {
      return e.wheel > 0 ? this.M_WHEELUP : this.M_WHEELDOWN;
    }
  },
  bind: function (key, action) {
    this._bindings[key] = action;
  },
  onkeydown: function (e) {
    var code, action;

    code = this.eventCode(e);
    action = this._bindings[code];

    if (!action) return;

    if (!this._down[action]) this._pressed[action] = true;
    this._down[action] = true;

    e.stopPropagation();
    e.preventDefault();
  },
  onkeyup: function (e) {
    var code, action;

    code = this.eventCode(e);
    action = this._bindings[code];

    if (!action) return;

    if (this._down[action]) this._pressed[action] = false;
    this._down[action] = false;
    this._released.push(action);

    e.stopPropagation();
    e.preventDefault();
  },
  clearPressed: function () {
    var actionLen = this._released.length,
      action;

    for (var i = 0; i < actionLen; i++) {
      action = this._released[i];
      this._down[action] = false;
    }

    this._released = [];
    this._pressed = {};
  },
  pressed: function (action) {
    return this._pressed[action];
  },
  down: function (action) {
    return this._down[action];
  },
  released: function (action) {
    return [].indexOf.call(this._released, action) >= 0;
  },
  onmousemove: function (e) {
    if (window.pageXOffset !== undefined) {
      this._mouse.x = e.clientX + window.pageXOffset;
      this._mouse.y = e.clientY + window.pageYOffset;
    } else {
      ev = window.event;
      d = document.documentElement;
      b = document.body;
      this._mouse.x = ev.clientX + d.scrollLeft + b.scrollLeft;
      this._mouse.y = ev.clientY + d.scrollTop + b.scrollTop;
    }
  },
  onmousedown: function (e) {
    return this.onkeydown(e);
  },
  onmouseup: function (e) {
    return this.onkeyup(e);
  },
  onmousewheel: function (e) {
    this.onkeydown(e);
    this.onkeyup(e);
  },
  oncontextmenu: function (e) {
    if (this._bindings[this.M_RIGHT]) {
      e.stopPropagation();
      e.preventDefault();
    }
  },
};

export function boogie(initialState, debug) {
  if (_called) {
    throw new E("boogie() can only be invoked once!");
  }
  _called = true;

  const store = createStore(Object.assign({}, initialState, { scene: 0 }));

  // game loop state
  // underscores are used to denote parent scope
  let _scenes = [];
  let _running = false;
  let _frameRequest = null;
  let _lastStep = null;

  return {
    scene,
    input,
    start,
    stop,
    store,
  };

  function scene(canvas, w, h) {
    const context = canvas.getContext("2d");

    let width = w || window.innerWidth;
    let height = h || window.innerHeight;

    let entities = [];

    window.onresize = () => {
      canvas.width = width;
      canvas.height = height;
      width = canvas.width;
      height = canvas.height;
    };

    window.onresize();

    _scenes.push((dt, gameState) => {
      context.clearRect(0, 0, canvas.width, canvas.height);

      // run all entity updates, merge returned gameState
      let newState = entities.reduce((acc, e) => {
        Object.assign(acc, e.update(dt, gameState, input));
        e.draw(context, gameState);
        return acc;
      }, gameState);

      return newState;
    });

    return {
      add(entity) {
        if (entity.key == null) {
          throw E("Entity must contain a key.");
        }

        const keys = Object.keys(entity);
        const entityState = {};
        for (let x = 0; x < keys.length; x++) {
          let k = keys[x];
          if (k === "key" || typeof entity[k] === "function") {
            continue;
          }
          entityState[k] = entity[k];
        }

        debug && console.log("adding entity", entityState);
        store.set({ [entity.key]: entityState });

        entities.push(entity);
      },
    };
  }

  function step() {
    let now = Date.now();
    let dt = (now - _lastStep) / 1000;
    _lastStep = now;

    let gameState = store.get();
    let newState = _scenes.reduce(
      (acc, scene) =>
        scene.paused ? acc : Object.assign(acc, scene(dt, gameState)),
      gameState,
    );

    store.set(newState);

    input.clearPressed();
  }

  function start() {
    if (_running) return;

    let s = () => {
      step();
      return (_frameRequest = requestAnimationFrame(s));
    };

    _running = true;
    _lastStep = Date.now();
    _frameRequest = requestAnimationFrame(s);
  }

  function stop() {
    if (_frameRequest) {
      cancelAnimationFrame(_frameRequest);
    }
    _frameRequest = null;
    _running = false;
    debug && console.log(store.get());
  }
}

function createStore(initialState) {
  let state = initialState || {};
  let listeners = [];

  return { get, set, on, off };

  function get() {
    return typeof state === "object" ? Object.assign({}, state) : state;
  }

  function set(providedState) {
    const prevState = Object.assign({}, state);
    const newState = Object.assign({}, state, providedState);
    for (let x = 0; x < listeners.length; x++) {
      listeners[x](prevState, newState);
    }
    state = newState;
  }

  function on(listener) {
    if (typeof listener !== "function") {
      throw new E("listener must be a function");
    }
    listeners.push(listener);
    return () => off(listener);
  }

  function off(listener) {
    if (!listener) return;
    const idx = listeners.findIndex((l) => l === listener);
    idx > -1 && listeners.splice(idx, 1);
  }
}

function E(message) {
  this.message = message;
  this.name = "BoogieException";
  this.toString = function () {
    return this.name + ": " + this.message;
  };
}
