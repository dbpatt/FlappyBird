document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("flappyCanvas");
    const ctx = canvas.getContext("2d");
    const startPopup = document.getElementById("startPopup");
    const gameOverPopup = document.getElementById("flappyPopup");
    const retryBtn = document.getElementById("flappyRetryBtn");
    
    // Create a container div to mask/crop the canvas
    const canvasContainer = document.createElement("div");
    canvasContainer.style.width = canvas.width + "px";
    canvasContainer.style.height = (canvas.height * 0.85) + "px"; // 85% of original height
    canvasContainer.style.overflow = "hidden";
    canvasContainer.style.position = "relative";
    canvasContainer.style.margin = "20px auto"; // Same margin as original canvas
    canvasContainer.style.border = "4px solid #2A93D5"; // Move border to container
    canvasContainer.style.boxShadow = "0 0 20px rgba(0, 0, 0, 0.1)"; // Move shadow to container
    
    // Insert container before canvas in the DOM
    canvas.parentNode.insertBefore(canvasContainer, canvas);
    
    // Move canvas into container
    canvasContainer.appendChild(canvas);
    
    // Position canvas to crop both top and bottom
    canvas.style.position = "absolute";
    canvas.style.top = "-" + (canvas.height * 0.075) + "px"; // Move up by 7.5% to crop top
    canvas.style.border = "none"; // Remove border from canvas
    canvas.style.boxShadow = "none"; // Remove shadow from canvas
    canvas.style.margin = "0"; // Remove margins
    
    // Pipe colors for the original theme
    const pipeColors = {
      mainColor: "#9932CC", // Original purple
      darkColor: "#6A0DAD", // Original dark purple
      outlineColor: "#000000" // Original black outline
    };
    
    // Updated image URLs
    const birdImg = new Image();
    birdImg.src = "https://i.postimg.cc/JyV0zt0Q/pinkflappy.png";
    const deadBirdImg = new Image();
    deadBirdImg.src = "https://i.postimg.cc/CxSz16LF/deadbird.png"; // Dead bird image
    const bgImg = new Image();
    bgImg.src = "https://i.postimg.cc/VvZz4DPC/citymoonbackground.png"; // Original background image
    
    // Decreased hitbox size for the bird to 5x5
    const bird = {
      x: 160,
      y: 200,
      width: 60,
      height: 60,
      hitboxWidth: 5,
      hitboxHeight: 5,
      hitboxOffsetX: 5,
      hitboxOffsetY: 5,
      gravity: 0.4,
      lift: -6.5,
      velocity: 0,
      isDead: false,
      rotation: 0
    };
    
    let pipes = [];
    const pipeWidth = 52; // Thin pipe width like original Flappy Bird
    
    // UPDATED: Made hitbox inset even smaller (effectively making hitbox wider)
    const pipeHitboxInset = 0; // Zero inset - hitbox is as wide as the pipe
    
    const pipeGap = 160; // Smaller gap between pipes (more difficult)
    const pipeSpeed = 4; // Doubled scrolling speed
    let frameCount = 0;
    let gameStarted = false;
    let gameOver = false;
    
    // Scoring system
    let score = 0;
    
    // Debug mode to visualize hitboxes - consider turning this on to see the hitboxes
    const debugMode = false;
    
    // Create a separate score display element
    const scoreDisplay = document.createElement("div");
    scoreDisplay.style.position = "absolute";
    scoreDisplay.style.top = "20px";
    scoreDisplay.style.right = "20px";
    scoreDisplay.style.fontSize = "24px";
    scoreDisplay.style.fontWeight = "bold";
    scoreDisplay.style.fontFamily = "'Segoe UI', sans-serif";
    scoreDisplay.style.color = "#ffffff";
    scoreDisplay.style.textShadow = "2px 2px 4px rgba(0, 0, 0, 0.7)";
    scoreDisplay.style.zIndex = "10";
    scoreDisplay.textContent = "Score: 0";
    
    // Add score display to the canvas container
    canvasContainer.appendChild(scoreDisplay);
    
    function drawBackground() {
      ctx.imageSmoothingEnabled = false;
      const aspectRatio = canvas.width / canvas.height;
      const bgAspectRatio = bgImg.width / bgImg.height;
      let srcWidth, srcHeight;
      if (bgAspectRatio > aspectRatio) {
        srcHeight = bgImg.height;
        srcWidth = srcHeight * aspectRatio;
      } else {
        srcWidth = bgImg.width;
        srcHeight = srcWidth / aspectRatio;
      }
      const sx = (bgImg.width - srcWidth) / 2;
      const sy = (bgImg.height - srcHeight) / 2;
      ctx.drawImage(bgImg, sx, sy, srcWidth, srcHeight, 0, 0, canvas.width, canvas.height);
    }
    
    function drawBird() {
      ctx.imageSmoothingEnabled = false;
      
      // Save the current context state
      ctx.save();
      
      // Translate to the center of the bird
      ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
      
      // Rotate based on bird's velocity/state
      if (bird.isDead) {
        // Gradually increase rotation when dead (falling) up to 90 degrees
        bird.rotation = Math.min(bird.rotation + 0.05, Math.PI / 2);
        ctx.rotate(bird.rotation);
      } else {
        // When alive, tilt up or down based on velocity
        ctx.rotate(bird.velocity * 0.1);
      }
      
      // Draw the appropriate bird image
      const currentBirdImg = bird.isDead ? deadBirdImg : birdImg;
      ctx.drawImage(
        currentBirdImg, 
        -bird.width / 2, 
        -bird.height / 2, 
        bird.width, 
        bird.height
      );
      
      // Restore context to previous state
      ctx.restore();
      
      if (debugMode) {
        // Draw the bird hitbox
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        const birdHitboxX = bird.x + bird.hitboxOffsetX + (bird.width - bird.hitboxWidth) / 2;
        const birdHitboxY = bird.y + bird.hitboxOffsetY + (bird.height - bird.hitboxHeight) / 2;
        ctx.strokeRect(
          birdHitboxX,
          birdHitboxY,
          bird.hitboxWidth,
          bird.hitboxHeight
        );
      }
    }
    
    function drawPipe(pipe) {
      const topHeight = pipe.top;
      const bottomY = pipe.bottom;
      const bottomHeight = canvas.height - pipe.bottom;
      
      // Only draw pipes within the visible area plus a buffer
      if (pipe.x <= canvas.width + 100 && pipe.x + pipeWidth >= -100) {
        ctx.imageSmoothingEnabled = false;
        
        // Constants for pipe cap dimensions - 8-bit style with pixel art proportions
        const capHeight = 20; // Shorter cap height for pixel art style
        const capWidth = 60; // Wider cap for classic look
        const capOffset = (capWidth - pipeWidth) / 2;
        
        // TOP PIPE - SIMPLIFIED 8-BIT STYLE
        // Main stem 
        ctx.fillStyle = pipeColors.mainColor;
        ctx.fillRect(pipe.x, 0, pipeWidth, topHeight - capHeight);
        
        // Simple 8-bit shadow - right side only, no gradient
        ctx.fillStyle = pipeColors.darkColor;
        ctx.fillRect(pipe.x + pipeWidth - 8, 0, 8, topHeight - capHeight);
        
        // Top cap - straight edges for pixel art feel
        ctx.fillStyle = pipeColors.mainColor;
        ctx.fillRect(pipe.x - capOffset, topHeight - capHeight, capWidth, capHeight);
        
        // Simple cap shadow - bottom edge only
        ctx.fillStyle = pipeColors.darkColor;
        ctx.fillRect(pipe.x - capOffset, topHeight - 8, capWidth, 8);
        
        // Right cap shadow
        ctx.fillStyle = pipeColors.darkColor;
        ctx.fillRect(pipe.x - capOffset + capWidth - 8, topHeight - capHeight, 8, capHeight - 8);
        
        // BOTTOM PIPE - SIMPLIFIED 8-BIT STYLE
        // Main stem
        ctx.fillStyle = pipeColors.mainColor;
        ctx.fillRect(pipe.x, bottomY + capHeight, pipeWidth, bottomHeight - capHeight);
        
        // Simple 8-bit shadow - right side only
        ctx.fillStyle = pipeColors.darkColor;
        ctx.fillRect(pipe.x + pipeWidth - 8, bottomY + capHeight, 8, bottomHeight - capHeight);
        
        // Bottom cap - straight edges
        ctx.fillStyle = pipeColors.mainColor;
        ctx.fillRect(pipe.x - capOffset, bottomY, capWidth, capHeight);
        
        // Simple cap shadow - top edge
        ctx.fillStyle = pipeColors.darkColor;
        ctx.fillRect(pipe.x - capOffset, bottomY, capWidth, 8);
        
        // Right cap shadow
        ctx.fillStyle = pipeColors.darkColor;
        ctx.fillRect(pipe.x - capOffset + capWidth - 8, bottomY + 8, 8, capHeight - 8);
        
        // Add pixel-perfect black outlines for retro look
        ctx.strokeStyle = pipeColors.outlineColor;
        ctx.lineWidth = 2;
        
        // Top pipe outlines
        ctx.strokeRect(pipe.x, 0, pipeWidth, topHeight - capHeight);
        ctx.strokeRect(pipe.x - capOffset, topHeight - capHeight, capWidth, capHeight);
        
        // Bottom pipe outlines
        ctx.strokeRect(pipe.x, bottomY + capHeight, pipeWidth, bottomHeight - capHeight);
        ctx.strokeRect(pipe.x - capOffset, bottomY, capWidth, capHeight);
        
        if (debugMode) {
          // Draw hitboxes for the visible part of pipes only
          ctx.strokeStyle = 'yellow';
          ctx.lineWidth = 2;
          
          // Top pipe hitbox
          ctx.strokeRect(
            pipe.x + pipeHitboxInset,
            0,
            pipeWidth - (pipeHitboxInset * 2),
            pipe.top
          );
          
          // Bottom pipe hitbox
          ctx.strokeRect(
            pipe.x + pipeHitboxInset,
            pipe.bottom,
            pipeWidth - (pipeHitboxInset * 2),
            canvas.height - pipe.bottom
          );
        }
      }
    }
    
    function updateScoreDisplay() {
      // Update the separate score display element
      scoreDisplay.textContent = `Score: ${score}`;
    }
    
    function generatePipe() {
      // Generate pipes starting completely off-screen to the right
      const top = Math.random() * (canvas.height - pipeGap - 120) + 40;
      const bottom = top + pipeGap;
      const pipeId = Date.now(); // Unique ID for the pipe for scoring purposes
      pipes.push({ x: canvas.width + 120, top: top, bottom: bottom, id: pipeId, passed: false }); // Added passed property
    }
    
    function checkCollision(pipe) {
      // Calculate bird hitbox with precise offset to match visible portion
      const birdHitboxX = bird.x + bird.hitboxOffsetX + (bird.width - bird.hitboxWidth) / 2;
      const birdHitboxY = bird.y + bird.hitboxOffsetY + (bird.height - bird.hitboxHeight) / 2;
      
      // Only check collision if pipes are actually visible on screen
      if (pipe.x + pipeWidth < 0 || pipe.x > canvas.width) {
        return false;
      }
      
      // Define hitboxes for top and bottom pipes - inset from edges to match visible pipe area
      const topPipeHitbox = {
        x: pipe.x + pipeHitboxInset,
        y: 0,
        width: pipeWidth - (pipeHitboxInset * 2),
        height: pipe.top
      };
      
      const bottomPipeHitbox = {
        x: pipe.x + pipeHitboxInset,
        y: pipe.bottom,
        width: pipeWidth - (pipeHitboxInset * 2),
        height: canvas.height - pipe.bottom
      };
      
      // Check collision with top pipe
      const collidesWithTopPipe = (
        birdHitboxX < topPipeHitbox.x + topPipeHitbox.width &&
        birdHitboxX + bird.hitboxWidth > topPipeHitbox.x &&
        birdHitboxY < topPipeHitbox.y + topPipeHitbox.height &&
        birdHitboxY + bird.hitboxHeight > topPipeHitbox.y
      );
      
      // Check collision with bottom pipe
      const collidesWithBottomPipe = (
        birdHitboxX < bottomPipeHitbox.x + bottomPipeHitbox.width &&
        birdHitboxX + bird.hitboxWidth > bottomPipeHitbox.x &&
        birdHitboxY < bottomPipeHitbox.y + bottomPipeHitbox.height &&
        birdHitboxY + bird.hitboxHeight > bottomPipeHitbox.y
      );
      
      return collidesWithTopPipe || collidesWithBottomPipe;
    }
    
    function updateScore() {
      // Score increases when bird passes the front edge of a pipe
      pipes.forEach(pipe => {
        // Check if the bird's front edge has passed the pipe's front edge
        // and this pipe hasn't been scored yet
        if (bird.x > pipe.x && !pipe.passed) {
          score++; // Increment score
          pipe.passed = true; // Mark pipe as passed/scored
          updateScoreDisplay(); // Update the score display
        }
      });
    }
    
    function draw() {
      if (!gameStarted) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw background
      drawBackground();
      
      // Draw pipes
      pipes.forEach(pipe => {
        drawPipe(pipe);
      });
      
      // Update bird position
      bird.velocity += bird.gravity;
      bird.y += bird.velocity;
      
      // If the bird is dead, check if it's fallen off screen
      if (bird.isDead) {
        if (bird.y > canvas.height + 100) {
          // Bird has fallen off screen, show game over popup
          const gameOverHeading = gameOverPopup.querySelector("h3");
          gameOverHeading.innerHTML = `Game Over<br>Score: ${score}`;
          gameOverPopup.style.display = "flex";
          return; // Stop animation
        }
      } else {
        // Bird is alive, normal game logic
        
        // Generate new pipe
        if (frameCount % 50 === 0) generatePipe();
        
        // Update score
        updateScore();
        
        // Move pipes if bird is still alive
        pipes.forEach(pipe => {
          pipe.x -= pipeSpeed;
        });
        
        // Remove pipes that are off screen
        pipes = pipes.filter(pipe => pipe.x + pipeWidth > -150);
        
        // Check for collisions with pipes
        for (let pipe of pipes) {
          if (checkCollision(pipe)) {
            // Collision detected!
            bird.isDead = true;
            bird.velocity = -8; // Strong upward bounce
            bird.gravity = 0.6; // Increase gravity
            break;
          }
        }
        
        // Check for collision with ceiling or floor
        if (bird.y + bird.height > canvas.height || bird.y < 0) {
          bird.isDead = true;
          bird.velocity = -8; // Strong upward bounce
          bird.gravity = 0.6; // Increase gravity
        }
      }
      
      // Draw bird
      drawBird();
      
      frameCount++;
      
      // Continue animation
      requestAnimationFrame(draw);
    }
    
    function resetGame() {
      bird.x = 160;
      bird.y = 200;
      bird.velocity = 0;
      bird.gravity = 0.4; // Reset gravity to original value
      bird.isDead = false;
      bird.rotation = 0;
      pipes = [];
      frameCount = 0;
      gameStarted = false;
      gameOver = false;
      score = 0; // Reset score
      updateScoreDisplay(); // Update the score display
      gameOverPopup.style.display = "none";
      startPopup.style.display = "flex";
      drawBackground();
      drawBird();
    }
    
    function startGame() {
      gameStarted = true;
      startPopup.style.display = "none";
      draw();
    }
    
    document.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        if (!gameStarted && gameOverPopup.style.display !== "flex") {
          startGame();
        }
        if (gameStarted && !bird.isDead) {
          bird.velocity = bird.lift;
        }
      }
    });
    
    retryBtn.addEventListener("click", resetGame);
    startPopup.style.display = "flex";
    
    // Wait for images to load before drawing
    let imagesLoaded = 0;
    const totalImages = 3; // Bird, dead bird, and background
    
    function handleImageLoad() {
      imagesLoaded++;
      if (imagesLoaded === totalImages) {
        drawBackground();
        drawBird();
        updateScoreDisplay(); // Initialize score display
      }
    }
    
    birdImg.onload = handleImageLoad;
    deadBirdImg.onload = handleImageLoad;
    bgImg.onload = handleImageLoad;
  });