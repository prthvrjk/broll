document.addEventListener("DOMContentLoaded", () => {
  const animationRounds = 0;
  const extensions = ["jpg", "jpeg", "png", "webp"];
  let images = [];
  let current = 0;

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
  }

  let isTransitioning = false;
  let slideDirection = 'right'; // Track slide direction

  function calculateImageDimensions() {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Use available space after left sidebar
        const maxWidth = window.innerWidth - 280; // Full width minus sidebar (220px + 30px gap + 30px margin)
        const maxHeight = window.innerHeight - 40; // Full height minus top/bottom margins

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

    // Update next previews (next 2 images)
    let hasNextImages = false;

    for (let i = 0; i < 2; i++) {
      const nextIndex = current + i + 1;
      const card = nextCards[i];

      if (nextIndex < images.length) {
        card.img.src = images[nextIndex].src;
        card.title.textContent = images[nextIndex].caption;
        card.element.style.display = 'block';
        hasNextImages = true;
      } else {
        card.element.style.display = 'none';
      }
    }

    // Show/hide the entire strip
    nextStrip.style.opacity = hasNextImages ? '1' : '0';

    // Update rating button text
    showRatingBtn.textContent = "SHOW";

    // Reset zoom and position
    currentScale = 1;
    currentTranslateX = 0;
    currentTranslateY = 0;
    broll.style.setProperty('--base-scale', '1');
    broll.style.transform = "translate3d(0px, 0px, 0) scale(1)";
    broll.style.transformOrigin = 'center center';
    brollContainer.style.animation = 'pulse 1.15s ease-in-out infinite';

    // Reset container overflow when scale returns to 1
    brollContainer.style.overflow = 'hidden';
    brollContainer.style.zIndex = 'auto';

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
        broll.style.transform = "translate3d(0px, 0px, 0) scale(1)";
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


  // --- Pinch zoom for image ---
  let currentScale = 1;
  let isZooming = false;
  let currentTranslateX = 0;
  let currentTranslateY = 0;

  // Touch variables for swipe detection
  let touchStartX = 0;
  let touchStartY = 0;
  let swipeThreshold = 50; // Minimum distance for a swipe
  let swipeTimeThreshold = 300; // Maximum time for a swipe (ms)
  let touchStartTime = 0;

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
    } else if (e.touches.length === 1) {
      // Single finger touch for swipe detection
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
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

      // Auto-reset position when zooming back to scale 1
      if (newScale <= 1 && currentScale > 1) {
        // Reset position when zoom reaches 1
        currentTranslateX = 0;
        currentTranslateY = 0;
        broll.style.transformOrigin = 'center center';
      } else if (newScale > 1) {
        // Maintain the pinch point transform origin throughout zoom
        const originX = parseFloat(broll.dataset.originX);
        const originY = parseFloat(broll.dataset.originY);
        broll.style.transformOrigin = `${originX}% ${originY}%`;
      } else {
        // Reset to center when fully zoomed out
        broll.style.transformOrigin = 'center center';
      }

      currentScale = newScale;

      // Apply scale and translation to the image
      broll.style.setProperty('--base-scale', newScale);
      broll.style.transform = `translate3d(${currentTranslateX}px, ${currentTranslateY}px, 0) scale(${newScale})`;
    }
    // Removed single finger drag functionality - now handled by swipe detection
  }, { passive: false });

  brollContainer.addEventListener("touchend", (e) => {
    if (e.touches.length < 2) {
      isZooming = false;
    }

    if (e.touches.length === 0) {
      // Handle swipe detection for single finger gestures
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const touchEndTime = Date.now();

      const deltaX = touchEndX - touchStartX;
      const deltaY = touchStartY - touchEndY; // Note: Y is flipped for intuitive direction
      const deltaTime = touchEndTime - touchStartTime;

      // Check if this was a swipe gesture
      const isSwipe = Math.abs(deltaX) > swipeThreshold && deltaTime < swipeTimeThreshold;
      const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);

      if (isSwipe && isHorizontalSwipe && !isTransitioning) {
        if (deltaX > 0 && current > 0) {
          // Swipe right - go to previous image
          current--;
          update('right');
        } else if (deltaX < 0 && current < images.length - 1) {
          // Swipe left - go to next image
          current++;
          update('left');
        }
      }

      // Re-enable pulse animation and transitions
      brollContainer.style.animation = 'pulse 1.15s ease-in-out infinite';
      broll.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

      // Only reset container overflow if image is back to normal scale AND position
      if (currentScale <= 1 && currentTranslateX === 0 && currentTranslateY === 0) {
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
    if (showRatingBtn.textContent === "SHOW") {
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
      showRatingBtn.textContent = "SHOW";
    }
  });


  loadImages();
});