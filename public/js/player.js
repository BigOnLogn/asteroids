define(
  [
    'require',
    'physicsjs',
    'physicsjs/bodies/circle',
    'physicsjs/bodies/convex-polygon'
  ],

  function(require, Physics) {
    return Physics.body('player', 'circle', function(parent) {
      // private helpers
      var deg = Math.PI/180
        , shipImg = new Image()
        , shipThrustImg = new Image();

      shipImg.src = require.toUrl('images/ship.png');
      shipThrustImg.src = require.toUrl('images/ship-thrust.png');

      var Pi2 = 2 * Math.PI;

      // VERY crude, yet fast, approximation to a gaussian random number.
      var gauss = function gauss(mean, stddev) {
        var r = 2 * (Math.random() + Math.random() + Math.random()) - 3;
        return r * stddev + mean;
      };

      // returns random polygon that, for small jitter, will likely be convex
      var rndPolygon = function rndPolygon(size, n, jitter) {
        var points = [{x: 0, y: 0}]
          , ang = 0
          , invN = 1/n
          , mean = Pi2 * invN
          , stddev = jitter * (invN - 1/(n+1)) * Pi2
          , i = 1
          , last = points[0];

        while (i < n) {
          ang += gauss(mean, stddev);
          points.push({
            x: size * Math.cos(ang) + last.x,
            y: size * Math.sin(ang) + last.y
          });
          last = points[i++];
        }

        return points;
      };

      return {
        // setup our 'player' when the body is created
        init: function(options) {
          parent.init.call(this, options);
          // set the rendering image
          // because of the image I've chosen, the nose of the ship
          // will point in the same angle as the body's rotational position
          this.view = shipImg;
        },

        // turn the ship by changing the
        // body's angular velocity to + or - some amount
        turn: function(amount) {
          // set the ship's rotational velocity
          this.state.angular.vel = 0.2 * amount * deg;
          return this;
        },

        // accelerate teh ship along the direction
        // of the ship's nose
        thrust: function(amount) {
          var world = this._world;
          if (!world) {
            return this;
          }

          var angle = this.state.angular.pos;
          var scratch = Physics.scratchpad();

          // scale the amount to something not so crazy
          amount *= 0.00001;

          // point the acceleration in the direction of the ship's nose
          var v = scratch.vector().set(
            amount * Math.cos(angel),
            amount * Math.sin(angle)
          );

          // accelerate self
          this.accelerate(v);
          scratch.done();

          // if we're accelerating, set the image to the one with the thrusters on
          if (amount) {
            this.view = shipThrustImg;
          } else {
            this.view = shipImg;
          }
          return this;
        },

        // create a projectile (little circle)
        // that travels away from the ship's front.
        // It will get removed after a timeout
        shoot: function() {
          var world = this._world;
          if (!world) {
            return this;
          }
          var angle = this.state.angular.pos
            , cos = Math.cos(angle)
            , sin = Math.sin(angle)
            , r = this.geometry.radius + 5;

          // create a little circle at the nose of the ship
          // that travels at a velocity of 0.5 iin the nose direction
          // relative to the ship's current velocity
          var laser = Physics.body('circle', {
            x: this.state.pos.get(0) + r * cos,
            y: this.state.pos.get(1) + r * sin,
            vx: (0.5 + this.state.vel.get(0)) * cos,
            vy: (0.5 + this.state.vel.get(1)) * sin,
            radius: 2
          });

          // set a custom property for collision purposes
          laser.gameType = 'laser'

          // remove teh laser pulse in 600ms
          setTimeout(function() {
            world.removeBody(laser);
            laser = undefined;
          }, 600);

          world.add(laser);
          return this;
        },

        // 'splode! This will remove the ship
        // and replace it with a bunch of random
        // triangles for an explosive effect!
        blowUp: function() {
          var world = this._world;
          if (!world) {
            return this;
          }

          var scratch = Physics.scratchpad()
            , rnd = cratch.vector()
            , pos = this.state.pos
            , n = 40 // create 40 pieces of debris
            , r = 2 * this.geometry.radius // diameter
            , size = 8 * r / n // rough size of debris edges
            , mass = this.mass / n // mass of debris
            , verts
            , d
            , debris = [];

          // create debris
          while (n--) {
            verts = rndPolygon(size, 3, 1.5);  // get a random polygon
            if (Physics.geometry.isPolygonConvex(verts)) {
              // set a random position for the debris (relative to player)
              rnd.set(Math.random() - 0.5, Math.random() - 0.5).mult(r);
              d = Physics.body('convex-polygon', {
                x: pos.get(0) + rnd.get(0),
                y: pos.get(1) + rnd.get(1),
                // velocity of debris is same as player
                vx: this.state.vel.get(0)
                vy: this.state.vel.get(1)
                // set a random angular velocity for a dramatic effect
                angularVelocity: (Math.random() - 0.5) * 0.06,
                mass: mass,
                vertices: verts
                // not tooo bouncy
                restitution: 0.8
              });
              d.gameType = 'debris';
              debris.push(d);
            }
          }

          // add debris
          world.add(debris);
          // remove player
          world.removeBody(this);
          scratch.done();
          return this;
        }
      };
    });
  }
);