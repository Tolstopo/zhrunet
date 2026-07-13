(() => {
  "use strict";

  document.documentElement.classList.add("js");

  const destinations = Array.from(document.querySelectorAll(".destination"));
  const destinationsContainer = document.querySelector(".destinations");
  const commandStatus = document.getElementById("command-status");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const decodedLinks = new WeakSet();
  let selectedIndex = -1;
  let keyboardIndex = -1;
  let focusIndex = -1;
  let hoverIndex = -1;

  const updateSelection = () => {
    selectedIndex = hoverIndex >= 0
      ? hoverIndex
      : focusIndex >= 0
        ? focusIndex
        : keyboardIndex;

    const arrowSelectionActive = selectedIndex >= 0
      && selectedIndex === keyboardIndex
      && hoverIndex < 0;

    destinations.forEach((link, linkIndex) => {
      link.classList.toggle("is-selected", linkIndex === selectedIndex);
      link.classList.toggle(
        "is-arrow-selected",
        arrowSelectionActive && linkIndex === selectedIndex,
      );
    });

    destinationsContainer?.classList.toggle("has-active", selectedIndex >= 0);

    if (commandStatus) {
      const label = selectedIndex >= 0
        ? destinations[selectedIndex].querySelector(".destination-label")?.textContent
        : "";

      commandStatus.textContent = label
        ? `ВЫБРАНО: ${label}`
        : "ВЫБЕРИТЕ НАПРАВЛЕНИЕ";
    }
  };

  const clearSelected = () => {
    const activeElement = document.activeElement;
    keyboardIndex = -1;
    focusIndex = -1;
    hoverIndex = -1;
    updateSelection();

    if (activeElement instanceof HTMLElement && destinations.includes(activeElement)) {
      activeElement.blur();
    }
  };

  destinations.forEach((link, index) => {
    link.addEventListener("pointerenter", () => {
      keyboardIndex = -1;
      hoverIndex = index;
      updateSelection();
    });
    link.addEventListener("pointerleave", () => {
      if (hoverIndex === index) {
        hoverIndex = -1;
        updateSelection();
      }
    });
    link.addEventListener("focus", () => {
      focusIndex = index;
      updateSelection();
    });
    link.addEventListener("blur", () => {
      if (focusIndex === index) {
        focusIndex = -1;
        updateSelection();
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }

    if (event.key === "Tab") {
      keyboardIndex = -1;
      hoverIndex = -1;
      updateSelection();
      return;
    }

    if (/^[123]$/.test(event.key)) {
      event.preventDefault();
      destinations[Number(event.key) - 1]?.click();
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      hoverIndex = -1;
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const initialIndex = direction === 1 ? 0 : destinations.length - 1;
      const nextIndex = selectedIndex < 0
        ? initialIndex
        : (selectedIndex + direction + destinations.length) % destinations.length;

      keyboardIndex = nextIndex;
      destinations[nextIndex].focus();
      updateSelection();
      return;
    }

    if (event.key === "Enter" && selectedIndex >= 0) {
      event.preventDefault();
      destinations[selectedIndex].click();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      clearSelected();
    }
  });

  const uptimeElement = document.getElementById("uptime");

  if (uptimeElement) {
    const sessionStartedAt = Date.now();
    let uptimeInterval = 0;

    const formatUptime = (totalSeconds) => {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const paddedMinutes = String(minutes).padStart(2, "0");
      const paddedSeconds = String(seconds).padStart(2, "0");

      return hours > 0
        ? `${String(hours).padStart(2, "0")}:${paddedMinutes}:${paddedSeconds}`
        : `${paddedMinutes}:${paddedSeconds}`;
    };

    const updateUptime = () => {
      if (!uptimeElement.isConnected) {
        if (uptimeInterval) {
          window.clearInterval(uptimeInterval);
          uptimeInterval = 0;
        }
        return;
      }

      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 1000));
      uptimeElement.textContent = formatUptime(elapsedSeconds);
      uptimeElement.dateTime = `PT${elapsedSeconds}S`;
    };

    updateUptime();
    uptimeInterval = window.setInterval(updateUptime, 1000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        updateUptime();
      }
    });
  }

  const decodeCharacters = "01#%*+=<>ЖРУНЕТ";

  const runDecode = (link) => {
    if (decodedLinks.has(link) || reducedMotion.matches) {
      return;
    }

    const label = link.querySelector(".destination-label");
    const labelWrap = link.querySelector(".label-wrap");
    const layer = link.querySelector(".decode-layer");

    if (!label || !labelWrap || !layer) {
      return;
    }

    decodedLinks.add(link);
    const original = label.textContent || "";
    const duration = 360;
    let startTime;

    labelWrap.classList.add("is-decoding");

    const finish = () => {
      layer.textContent = "";
      labelWrap.classList.remove("is-decoding");
    };

    const render = (timestamp) => {
      if (reducedMotion.matches) {
        finish();
        return;
      }

      startTime ??= timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const resolvedCharacters = Math.floor(progress * original.length);
      let frameText = "";

      for (let index = 0; index < original.length; index += 1) {
        const character = original[index];
        if (character === " " || index < resolvedCharacters) {
          frameText += character;
        } else {
          frameText += decodeCharacters[Math.floor(Math.random() * decodeCharacters.length)];
        }
      }

      layer.textContent = frameText;

      if (progress < 1) {
        window.requestAnimationFrame(render);
      } else {
        finish();
      }
    };

    window.requestAnimationFrame(render);
  };

  destinations.forEach((link) => {
    link.addEventListener("pointerenter", () => runDecode(link), { once: true });
    link.addEventListener("focus", () => runDecode(link), { once: true });
  });

  const canvas = document.getElementById("digital-rain");
  const context = canvas instanceof HTMLCanvasElement
    ? canvas.getContext("2d", { alpha: true })
    : null;

  if (!canvas || !context) {
    return;
  }

  const glyphs = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZЖРУНЕТ<>/\\|";
  const frameInterval = 1000 / 30;
  const fontSize = 16;
  let width = 0;
  let height = 0;
  let drops = new Float32Array(0);
  let speeds = new Float32Array(0);
  let animationFrame = 0;
  let resizeFrame = 0;
  let lastFrameTime = 0;
  let running = false;

  const resizeCanvas = () => {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.max(1, Math.floor(width * pixelRatio));
    canvas.height = Math.max(1, Math.floor(height * pixelRatio));
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.font = `${fontSize}px ${getComputedStyle(document.documentElement).getPropertyValue("--font-mono")}`;
    context.textBaseline = "top";

    const columnCount = Math.ceil(width / fontSize);
    drops = new Float32Array(columnCount);
    speeds = new Float32Array(columnCount);

    for (let index = 0; index < columnCount; index += 1) {
      drops[index] = -Math.random() * (height / fontSize + 12);
      speeds[index] = 0.38 + Math.random() * 0.48;
    }
  };

  const drawRain = () => {
    context.fillStyle = "rgba(2, 5, 3, 0.17)";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "rgba(98, 255, 120, 0.9)";

    for (let index = 0; index < drops.length; index += 1) {
      const glyph = glyphs[Math.floor(Math.random() * glyphs.length)];
      const x = index * fontSize;
      const y = drops[index] * fontSize;
      context.fillText(glyph, x, y);
      drops[index] += speeds[index];

      if (y > height + fontSize && Math.random() > 0.975) {
        drops[index] = -Math.random() * 18;
        speeds[index] = 0.38 + Math.random() * 0.48;
      }
    }
  };

  const animate = (timestamp) => {
    if (!running) {
      return;
    }

    const elapsed = timestamp - lastFrameTime;
    if (elapsed >= frameInterval) {
      lastFrameTime = timestamp - (elapsed % frameInterval);
      drawRain();
    }

    animationFrame = window.requestAnimationFrame(animate);
  };

  const stopRain = () => {
    running = false;
    if (animationFrame) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  };

  const startRain = () => {
    if (running || document.hidden || reducedMotion.matches) {
      return;
    }

    running = true;
    lastFrameTime = performance.now();
    drawRain();
    animationFrame = window.requestAnimationFrame(animate);
  };

  const updateMotionPreference = () => {
    if (reducedMotion.matches) {
      stopRain();
      context.clearRect(0, 0, width, height);
    } else {
      startRain();
    }
  };

  window.addEventListener("resize", () => {
    if (resizeFrame) {
      return;
    }

    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      resizeCanvas();
      if (!running) {
        startRain();
      }
    });
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopRain();
    } else {
      startRain();
    }
  });

  reducedMotion.addEventListener("change", updateMotionPreference);
  resizeCanvas();
  updateMotionPreference();
})();
