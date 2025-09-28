document.addEventListener("DOMContentLoaded", () => {
  const animationRounds = 0;
  const extensions = ["jpg", "jpeg", "png", "webp"];
  let images = [];
  let current = 0;

  // Next strip movement configuration
  // Naming: main image = x-1, next strip shows x and x+1
  let nextStripTimer = null;
  let nextStripStartIndex = 0; // Tracks where next strip is currently pointing
  const MOVE_INTERVAL = 3000; // 3 seconds

  // Transition options: 'fade', 'slide', 'vanish', 'flip', 'bounce'
  // Change TRANSITION_TYPE to test different animations:
  // - 'fade': Gentle fade out/in effect
  // - 'slide': Slides out left, slides in from right
  // - 'vanish': Scale down with fade, scale up with fade
  // - 'flip': 3D flip rotation effect
  // - 'bounce': Bouncy scale animation
  const TRANSITION_TYPE = 'slide';

  const brollContainer = document.getElementById("broll-container");
  const broll = document.getElementById("broll");
  const nextStrip = document.getElementById("next-strip");
  const nextCards = [
    {
      element: document.getElementById("next-1"),
      img: document.querySelector("#next-1 img"),
      title: document.querySelector("#next-1 .next-title")
    },
    {
      element: document.getElementById("next-2"),
      img: document.querySelector("#next-2 img"),
      title: document.querySelector("#next-2 .next-title")
    }
  ];
  const mainCaption = document.getElementById("main-caption");
  const background = document.getElementById("background");
  const ratingContainer = document.getElementById("rating-container");
  const ratingSpinner = document.getElementById("rating-spinner");
  const ratingHyphen = document.getElementById("rating-hyphen");
  const showRatingBtn = document.getElementById("show-rating-btn");

  // Populate rating spinner
  const totalDigitsForAnimation = (animationRounds + 1) * 11;
  for (let i = 0; i < totalDigitsForAnimation; i++) {
    const digit = document.createElement("div");
    digit.classList.add("rating-digit");
    digit.textContent = i % 11;
    ratingSpinner.appendChild(digit);
  }

  function checkImage(path) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(path);
      img.onerror = () => resolve(null);
      img.src = path;
    });
  }

  async function findValidImagePath(baseName) {
    const cleanName = baseName.replace(/\.[^/.]+$/, ""); // strip extension
    for (let ext of extensions) {
      let path = `images/${cleanName}.${ext}`;
      let valid = await checkImage(path);
      if (valid) return valid;
    }
    return null;
  }

  async function loadImages() {
    const res = await fetch("images.json");
    const raw = await res.json();

    images = (await Promise.all(
      raw.map(async (item) => {
        const src = await findValidImagePath(item.name);
        return src ? { src, caption: item.caption, rating: item.rating } : null;
      })
    )).filter(Boolean);

    updateCarousel();

    // Start the 3-second timer for next strip movement
    startNextStripTimer();
  }

  let isTransitioning = false;
  let slideDirection = 'right'; // Track slide direction

  function calculateImageDimensions() {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Use viewport-based max dimensions (restored to original size)
        const maxWidth = window.innerWidth * 0.8; // 80vw
        const maxHeight = window.innerHeight * 0.65; // 65vh

        // Calculate the actual rendered size with object-fit: contain
        const imageAspectRatio = img.naturalWidth / img.naturalHeight;
        const maxAspectRatio = maxWidth / maxHeight;

        let renderedWidth, renderedHeight;

        if (imageAspectRatio > maxAspectRatio) {
          // Image is wider than max ratio - width constrained
          renderedWidth = maxWidth;
          renderedHeight = maxWidth / imageAspectRatio;
        } else {
          // Image is taller than max ratio - height constrained
          renderedHeight = maxHeight;
          renderedWidth = maxHeight * imageAspectRatio;
        }

        resolve({ width: renderedWidth, height: renderedHeight });
      };
      img.src = images[current].src;
    });
  }

  async function updateCarousel() {
    if (!images.length) return;

    // Update main image and background
    broll.src = images[current].src;
    background.src = images[current].src;
    mainCaption.textContent = images[current].caption;

    // Calculate and set container size to match image
    try {
      const imageDimensions = await calculateImageDimensions();
      brollContainer.style.width = `${imageDimensions.width}px`;
      brollContainer.style.height = `${imageDimensions.height}px`;
    } catch (error) {
      console.log('Could not calculate image dimensions, using defaults');
    }

    // Initialize next strip to show x and x+1 (where main image is x-1) - ONLY on first load
    if (nextStripStartIndex === 0) {
      nextStripStartIndex = current + 1;
      updateNextStripCards(nextStripStartIndex, false);
    }

    // Show the strip if we have enough images
    const hasNextImages = images.length > 1;
    nextStrip.style.opacity = hasNextImages ? '1' : '0';

    // Update rating button text with current image rating
    const currentRating = images[current].rating;
    showRatingBtn.textContent = `SHOW(${currentRating})`;

    // Reset zoom
    currentScale = 1;
    broll.style.setProperty('--base-scale', '1');
    broll.style.transform = "scale(1)";
    broll.style.transformOrigin = 'center center';
    brollContainer.style.animation = 'pulse 1.15s ease-in-out infinite';

    // Reset container overflow when scale returns to 1
    brollContainer.style.overflow = 'hidden';
    brollContainer.style.zIndex = 'auto';

    // Main image changed - next strip continues independently (no reset)
    console.log("📱 Main image changed - next strip continues independently");

  }

  function update(direction = 'right') {
    if (!images.length || isTransitioning) return;

    ratingContainer.style.display = "none";
    isTransitioning = true;
    slideDirection = direction;

    const slideInClass = direction === 'left' ? 'slide-in-right' : 'slide-in-left';

    // Hide current image and text instantly
    brollContainer.style.opacity = '0';
    nextStrip.style.opacity = '0';

    // Reset zoom
    currentScale = 1;

    // Update content after brief delay
    setTimeout(() => {
      updateCarousel();

      // Position new container off-screen for slide in
      brollContainer.classList.add(slideInClass);
      brollContainer.style.opacity = '1';

      // Slide in new content
      setTimeout(() => {
        broll.style.setProperty('--base-scale', '1');
        broll.style.transform = "scale(1)";
        broll.style.transformOrigin = 'center center';
        brollContainer.style.animation = 'pulse 1.15s ease-in-out infinite';
        brollContainer.classList.remove(slideInClass);

        // Reset container overflow when transitioning
        brollContainer.style.overflow = 'hidden';
        brollContainer.style.zIndex = 'auto';

        isTransitioning = false;
      }, 50);
    }, 200);

  }

  // --- Next Strip Auto-Rotation Functions ---
  function updateNextStripCards(startIndex, useTransition = true) {
    if (!images.length || images.length <= 2) return;

    // Calculate which images to show (with wrap-around)
    const card1Index = startIndex % images.length;
    const card2Index = (startIndex + 1) % images.length;

    if (useTransition) {
      console.log(`🎬 Transitioning to images #${card1Index + 1} and #${card2Index + 1}`);
    }

    // Direct update without any transitions - completely static
    nextCards[0].img.src = images[card1Index].src;
    nextCards[0].title.textContent = images[card1Index].caption;
    nextCards[1].img.src = images[card2Index].src;
    nextCards[1].title.textContent = images[card2Index].caption;
  }

  // === NEXT STRIP MOVEMENT FUNCTIONS ===

  function moveNextImages() {
    if (!images.length || images.length <= 2) return;

    // Get what's currently showing in next strip
    const currentFirstCard = nextCards[0];
    const currentSecondCard = nextCards[1];

    // Advance to next position in sequence
    nextStripStartIndex = (nextStripStartIndex + 1) % images.length;

    // Calculate what should show after movement
    const newFirstIndex = nextStripStartIndex; // New x
    const newSecondIndex = (nextStripStartIndex + 1) % images.length; // New x+1

    console.log(`📱 moveNextImages:`);
    console.log(`   Before: [${currentFirstCard.title.textContent}] [${currentSecondCard.title.textContent}]`);
    console.log(`   After:  [${images[newFirstIndex]?.caption}] [${images[newSecondIndex]?.caption}]`);
    console.log(`   NextStripIndex: ${nextStripStartIndex}`);

    // Step 1: Hide first card (x disappears)
    hideCard(currentFirstCard);

    // Step 2: Update first card with new x content and show it
    moveCardToFirstPosition(currentFirstCard, newFirstIndex);

    // Step 3: Update second card with new x+1 content
    showCardInSecondPosition(currentSecondCard, newSecondIndex);

    console.log(`✅ Movement complete: [${currentFirstCard.title.textContent}] [${currentSecondCard.title.textContent}]`);
  }

  // Helper functions to get current indices
  function getCurrentXIndex() {
    return (current + 1) % images.length;
  }

  function getCurrentXPlus1Index() {
    return (current + 2) % images.length;
  }

  function getNewXPlus2Index() {
    return (current + 3) % images.length;
  }

  // Movement functions (structured for future transitions)
  function hideCard(card) {
    // For now: instant disappear
    // Future: add transition logic here
    card.element.style.visibility = 'hidden';
  }

  function moveCardToFirstPosition(card, imageIndex) {
    // For now: instant move to first position with new content
    // Future: add sliding transition here
    card.img.src = images[imageIndex].src;
    card.title.textContent = images[imageIndex].caption;
    card.element.style.visibility = 'visible';
  }

  function showCardInSecondPosition(card, imageIndex) {
    // For now: instant appear with new content
    // Future: add sliding in transition here
    card.img.src = images[imageIndex].src;
    card.title.textContent = images[imageIndex].caption;
    card.element.style.visibility = 'visible';
  }

  // === TIMER FUNCTIONS ===

  function startNextStripTimer() {
    // Clear any existing timer
    if (nextStripTimer) {
      clearInterval(nextStripTimer);
    }

    console.log(`🕐 Starting 3-second timer for next strip movement`);

    // Start 3-second interval
    nextStripTimer = setInterval(() => {
      moveNextImages();
    }, MOVE_INTERVAL);
  }

  function startNextStripAutoRotation() {
    if (nextStripTimer) {
      clearInterval(nextStripTimer);
    }

    console.log(`\n🎬 AUTO-ROTATION STARTED`);
    console.log(`📊 Images loaded: ${images.length}`);
    console.log(`🎯 Starting index: ${nextStripIndex}`);
    console.log(`👀 Initial display: #${nextStripIndex + 1} ("${images[nextStripIndex]?.caption}") and #${nextStripIndex + 2} ("${images[nextStripIndex + 1]?.caption}")`);
    console.log(`⏰ Rotation interval: ${AUTO_ROTATION_INTERVAL}ms (${AUTO_ROTATION_INTERVAL/1000}s)`);
    console.log(`\n--- Rotation Log ---`);


    nextStripTimer = setInterval(() => {
      if (images.length > 2) {
        const oldIndex = nextStripIndex;
        nextStripIndex = (nextStripIndex + 1) % images.length;
        console.log(`🔄 Auto-rotating next strip: ${oldIndex} -> ${nextStripIndex}`);

        const card1Index = nextStripIndex % images.length;
        const card2Index = (nextStripIndex + 1) % images.length;
        console.log(`Will show images: #${card1Index + 1} ("${images[card1Index]?.caption}") and #${card2Index + 1} ("${images[card2Index]?.caption}")`);

        updateNextStripCards(nextStripIndex, true);

      } else {
        console.log("❌ Auto-rotation stopped: not enough images");
        stopNextStripAutoRotation();
      }
    }, AUTO_ROTATION_INTERVAL);
  }

  function stopNextStripAutoRotation() {
    if (nextStripTimer) {
      clearInterval(nextStripTimer);
      nextStripTimer = null;
    }
  }


  // --- Swipe / pinch detection ---
  let xDown = null;
  let yDown = null;
  let touchCount = 0;
  let isPinching = false;

  document.addEventListener("touchstart", (e) => {
    touchCount = e.touches.length;
    if (touchCount > 1) {
      isPinching = true;
    } else {
      xDown = e.touches[0].clientX;
      yDown = e.touches[0].clientY;
    }
  });

  document.addEventListener("touchmove", (e) => {
    if (e.touches.length > 1) {
      isPinching = true;
    }
  });

  document.addEventListener("touchend", (e) => {
    if (isPinching) {
      isPinching = false;
      xDown = null;
      yDown = null;
      touchCount = 0;
      return;
    }

    if (!xDown || !yDown) return;

    let xUp = e.changedTouches[0].clientX;
    let yUp = e.changedTouches[0].clientY;

    let xDiff = xDown - xUp;
    let yDiff = yDown - yUp;

    if (Math.abs(xDiff) > Math.abs(yDiff) && Math.abs(xDiff) > 30) {
      if (xDiff > 0 && current < images.length - 1) {
        current++;
        update('left'); // Swipe left (finger goes left) → content comes from right
      } else if (xDiff < 0 && current > 0) {
        current--;
        update('right'); // Swipe right (finger goes right) → content comes from left
      }
    }

    xDown = null;
    yDown = null;
    touchCount = 0;
  });

  // --- Pinch zoom for image only ---
  let currentScale = 1;
  let isZooming = false;

  brollContainer.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      isZooming = true;

      // Disable pulse animation during zoom
      brollContainer.style.animation = 'none';

      // Allow image to break out of container during zoom
      brollContainer.style.overflow = 'visible';
      brollContainer.style.zIndex = '1000';

      // Get initial distance and pinch center
      const initialDistance = getDistance(e.touches[0], e.touches[1]);
      const pinchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const pinchCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

      // Get image bounds (not container)
      const rect = broll.getBoundingClientRect();

      // Calculate pinch point relative to the image element
      const relativeX = (pinchCenterX - rect.left) / rect.width;
      const relativeY = (pinchCenterY - rect.top) / rect.height;

      // Clamp values to ensure they're within the image bounds
      const clampedX = Math.max(0, Math.min(1, relativeX));
      const clampedY = Math.max(0, Math.min(1, relativeY));

      // Convert to percentage for transform-origin
      const originX = clampedX * 100;
      const originY = clampedY * 100;

      // Set transform origin to pinch point
      broll.style.transformOrigin = `${originX}% ${originY}%`;

      // Store initial values
      broll.dataset.initialDistance = initialDistance;
      broll.dataset.initialScale = currentScale;
      broll.dataset.originX = originX;
      broll.dataset.originY = originY;
    }
  }, { passive: false });

  brollContainer.addEventListener("touchmove", (e) => {
    if (e.touches.length === 2 && isZooming) {
      e.preventDefault();

      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const initialDistance = parseFloat(broll.dataset.initialDistance);
      const initialScale = parseFloat(broll.dataset.initialScale);

      // Calculate new scale
      const scaleChange = currentDistance / initialDistance;
      let newScale = initialScale * scaleChange;

      // Prevent zooming out beyond original size
      newScale = Math.max(1, newScale);

      // Maintain the pinch point transform origin throughout zoom
      if (newScale > 1) {
        const originX = parseFloat(broll.dataset.originX);
        const originY = parseFloat(broll.dataset.originY);
        broll.style.transformOrigin = `${originX}% ${originY}%`;
      } else {
        // Only reset to center when fully zoomed out
        broll.style.transformOrigin = 'center center';
      }

      currentScale = newScale;

      // Apply scale only to the image - let transform-origin handle the positioning
      broll.style.setProperty('--base-scale', newScale);
      broll.style.transform = `scale(${newScale})`;
    }
  }, { passive: false });

  brollContainer.addEventListener("touchend", (e) => {
    if (e.touches.length < 2) {
      isZooming = false;

      // Re-enable pulse animation
      brollContainer.style.animation = 'pulse 1.15s ease-in-out infinite';

      // Only reset container overflow if image is back to normal scale
      if (currentScale <= 1) {
        brollContainer.style.overflow = 'hidden';
        brollContainer.style.zIndex = 'auto';
      }

      // Clean up data attributes
      delete broll.dataset.initialDistance;
      delete broll.dataset.initialScale;
      delete broll.dataset.originX;
      delete broll.dataset.originY;
    }
  });

  function getDistance(t1, t2) {
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  }

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    if ((e.key === "ArrowRight" || e.key === " " || e.key === "Enter") && current < images.length - 1) {
      current++;
      update('left'); // Arrow right → content comes from right
    } else if (e.key === "ArrowLeft" && current > 0) {
      current--;
      update('right'); // Arrow left → content comes from left
    }
  });

  // Prevent Chrome Ctrl+scroll zoom
  document.addEventListener("wheel", (e) => {
    if (e.ctrlKey) e.preventDefault();
  }, { passive: false });

  // Handle window resize to recalculate container dimensions
  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (images.length > 0) {
        updateCarousel();
      }
    }, 100);
  });

  showRatingBtn.addEventListener("click", () => {
    if (showRatingBtn.textContent.startsWith("SHOW")) {
      // Show rating
      ratingContainer.style.display = "flex";
      showRatingBtn.textContent = "HIDE";

      // Animation
      const ratingValue = images[current].rating;
      const digitHeight = 70;
      const totalDigits = 11;

      // 1. Reset to 0
      ratingSpinner.style.transition = 'none';
      ratingSpinner.style.transform = `translateY(0px)`;

      setTimeout(() => {
        const finalPosition = -((animationRounds * totalDigits * digitHeight) + (ratingValue * digitHeight));
        const duration = 2 + animationRounds; // Adjust duration based on rounds

        ratingSpinner.style.transition = `transform ${duration}s cubic-bezier(0.25, 0.1, 0.25, 1)`;
        ratingSpinner.style.transform = `translateY(${finalPosition}px)`;
      }, 10);

    } else {
      // Hide rating
      ratingContainer.style.display = "none";
      const currentRating = images[current].rating;
      showRatingBtn.textContent = `SHOW(${currentRating})`;
    }
  });

  loadImages();
});