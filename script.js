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
    link.addEventListener("click", () => {
      const goalName = link.dataset.metrikaGoal;

      if (goalName && typeof window.ym === "function") {
        window.ym(110711208, "reachGoal", goalName);
      }
    });

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
  const easterEggDefinitions = [
    {
      side: "left",
      verticalPosition: 0.43,
      rows: [
        "110000000000",
        "011000000000",
        "001100000000",
        "000110000000",
        "001100000000",
        "011000000000",
        "110000111111",
      ],
    },
    {
      side: "right",
      verticalPosition: 0.57,
      rows: [
        "1111110110011",
        "0000110110011",
        "0001100110011",
        "0011000111111",
        "0110000110011",
        "1100000110011",
        "1111110110011",
      ],
    },
  ];
  const easterEggTimings = {
    assemble: 500,
    hold: 650,
    dissolve: 500,
    firstDelayMin: 35_000,
    firstDelayMax: 50_000,
    repeatDelayMin: 70_000,
    repeatDelayMax: 110_000,
  };
  const easterEggDuration = easterEggTimings.assemble
    + easterEggTimings.hold
    + easterEggTimings.dissolve;
  let width = 0;
  let height = 0;
  let drops = new Float32Array(0);
  let speeds = new Float32Array(0);
  let easterEggLayouts = [null, null];
  let easterEggHasSpace = false;
  let easterEggActive = false;
  let easterEggIndex = 0;
  let easterEggStartedAt = 0;
  let nextEasterEggAt = 0;
  let canvasFontStack = "monospace";
  let animationFrame = 0;
  let resizeFrame = 0;
  let lastFrameTime = 0;
  let running = false;

  const randomBetween = (minimum, maximum) => minimum + Math.random() * (maximum - minimum);

  const canShowEasterEgg = () => easterEggHasSpace
    && !document.hidden
    && !reducedMotion.matches;

  const cancelEasterEgg = () => {
    easterEggActive = false;
    easterEggStartedAt = 0;
  };

  const scheduleEasterEgg = (timestamp, isFirstAppearance) => {
    const minimum = isFirstAppearance
      ? easterEggTimings.firstDelayMin
      : easterEggTimings.repeatDelayMin;
    const maximum = isFirstAppearance
      ? easterEggTimings.firstDelayMax
      : easterEggTimings.repeatDelayMax;

    cancelEasterEgg();
    nextEasterEggAt = timestamp + randomBetween(minimum, maximum);
  };

  const createEasterEggLayout = (definition, zoneStart, zoneEnd) => {
    const rowCount = definition.rows.length;
    const columnCount = definition.rows[0].length;
    const availableWidth = zoneEnd - zoneStart;
    const cellSize = Math.floor(Math.min(
      20,
      220 / columnCount,
      140 / rowCount,
      availableWidth / columnCount,
    ));

    if (cellSize < 12) {
      return null;
    }

    const symbolWidth = columnCount * cellSize;
    const symbolHeight = rowCount * cellSize;
    const originX = zoneStart + (availableWidth - symbolWidth) / 2;
    const originY = Math.max(
      24,
      Math.min(
        height - symbolHeight - 24,
        height * definition.verticalPosition - symbolHeight / 2,
      ),
    );
    const points = [];

    for (let row = 0; row < rowCount; row += 1) {
      for (let column = 0; column < columnCount; column += 1) {
        if (definition.rows[row][column] !== "1") {
          continue;
        }

        points.push({
          x: originX + column * cellSize,
          y: originY + row * cellSize,
          delay: Math.random(),
          jitterX: Math.random() * 2 - 1,
          jitterY: Math.random() * 2 - 1,
          glyphOffset: Math.floor(Math.random() * glyphs.length),
          alpha: 0.48 + Math.random() * 0.28,
        });
      }
    }

    return {
      points,
      fontSize: Math.max(13, Math.floor(cellSize * 0.92)),
      left: originX,
      right: originX + symbolWidth,
    };
  };

  const prepareEasterEggLayouts = () => {
    const terminal = document.querySelector(".terminal");

    if (!terminal || width < 1200 || height < 650) {
      easterEggLayouts = [null, null];
      easterEggHasSpace = false;
      return;
    }

    const terminalRect = terminal.getBoundingClientRect();
    const edgePadding = 24;
    const terminalGap = 56;
    const leftLayout = createEasterEggLayout(
      easterEggDefinitions[0],
      edgePadding,
      terminalRect.left - terminalGap,
    );
    const rightLayout = createEasterEggLayout(
      easterEggDefinitions[1],
      terminalRect.right + terminalGap,
      width - edgePadding,
    );

    easterEggLayouts = [leftLayout, rightLayout];
    easterEggHasSpace = Boolean(
      leftLayout
      && rightLayout
      && leftLayout.right <= terminalRect.left - terminalGap
      && rightLayout.left >= terminalRect.right + terminalGap,
    );
  };

  const updateEasterEggAvailability = (timestamp) => {
    const wasAvailable = canShowEasterEgg();
    prepareEasterEggLayouts();

    if (!canShowEasterEgg()) {
      cancelEasterEgg();
      nextEasterEggAt = 0;
      return;
    }

    if (!wasAvailable || !nextEasterEggAt) {
      scheduleEasterEgg(timestamp, true);
    }
  };

  const drawEasterEgg = (timestamp) => {
    if (!canShowEasterEgg()) {
      return;
    }

    if (!easterEggActive && nextEasterEggAt && timestamp >= nextEasterEggAt) {
      easterEggActive = true;
      easterEggStartedAt = timestamp;
    }

    if (!easterEggActive) {
      return;
    }

    const elapsed = timestamp - easterEggStartedAt;

    if (elapsed >= easterEggDuration) {
      easterEggActive = false;
      easterEggIndex = (easterEggIndex + 1) % easterEggLayouts.length;
      nextEasterEggAt = Math.max(
        easterEggStartedAt + randomBetween(
          easterEggTimings.repeatDelayMin,
          easterEggTimings.repeatDelayMax,
        ),
        timestamp + 60_000,
      );
      return;
    }

    const layout = easterEggLayouts[easterEggIndex];
    if (!layout) {
      cancelEasterEgg();
      nextEasterEggAt = 0;
      return;
    }

    const assembleEnd = easterEggTimings.assemble;
    const holdEnd = assembleEnd + easterEggTimings.hold;
    const isAssembling = elapsed < assembleEnd;
    const isDissolving = elapsed >= holdEnd;
    const phaseProgress = isAssembling
      ? elapsed / easterEggTimings.assemble
      : isDissolving
        ? (elapsed - holdEnd) / easterEggTimings.dissolve
        : 1;
    context.save();
    context.font = `${layout.fontSize}px ${canvasFontStack}`;
    context.textBaseline = "top";

    for (let index = 0; index < layout.points.length; index += 1) {
      const point = layout.points[index];
      const visibility = isAssembling
        ? Math.max(0, Math.min(1, (phaseProgress - point.delay * 0.35) / 0.65))
        : isDissolving
          ? 1 - Math.max(0, Math.min(1, (phaseProgress - point.delay * 0.25) / 0.75))
          : 1;

      if (visibility <= 0) {
        continue;
      }

      const easedVisibility = visibility * visibility * (3 - 2 * visibility);
      const scatter = (1 - easedVisibility) * 11;
      const shimmer = Math.sin(timestamp * 0.003 + point.delay * 12) * 0.65;
      const x = point.x + point.jitterX * scatter + shimmer;
      const y = point.y + point.jitterY * scatter - shimmer * 0.45;
      const glyphIndex = (
        point.glyphOffset
        + Math.floor(timestamp / 120)
        + index
      ) % glyphs.length;

      context.fillStyle = `rgba(98, 255, 120, ${point.alpha * easedVisibility})`;
      context.fillText(glyphs[glyphIndex], x, y);
    }

    context.restore();
  };

  const resizeCanvas = () => {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.max(1, Math.floor(width * pixelRatio));
    canvas.height = Math.max(1, Math.floor(height * pixelRatio));
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    canvasFontStack = getComputedStyle(document.documentElement).getPropertyValue("--font-mono");
    context.font = `${fontSize}px ${canvasFontStack}`;
    context.textBaseline = "top";

    const columnCount = Math.ceil(width / fontSize);
    drops = new Float32Array(columnCount);
    speeds = new Float32Array(columnCount);

    for (let index = 0; index < columnCount; index += 1) {
      drops[index] = -Math.random() * (height / fontSize + 12);
      speeds[index] = 0.38 + Math.random() * 0.48;
    }

    updateEasterEggAvailability(performance.now());
  };

  const drawRain = (timestamp) => {
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

    drawEasterEgg(timestamp);
  };

  const animate = (timestamp) => {
    if (!running) {
      return;
    }

    const elapsed = timestamp - lastFrameTime;
    if (elapsed >= frameInterval) {
      lastFrameTime = timestamp - (elapsed % frameInterval);
      drawRain(timestamp);
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
    drawRain(lastFrameTime);
    animationFrame = window.requestAnimationFrame(animate);
  };

  const updateMotionPreference = () => {
    if (reducedMotion.matches) {
      cancelEasterEgg();
      nextEasterEggAt = 0;
      stopRain();
      context.clearRect(0, 0, width, height);
    } else {
      if (canShowEasterEgg() && !nextEasterEggAt) {
        scheduleEasterEgg(performance.now(), true);
      }
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
      cancelEasterEgg();
      nextEasterEggAt = 0;
      stopRain();
    } else {
      prepareEasterEggLayouts();
      if (canShowEasterEgg()) {
        scheduleEasterEgg(performance.now(), false);
      }
      startRain();
    }
  });

  reducedMotion.addEventListener("change", updateMotionPreference);
  resizeCanvas();
  updateMotionPreference();
})();
