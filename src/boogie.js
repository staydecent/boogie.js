// Canvas game lover by Adrian Unger <staydecent.ca>
// based on https://github.com/nornagon/atom

(function (window, _) {
  var boogie = {}

  // controls
  boogie.inputMan = {
    _bindings: {},
    _down: {},
    _pressed: {},
    _released: [],
    mouse: { x:0, y:0 },
    button: {
      LEFT: -1,
      MIDDLE: -2,
      RIGHT: -3,
      WHEELDOWN: -4,
      WHEELUP: -5
    },
    key: {
      TAB: 9,
      ENTER: 13,
      ESC: 27,
      SPACE: 32,
      LEFT_ARROW: 37,
      UP_ARROW: 38,
      RIGHT_ARROW: 39,
      DOWN_ARROW: 40
    },
    eventCode: function (e) {
      if (e.type === 'keydown' || e.type === 'keyup') {
        return e.keyCode
      }
      else if (e.type === 'mousedown' || e.type === 'mouseup') {
        if      (e.button === 0) return this.button.LEFT
        else if (e.button === 1) return this.button.MIDDLE
        else if (e.button === 2) return this.button.RIGHT
      }
      else if (e.type === 'mousewheel') {
        return (e.wheel > 0) ? this.button.WHEELUP : this.button.WHEELDOWN
      }
    },
    bind: function (key, action) {
      this._bindings[key] = action
    },
    onkeydown: function (e) {
      var code, 
          action

      code = this.eventCode(e)
      action = this._bindings[code]
      
      if (!action) return
      console.log(action, 'down')
      
      if (!this._down[action])
        this._pressed[action] = true
      this._down[action] = true

      e.stopPropagation()
      e.preventDefault()
    },
    onkeyup: function (e) {
      var code, 
          action

      code = this.eventCode(e)
      action = this._bindings[code]

      if (!action) return
      console.log(action, 'up')
      
      if (this._down[action])
        this._pressed[action] = false
      this._down[action] = false
      this._released.push(action)

      e.stopPropagation()
      e.preventDefault()
    },
    clearPressed: function () {
      var actionLen = this._released.length,
          action

      for (var i = 0; i < actionLen; i++) {
        action = this._released[i]
        this._down[action] = false
      }

      this._released = []
      this._pressed = {}
    },
    pressed: function (action) {
      return this._pressed[action]
    },
    down: function (action) {
      return this._down[action]
    },
    released: function (action) {
      return [].indexOf.call(this._released, action) >= 0
    },
    onmousemove: function (e) {
      if (window.pageXOffset !== undefined) {        
        this.mouse.x = e.clientX + window.pageXOffset
        this.mouse.y = e.clientY + window.pageYOffset
      } else {
        ev = window.event
        d = document.documentElement
        b = document.body
        this.mouse.x = ev.clientX + d.scrollLeft + b.scrollLeft
        this.mouse.y = ev.clientY + d.scrollTop + b.scrollTop 
      }
    },  
    onmousedown: function (e) {
      return this.onkeydown(e)
    },
    onmouseup: function (e) { 
      return this.onkeyup(e)
    },
    onmousewheel: function (e) {
      this.onkeydown(e)
      this.onkeyup(e)
    },
    oncontextmenu: function (e) {
      if (this._bindings[this.button.RIGHT]) {
        e.stopPropagation()
        e.preventDefault()
      }
    }
  }

  // game board
  boogie.Game = (function (boogie, _) {
    var requestAnimationFrame,
        cancelAnimationFrame

    requestAnimationFrame = window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function(callback) {
        return window.setTimeout((function() {
          return callback(1000 / 60)
        }), 1000 / 60)
      }

    cancelAnimationFrame = window.cancelAnimationFrame || 
      window.webkitCancelAnimationFrame || 
      window.mozCancelAnimationFrame || 
      window.oCancelAnimationFrame || 
      window.msCancelAnimationFrame || 
      window.clearTimeout

    function Game(id, x, y) {
      var _this = this

      this.canvas = document.createElement('<canvas>')
      this.canvas.id = 'id'
      document.body.appendChild(this.canvas)

      this.context = this.canvas.getContext('2d')
      this.bindControls()

      window.onresize = function(e) {
        _this.canvas.width = window.innerWidth
        _this.canvas.height = window.innerHeight
        _this.width = _this.canvas.width
        _this.height = _this.canvas.height
      }
      window.onresize()
    }

    Game.prototype.update = function(dt) {}
    Game.prototype.draw = function() {}

    Game.prototype.bindControls = function() {
      this.canvas.onmousemove   = boogie.inputMan.onmousemove.bind(boogie.inputMan)
      this.canvas.onmousedown   = boogie.inputMan.onmousedown.bind(boogie.inputMan)
      this.canvas.onmouseup     = boogie.inputMan.onmouseup.bind(boogie.inputMan)
      this.canvas.onmousewheel  = boogie.inputMan.onmousewheel.bind(boogie.inputMan)
      this.canvas.oncontextmenu = boogie.inputMan.oncontextmenu.bind(boogie.inputMan)
    }

    Game.prototype.run = function() {
      var s,
        _this = this

      if (this.running) {
        return
      }

      this.running = true
      s = function() {
        _this.step()
        return _this.frameRequest = requestAnimationFrame(s)
      }
      this.last_step = Date.now()
      this.frameRequest = requestAnimationFrame(s)
    }

    Game.prototype.stop = function() {
      if (this.frameRequest) {
        cancelAnimationFrame(this.frameRequest)
      }
      this.frameRequest = null
      this.running = false
    }

    Game.prototype.step = function() {
      var dt, now

      now = Date.now()
      dt = (now - this.last_step) / 1000
      this.last_step = now
      this.update(dt)
      this.draw()
      boogie.inputMan.clearPressed()
    }

    return Game
  })(boogie, _)

  // cool gfx
  boogie.Sprite = (function (_) {
    Sprite.prototype.defaults = {
      animSpeed: .25,
      frames: 3,
      currFrame: 2,
      dt: 0,
      sheetX: 0,
      sheetY: 0,
      width: 0,
      height: 0,
      sheetWidth: 0,
      sheetHeight: 0,
      path: "images/",
      ready: false
    }

    function Sprite(name, options) {
      var key, value

      options = _.extend(this.defaults, options)
      for (key in options) {
        value = options[key]
        this[key] = value
      }
      this.load(this.path + name + '.png')
    }

    Sprite.prototype.load = function(url) {
      var _this = this
      this.img = new Image()

      this.img.onload = function() {
        _this.ready = true

        if (_this.sheetWidth === 0) {
          _this.sheetWidth = _this.img.width || _this.width
        }

        if (_this.sheetHeight === 0) {
          _this.sheetHeight = _this.img.height || _this.height
        }
      }

      this.img.src = url
    }

    Sprite.prototype.animate = function(dt) {
      if (this.dt > this.animSpeed || this.dt === 0) {
        this.dt = 0
        this.sheetX = this.currFrame * this.width
        this.currFrame++

        if (this.currFrame >= this.frames) {
          this.currFrame = 0
        }
      }
      
      this.dt += dt
    }

    Sprite.prototype.draw = function(context, x, y) {
      if (!this.ready) {
        return
      }

      return context.drawImage(
        this.img, 
        this.sheetX, 
        this.sheetY, 
        this.width, 
        this.height, 
        x, 
        y, 
        this.width, 
        this.height)
    }

    Sprite.prototype.fill = function(context, x, y, width, height, repeat) {
      var pattern

      if (!this.ready) {
        return
      }

      repeat = repeat || "repeat"
      pattern = context.createPattern(this.image, repeat)
      context.fillColor(pattern)
      context.fillRect(x, y, width, height)
    }

    return Sprite
  })(_)

  // game pieces
  boogie.entity = {
    name: 'entity',
    active: true,
    color: '#000',
    x: 0,
    y: 0,
    speed: 5,
    width: 16,
    height: 16,
    direction: 's',
    draw: function(context) {
      context.fillStyle = this.color
      context.fillRect(this.x, this.y, this.width, this.height)
    }
  }

  boogie.projectile = _.extend(_.clone(boogie.entity), {
    name: 'projectile',
    change: 0,
    life: 16,
    update: function() {
      if (this.change >= this.life) {
        this.active = false
      }

      switch (this.direction) {
        case 'n':
          this.y -= this.speed
          break
        case 'e':
          this.x += this.speed
          break
        case 's':
          this.y += this.speed
          break
        case 'w':
          this.x -= this.speed
      }

      this.change += this.speed
    }
  })

  boogie.creature = _.extend(_.clone(boogie.entity), {
    updateDirection: function(im) {
      if (im.down('left')) {
        this.direction = 'w'
      } else if (im.down('right')) {
        this.direction = 'e'
      } else if (im.down('up')) {
        this.direction = 'n'
      } else if (im.down('down')) {
        return this.direction = 's'
      }
    },
    getFaceMidpoint: function() {
      if (this.direction === 'n') {
        return {
          x: this.x + (this.width / 2),
          y: this.y
        }
      } else if (this.direction === 'e') {
        return {
          x: this.x + this.width,
          y: this.y + (this.height / 2)
        }
      } else if (this.direction === 's') {
        return {
          x: this.x + (this.width / 2),
          y: this.y + this.height
        }
      } else if (this.direction === 'w') {
        return {
          x: this.x,
          y: this.y + (this.height / 2)
        }
      }
    }
  })

  // let's boogie!
  window.boogie = boogie
})(window, _)