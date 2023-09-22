export const rand = (min, max) => Math.random() * (max - min) + min;

export const input = {
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

let store = createStore({ _s: 0 });

export function scene(val) {
  let s = store.get()._s;
  if (val != null) {
    store.set({ _s: val });
  }
  return store.get()._s;
}

export function boogie(id, w, h) {
  // setup canvas
  let width = w || window.innerWidth;
  let height = h || window.innerHeight;

  const canvas = document.getElementById(id);
  const context = canvas.getContext("2d");

  // game state
  let running = false;
  let frameRequest = null;
  let lastStep = null;
  let _update = null;
  let _draw = null;
  let _onStart = null;

  // event handling
  canvas.onmousemove = input.onmousemove.bind(input);
  canvas.onmousedown = input.onmousedown.bind(input);
  canvas.onmouseup = input.onmouseup.bind(input);
  canvas.onmousewheel = input.onmousewheel.bind(input);
  canvas.oncontextmenu = input.oncontextmenu.bind(input);

  window.addEventListener("keydown", input.onkeydown.bind(input));
  window.addEventListener("keyup", input.onkeyup.bind(input));

  window.onblur = () => stop();
  window.onfocus = () => start();
  window.onresize = () => {
    canvas.width = width;
    canvas.height = height;
    width = canvas.width;
    height = canvas.height;
  };

  window.onresize();

  start();

  function step() {
    let now = Date.now();
    let dt = (now - lastStep) / 1000;
    lastStep = now;
    context.clearRect(0, 0, canvas.width, canvas.height);
    _update && _update(dt);
    _draw && _draw(context);
    input.clearPressed();
  }

  function start() {
    if (running) return;

    let s = () => {
      step();
      return (frameRequest = requestAnimationFrame(s));
    };

    running = true;
    lastStep = Date.now();
    frameRequest = requestAnimationFrame(s);
    _onStart && _onStart(im);
  }

  function stop() {
    if (frameRequest) {
      cancelAnimationFrame(frameRequest);
    }
    frameRequest = null;
    running = false;
  }

  return {
    onStart,
    update,
    draw,
    store,
  };

  function onStart(cb) {
    _onStart = cb;
  }

  function update(cb) {
    _update = cb;
  }

  function draw(cb) {
    _draw = cb;
  }
}

export function entity(key, _state) {
  let state = Object.assign(
    {
      key,
      alive: true,
      color: "#000",
      x: 0,
      y: 0,
      w: 16,
      h: 16,
      direction: "s",
      speed: 5,
    },
    _state,
  );

  store.set({ [key]: state });

  function Entity() {}

  Entity.get = function get() {
    return store.get()[key];
  };

  Entity.set = function set(state) {
    return store.set({ [key]: state });
  };

  Entity.draw = function draw(context) {
    let state = store.get()[key];
    context.fillStyle = state.color;
    context.fillRect(state.x, state.y, state.w, state.h);
  };

  return Entity;
}

function createStore(initialState) {
  let state = initialState || {};
  let listeners = [];

  return {
    subscribe,
    unsubscribe,
    get,
    set,
    clear,
  };

  function subscribe(listener) {
    if (typeof listener !== "function") {
      throw new E("listener must be a function");
    }
    listeners.push(listener);
    return () => unsubscribe(listener);
  }

  function unsubscribe(listener) {
    if (!listener) return;
    const idx = listeners.findIndex((l) => l === listener);
    idx > -1 && listeners.splice(idx, 1);
  }

  function get() {
    return typeof state === "object" ? Object.assign({}, state) : state;
  }

  function set(newState) {
    Object.assign(state, newState);

    let _state = get();
    for (let x = 0; x < listeners.length; x++) {
      listeners[x](_state);
    }

    return _state;
  }

  function clear(newState) {
    state = Object.assign({}, newState);
  }
}
