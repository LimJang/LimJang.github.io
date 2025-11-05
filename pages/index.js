import { useEffect, useRef } from 'react';

const Home = () => {
  const sceneRef = useRef(null);
  const engineRef = useRef(null);

  useEffect(() => {
    // Dynamically import Matter.js only on the client side
    import('matter-js').then(Matter => {
      const { Engine, Render, Runner, Composite, Bodies, Events, Mouse, MouseConstraint } = Matter;

      // --- Engine and Renderer Setup ---
      const engine = Engine.create({
        gravity: { y: 1 }, // Standard gravity
        // Increase iterations to improve accuracy and prevent tunneling
        positionIterations: 12,
        velocityIterations: 8,
      });
      engineRef.current = engine;

      const container = sceneRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;

      const render = Render.create({
        element: container,
        engine: engine,
        options: {
          width: width,
          height: height,
          wireframes: true, // 8-bit wireframe style
          background: '#000000', // Black background
        },
      });

      // --- Object Creation ---
      const wallOptions = { isStatic: true, render: { fillStyle: '#FFFFFF' } };
      const boundaries = [
        // Top wall
        Bodies.rectangle(width / 2, 0, width, 50, { ...wallOptions }),
        // Bottom wall
        Bodies.rectangle(width / 2, height, width, 50, { ...wallOptions }),
        // Left wall
        Bodies.rectangle(0, height / 2, 50, height, { ...wallOptions }),
        // Right wall
        Bodies.rectangle(width, height / 2, 50, height, { ...wallOptions }),
      ];

      const coins = [];
      const coinRadius = 20;
      for (let i = 0; i < 5; i++) {
        coins.push(
          Bodies.circle(
            Math.random() * (width - coinRadius * 2) + coinRadius,
            Math.random() * (height / 2), // Start in the upper half
            coinRadius,
            { 
              label: 'coin',
              restitution: 0.5,
              render: { fillStyle: '#FFFFFF' }
            }
          )
        );
      }

      // --- Goal (U-Shape) Setup ---
      const goalWidth = coinRadius * 4;
      const goalHeight = coinRadius * 3;
      const goalX = width / 2;
      const goalY = height - 50; // Position near the bottom wall
      const wallThickness = 10;

      const goalWalls = [
        // Left side of U
        Bodies.rectangle(goalX - goalWidth / 2, goalY, wallThickness, goalHeight, { ...wallOptions }),
        // Right side of U
        Bodies.rectangle(goalX + goalWidth / 2, goalY, wallThickness, goalHeight, { ...wallOptions }),
        // Bottom of U
        Bodies.rectangle(goalX, goalY + goalHeight / 2, goalWidth + wallThickness, wallThickness, { ...wallOptions }),
      ];
      
      // Sensor to detect when a coin enters the goal
      const goalSensor = Bodies.rectangle(goalX, goalY, goalWidth - wallThickness, goalHeight, {
        label: 'goalSensor',
        isStatic: true,
        isSensor: true, // Makes it a non-colliding sensor
        render: { visible: false } // Hide the sensor visually
      });

      // --- Mouse Interaction ---
      const mouse = Mouse.create(render.canvas);
      const mouseConstraint = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: {
          stiffness: 0.2,
          render: {
            visible: false,
          },
        },
      });

      // --- Velocity Capping to Prevent Tunneling ---
      const maxVelocity = 20; // Set a maximum speed to prevent tunneling
      Events.on(engine, 'beforeUpdate', () => {
        for (const coin of coins) {
          if (Matter.Vector.magnitude(coin.velocity) > maxVelocity) {
            Matter.Body.setVelocity(coin, 
              Matter.Vector.mult(Matter.Vector.normalise(coin.velocity), maxVelocity)
            );
          }
        }
      });

      // --- Collision Detection ---
      Events.on(engine, 'collisionStart', (event) => {
        const pairs = event.pairs;
        for (let i = 0; i < pairs.length; i++) {
          const pair = pairs[i];
          const bodyA = pair.bodyA;
          const bodyB = pair.bodyB;

          const isCoinAndGoal = 
            (bodyA.label === 'coin' && bodyB.label === 'goalSensor') ||
            (bodyA.label === 'goalSensor' && bodyB.label === 'coin');

          if (isCoinAndGoal) {
            console.log("동전 투입 성공! 메인 페이지로 이동합니다.");
            // Here you could add logic to remove the coin or trigger other effects
          }
        }
      });

      // --- Add all to world and run ---
      Composite.add(engine.world, [
        ...boundaries,
        ...coins,
        ...goalWalls,
        goalSensor,
        mouseConstraint,
      ]);
      
      render.mouse = mouse;
      
      const runner = Runner.create();
      Runner.run(runner, engine);
      Render.run(render);

      // --- Cleanup on component unmount ---
      return () => {
        Runner.stop(runner);
        Render.stop(render);
        Engine.clear(engine);
        Composite.clear(engine.world);
        render.canvas.remove();
        render.textures = {};
      };
    }).catch(error => {
      console.error("Failed to load Matter.js", error);
    });
  }, []); // Empty dependency array ensures this runs only once

  return <div ref={sceneRef} style={{ width: '100%', height: '100%' }} />;
};

export default Home;