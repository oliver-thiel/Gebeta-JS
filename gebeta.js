const houses = [
  {name: "A1",
    next: "B1",
    content: 4,
    owner: 0,
  },
  {name: "B1",
    next: "C1",
    content: 4,
    owner: 0,
  },
  {name: "C1",
    next: "D1",
    content: 4,
    owner: 0,
  },
  {name: "D1",
    next: "E1",
    content: 4,
    owner: 0,
  },
  {name: "E1",
    next: "F1",
    content: 4,
    owner: 0,
  },
  {name: "F1",
    next: "F2",
    content: 4,
    owner: 0,
  },
  {name: "F2",
    next: "E2",
    content: 4,
    owner: 1,
  },
  {name: "E2",
    next: "D2",
    content: 4,
    owner: 1,
  },
  {name: "D2",
    next: "C2",
    content: 4,
    owner: 1,
  },
  {name: "C2",
    next: "B2",
    content: 4,
    owner: 1,
  },
  {name: "B2",
    next: "A2",
    content: 4,
    owner: 1,
  },
  {name: "A2",
    next: "A1",
    content: 4,
    owner: 1,
  },
];

const hands = [
  {name: "hand_a",
    content: 0,
  },
  {name: "hand_b",
    content: 0,
  },
];

const capturedFamilies = [
  {name: "family_a",
    content: 0,
  },
  {name: "family_b",
    content: 0,
  },
];

const pos = {
  x: [-40, -40,  40, 40, 0,  0, -60, 60,   0, -30, -80, -80,  30, -30,  30, 80,  80,  100, 100, -100, -100],
  y: [ 40, -40, -40, 40, 0, 60,   0,  0, -60,  80,  30, -30, -80, -80, -80, 30, -30, -100, 100,  100, -100],
};

const els = {
  svgHost: document.querySelector("#svg-host"),
  status: document.querySelector("#status"),
  audio: document.querySelector("#audio"),
};

let game;
let AI;

const supportedLanguages = new Set(["EN", "NO", "DE"]);
const inactivityPromptDelay = 20000; // Delay in milliseconds before playing the inactivity prompt sound if the user is inactive
const state = {
  screen: "language",
  AI: false,
  currentPlayer: 0,
  currentHouse: "",
  turn: -1,
  currentSound: "",
  soundON: true,
  language: "",
  inactivityTimer: 0,
  statusTimer: 0,
  drag: null,
};

// Helping functions
function delay(milliseconds) {
  // Pauses the execution
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function scheduleInactivityPrompt() {
  // Schedule a prompt to play after a period of inactivity, but only if the conditions for playing the prompt are met.
  window.clearTimeout(state.inactivityTimer);
  state.inactivityTimer = 0;

  state.inactivityTimer = window.setTimeout(() => {
    state.inactivityTimer = 0;

    playCurrentSound();
    scheduleInactivityPrompt();
  }, inactivityPromptDelay);
}

function playCurrentSound() {
  // Play the current sound if available
  if (!state.currentSound) {
    return;
  }

  playSound(state.currentSound);
}

function playSound(soundPath) {
  // Play the current sound if available, or show a message prompting the user to click to play if autoplay is blocked
  if (!soundPath || !state.soundON) {
    return;
  }

  if (state.language === "DE") {
    soundPath = soundPath + "DE.mp3"
  } else if (state.language === "NO") {
    soundPath = soundPath + "NO.mp3"
  } else {
    soundPath = soundPath + "EN.mp3"
  }
  els.audio.src = encodeURI(soundPath);
  els.audio.currentTime = 0;
  els.audio.play().catch(() => {
    if (state.screen === "choose" || state.screen === "sow") {
      showStatus("Click the questionmark to get help.",
        "Klick auf das Fragezeichen, um Hilfe zu bekommen.",
        "Klikk på spørsmålstegnet for å få hjelp.", "bad", 2500);
    }
  });
}

function toggleSound() {
  // Switches the sound on or off
  if (state.soundON) {
      state.soundON = false;
    } else {
      state.soundON = true;
    }
  const onIcon = els.svgHost.querySelector("#sound-on");
  const offIcon = els.svgHost.querySelector("#sound-off");
  if (onIcon && offIcon) {
    if (!state.soundON) {
        onIcon.style.display = "none";
        offIcon.style.display = "block";
      } else {
        onIcon.style.display = "block";
        offIcon.style.display = "none";
      }
  }
}

function hidePlayer(player) {
  // Hide the specified player
  const handId = player === 0 ? "hand_a" : "hand_b";
  const hand = els.svgHost.querySelector(`#${handId}`);
  if (hand) {
    hand.style.display = "none";
  }
  const playerId = player === 0 ? "player_a" : "player_b";
  const playerElement = els.svgHost.querySelector(`#${playerId}`);
  if (playerElement) {
    playerElement.style.display = "none";
  }
}

function showPlayer(player) {
  // Show the specified player 
  const handId = player === 0 ? "hand_a" : "hand_b";
  const hand = els.svgHost.querySelector(`#${handId}`);
  if (hand) {
    hand.style.display = "block";
  }
  const playerId = player === 0 ? "player_a" : "player_b";
  const playerElement = els.svgHost.querySelector(`#${playerId}`);
  if (playerElement) {
    playerElement.style.display = "block";
  }
}

// Task and interaction-related functions
async function loadSvg(svgPath, soundPath, screen) {
  // Load the SVG file from the given path, update the current screen and sound, and prepare the SVG for interaction
  state.screen = screen;
  state.currentSound = soundPath;
  els.svgHost.innerHTML = "";

  try {
    const response = await fetch(encodeURI(svgPath));
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    els.svgHost.innerHTML = await response.text();
    prepareSvg();
    playCurrentSound();
    if (screen === "choose") {
      hidePlayer(1);
      if (state.AI) {
        showStatus("You play against an AI.", "Du spielst gegen eine KI.", "Du spiller mot en KI.", playerColour(), 2500);
      } else {
        showStatus(`Turn ${state.turn}: Player ${state.currentPlayer + 1}'s turn.`, 
          `Runde ${state.turn}: Spieler ${state.currentPlayer + 1} ist am Zug.`, 
          `Trekk ${state.turn}: Spiller ${state.currentPlayer + 1} sin tur.`, 
          playerColour(), 
          2500);
      }
    }
  } catch (error) {
    showStatus(`Could not load SVG ${svgPath}.`,
      `Konnte SVG ${svgPath} nicht laden.`,
      `Kunne ikke laste inn SVG ${svgPath}.`, "bad", 5000);
    console.error(error);
  }
  scheduleInactivityPrompt();
}

function prepareSvg() {
  // Set up the loaded SVG for interaction by adjusting attributes and making interactive elements focusable
  const svg = els.svgHost.querySelector("svg");
  if (!svg) {
    return;
  }

  svg.removeAttribute("width");
  svg.removeAttribute("height");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("role", "img");
  svg.querySelectorAll(".target, .counter, .sound, .rules, .help-btn, .player").forEach((node) => {
    node.setAttribute("tabindex", "0");
  });
  const offIcon = svg.querySelector(`#sound-off`);
  if (offIcon) {
    offIcon.style.display = "none";
  }

  svg.querySelectorAll(".counter").forEach((node) => {
    node.addEventListener("pointerdown", (event) => handlePointerDown(event), { passive: false });
    node.addEventListener("mousedown", (event) => handlePointerDown(pointerLikeMouse(event)), { passive: false });
    node.addEventListener("touchstart", (event) => {
      const pointer = pointerLikeTouch(event);
      if (pointer) {
        handlePointerDown(pointer);
      }
    }, { passive: false });
  });
}

// Phase 1: Language selection and rule explanation
function startSession() {
  // Start a new game by first choosing the language
  state.language = "";
  loadSvg("language.svg", "language", "language");
}

function selectLanguage(choice) {
  // The user selects the language
  const language = choiceValue(choice).toUpperCase();
  if (!supportedLanguages.has(language)) {
    showStatus("Choose NO, EN, or DE.", "Wähl NO, EN oder DE.", "Velg NO, EN eller DE.", "bad", 2500);
    return;
  }

  state.language = language;
  // Proceed to the rules
  selectOpponent();
}

function selectOpponent() {
  // The user selects the opponent
  if (state.language === "DE") {
    loadSvg("gegner.svg", "opponent", "opponent");
  } else if (state.language === "NO") {
    loadSvg("motstander.svg", "opponent", "opponent");
  } else {
    loadSvg("opponent.svg", "opponent", "opponent");
  }
}

function explainGame() {
  // Load the game explanation screen
  if (state.language === "DE") {
    loadSvg("regeln.svg", "continue", "rules");
  } else if (state.language === "NO") {
    loadSvg("regler.svg", "continue", "rules");
  } else {
    loadSvg("rules.svg", "continue", "rules");
  }
}

// Phase 2: Main game
function loadGame() {
  // Load the initial game screen and reset the turn state
  state.turn = 1;
  if (state.AI) {
    game = new Gebeta();
    AI = new MCTS(game, 1);
  }
  loadSvg("gebeta.svg", "chooseHome", "choose");
}


// Show the rules in another tab to not disturbe the game
function showRules() {
  // Load the rules screen
  if (state.language === "DE") {
    window.open("regeln.svg", "_blank");
  } else if (state.language === "NO") {
    window.open("regler.svg", "_blank");
  } else {
    window.open("rules.svg", "_blank");
  }
}


//Gameplay functions
async function selectHouse(choice) {
  // The human player selects a home to sow from, and the game logic determines the next steps based on the selected home
  const houseName = choiceValue(choice);
  const house = houses.find((h) => h.name === houseName);
  if (!house) {
    showStatus("Choose a home.", "Wähl ein Haus.", "Velg en hus.", playerColour(), 2500);
    return;
  }

  if (house.owner !== state.currentPlayer) {
    showStatus("You can only choose your own homes.", "Du kannst nur eigene Häuser wählen.", "Du kan kun velge dine egne hus.", "bad", 2500);
    return;
  }

  if (house.content <= 0) {
    showStatus("This home is empty.", "Dieses Haus ist leer.", "Dette huset er tomt.", "bad", 2500);
    return;
  }

  showStatus(`You selected home ${house.name}.`, `Du hast Haus ${house.name} ausgewählt.`, `Du valgte hus ${house.name}.`, playerColour(), 2500);
  await moveCountersToHand(house);
  // After moving the counters to the hand, transition to the sowing phase
  state.screen = "sow";
  state.currentHouse = house.next;
  state.currentSound = "sow"
  playCurrentSound();
}

async function moveCountersToHand(house) {
  // Move all counters from the selected house to the current player's hand, updating the game state accordingly.
  // This works for both the human and the AI player
  const handId = state.currentPlayer === 0 ? "hand_a" : "hand_b";
  const hand = els.svgHost.querySelector(`#${handId}`);
  const houseNode = els.svgHost.querySelector(`#${house.name}`);
  if (!hand || !houseNode) {
    return;
  }

  const handX = Number(hand.getAttribute("x")) || 50;
  const handY = Number(hand.getAttribute("y")) || 0;
  const handWidth = Number(hand.getAttribute("width")) || 1800;
  const handHeight = Number(hand.getAttribute("height")) || 70;

  const counters = [...els.svgHost.querySelectorAll(".counter")]
    .filter((counter) => findHouse(counter) === houseNode);

  const handCenterY = handY + handHeight / 2;
  const handCenterX = handX + handWidth / 2;
  const step = 70
  const startX = handCenterX - ((counters.length - 1) * step) / 2;

  const movements = counters.map((counter, index) => {
    const x = counters.length === 1 ? handX + handWidth / 2 : startX + index * step;
    return slideCounterToPosition(counter, x, handCenterY);
  });

  house.content = 0;
  const targetHand = hands.find((h) => h.name === handId);
  if (targetHand) {
    targetHand.content += counters.length;
  }
  await Promise.all(movements);
}

async function sowCounters() {
  // Sows all counters on the current player's hand.
  // Only the AI player uses this.
  if (state.screen != "sow") {
    return
  }
  showStatus("AI move", "KI-Zug", "KI-trekk", playerColour(), 2500)
  // Move one counter at a time so currentHouse is updated before the next move.
  // Re-checking the hand also continues sowing after a relay pickup.
  while (state.screen === "sow") {
    const counter = [...els.svgHost.querySelectorAll(".counter")]
      .find((candidate) => isCounterOnHand(candidate));
    if (!counter) {
      return;
    }
    await moveCounterToHouse(counter);
  }
}

async function moveCounterToHouse(counter) {
  // Moves a counter to the current house and drops it.
  // This is only for the AI player. The human player must sow the counters manually.
  const house = houses.find((h) => h.name === state.currentHouse);
  if (!counter || !house) {
    return;
  }
  const houseNode = els.svgHost.querySelector(`#${house.name}`);
  if (!houseNode) {
    return;
  }
  const houseCenterX = Number(houseNode.getAttribute("cx"));
  const houseCenterY = Number(houseNode.getAttribute("cy"));
  const offsetX = pos.x[house.content % pos.x.length] || 0;
  const offsetY = pos.y[house.content % pos.y.length] || 0;
  await slideCounterToPosition(counter, houseCenterX + offsetX, houseCenterY + offsetY);
  await updateGameStateAfterDrop(houseNode);
}

function slideCounterToPosition(counter, x, y) {
  // Animate the counter moving from its current position to the specified position,
  // updating its position and transform attributes accordingly.
  // Re-append it to the parent so it renders above the hand and other SVG shapes.
  counter.parentNode?.appendChild(counter);

  const counterCx = Number(counter.getAttribute("cx"));
  const counterCy = Number(counter.getAttribute("cy"));
  const start = parseTranslate(counter.dataset.GebetaTranslate || "0,0");
  const targetX = x - counterCx;
  const targetY = y - counterCy;
  const steps = 20;
  const dx = (targetX - start.x) / steps;
  const dy = (targetY - start.y) / steps;

  return new Promise((resolve) => {
    let step = 0;

    const animate = () => {
      step += 1;
      setTranslate(counter, start.x + dx * step, start.y + dy * step);

      if (step < steps) {
        window.requestAnimationFrame(animate);
      } else {
        resolve();
      }
    };

    window.requestAnimationFrame(animate);
  });
}

function dropCounter(source, target) {
  // Drops the source node to a position near the center of the target node by calculating the necessary translation 
  // based on their bounding boxes and any previous translation applied to the source
  const sourceBox = source.getBoundingClientRect();
  const targetBox = target.getBoundingClientRect();
  const previous = parseTranslate(source.dataset.GebetaTranslate || "0,0");
  const sourceCenter = {
    x: sourceBox.left + sourceBox.width / 2,
    y: sourceBox.top + sourceBox.height / 2,
  };
  const targetCenter = {
    x: targetBox.left + targetBox.width / 2,
    y: targetBox.top + targetBox.height / 2,
  };
  const sourcePoint = clientPointInParent(source, sourceCenter.x, sourceCenter.y);
  const targetPoint = clientPointInParent(source, targetCenter.x, targetCenter.y);
  const dx = targetPoint.x - sourcePoint.x;
  const dy = targetPoint.y - sourcePoint.y;
  // Position correction to avoid overlapping the target center, offsetting the dropped counter slightly
  const house = houses.find((h) => h.name === target.id);
  const offsetX = pos.x[house.content % pos.x.length] || 0;
  const offsetY = pos.y[house.content % pos.y.length] || 0;
  setTranslate(source, previous.x + dx + offsetX, previous.y + dy + offsetY);
  updateGameStateAfterDrop(target);
}

async function updateGameStateAfterDrop(target) {
  // Update the game state after a counter has been dropped on a target, including updating the house content
  // This works for both the human and the AI player

  // Reduce the content of the hand that the counter was dropped from
  const handId = state.currentPlayer === 0 ? "hand_a" : "hand_b";
  const hand = hands.find((h) => h.name === handId);
  const house = houses.find((h) => h.name === target.id);
  if (hand && house) {
    hand.content -= 1;
    house.content += 1;
    if (house.content === 4) {
      // Handle the case when a home is filled with 4 counters, which involves capturing the family and updating the game state accordingly
      const last = Boolean(hand.content <= 0);
      catchFamily(house, last);
    } 
    if (hand.content <= 0) {
      if (house.content > 1) {
        // If the hand is empty but the home still has counters, move them back to the hand for the next turn
        await moveCountersToHand(house);
      } else {
        // If the hand is empty and the home has 1 or fewer counters, switch to the next player or end the game
        hidePlayer(state.currentPlayer);
        state.currentPlayer = (state.currentPlayer + 1) % 2;
        if (state.currentPlayer === 0) {
          state.turn += 1;
        }
        // Does the current player have remaining counters?
        const allHousesEmpty = houses
          .filter((h) => h.owner === state.currentPlayer)
          .every((h) => h.content === 0);
        if (allHousesEmpty) {
          // The game ends
          let remainingCounters = 0;
          const otherPlayer = (state.currentPlayer + 1) % 2;
          const ownedHouses = houses.filter((h) => h.owner === otherPlayer);
          ownedHouses.forEach(h => {remainingCounters += h.content;})
          capturedFamilies[otherPlayer].content += (remainingCounters / 4) | 0;
          showEndScreen();
        } else {
          // The game continues with the next player
          state.screen = "choose";
          showPlayer(state.currentPlayer);
          if (!state.AI || state.currentPlayer === 0) {
            showStatus(`Turn ${state.turn}: Player ${state.currentPlayer + 1}'s turn.`, 
              `Runde ${state.turn}: Spieler ${state.currentPlayer + 1} ist am Zug.`, 
              `Trekk ${state.turn}: Spiller ${state.currentPlayer + 1} sin tur.`, 
              playerColour(), 
              2500);
            state.currentSound = "chooseHome";
            playCurrentSound();
          } else {
            state.currentSound = "";
            game.updateState(houses, capturedFamilies, state.currentPlayer, state.turn);

            showStatus("AI is thinking...", "KI denkt nach...", "KI tenker...", playerColour(), 2500);

            const aiMove = AI.selectMove();
            const selectedHouse = houses[aiMove];

            if (!selectedHouse || selectedHouse.owner !== state.currentPlayer) {
              // This will never happen
              showStatus(`The AI selected an invalid move: ${aiMove}.`,
                `Die KI hat einen ungültigen Zug gewählt: ${aiMove}.`,
                `KI'en valgte et ugyldig trekk: ${aiMove}.`, "bad", 5000);
              console.error("AI selected an invalid move:", aiMove);
              return;
            }

            await moveCountersToHand(selectedHouse);

            state.screen = "sow";
            state.currentHouse = selectedHouse.next;

            await delay(500);
            await sowCounters();
          }
        }
      }
    }
  }

  if (state.screen === "sow") {
    // Update the current house for sowing
    state.currentHouse = house ? house.next : "";
  }
}

function catchFamily(house, last) {
  // Handle the case when a house is filled with 4 counters, which may involve capturing the family and updating the game state accordingly.
  // This works for both the human and the AI player
  if (!house) {
    return;
  }

  // Capture the family by resetting the house content and updating the hand content
  house.content = 0;
  if (last) {
    collectFamilyFromHouse(house,state.currentPlayer);
  } else {
    collectFamilyFromHouse(house,house.owner);
  }

}

function collectFamilyFromHouse(house, player) {
  // Move all counters from the selected house to the player's store of captured families, updating the game state accordingly.
  // This works for both the human and the AI player
  const houseNode = els.svgHost.querySelector(`#${house.name}`);
  if (!houseNode) {
    return;
  }

  const storeX = 50;
  const storeY = player === 0 ? 950 : 50;
  const offsetX = [0, 60, 0, 60];
  const offsetY = [0, 0, 60, 60];

  const counters = [...els.svgHost.querySelectorAll(".counter")]
    .filter((counter) => findHouse(counter) === houseNode);

  const step = 140
  const startX = storeX + (capturedFamilies[player].content * step);

  counters.forEach((counter, index) => {
    const x = startX + offsetX[index % offsetX.length];
    const y = storeY + offsetY[index % offsetY.length];
    slideCounterToPosition(counter, x, y);
  });

  capturedFamilies[player].content += 1;
}


// Handle events
function handleActivation(event) {
  // Handle click or key activation events on the SVG, determining if the user clicked
  // a selectable choice, and respond accordingly

  const choice = selectableFromTarget(event.target);
  
  if (state.screen === "language") {
    if (choice) {
      selectLanguage(choice);
    }
    return;
  }
  
  if (state.screen === "rules") {
    loadGame();
    return;
  }

  if (!choice) {
    return
  } else {
    if (choice.id === "sound") {
        toggleSound();
        return;
    }
    
    if (state.screen === "opponent") {
      if (choice.id === "robot") {
        state.AI = true;
        explainGame();
      } else if (choice.id === "human") {
        state.AI = false;
        explainGame();
      }
      return;
    }

    if (state.screen === "endscreen") {
      if (choice.id === "Gebeta") {
        window.location.reload();
      } 
      return;
    }

    if ((state.screen === "choose" || state.screen === "sow") && choice.id === "Gebeta") {
      showRules();
      return;
    }

    if (state.screen === "choose") {
      if (choice.id === "help-button") {
        showStatus("Click on a home to take the counters on your hand.",
          "Klick auf ein Haus, um die Spielsteine auf die Hand zu nehmen.",
          "Klikk på et hus for å ta brikkene på hånda.",
          playerColour(), 4000);
      } else {
        selectHouse(choice);
      }
      return;
    }

    if (state.screen === "sow" && choice.id === "help-button") {
      highlightTarget(state.currentHouse, 4000);
      showStatus(`Drag a counter from your hand to the highlighted home ${state.currentHouse}.`,
        `Zieh einen Spielstein aus deiner Hand in das hervorgehobene Haus ${state.currentHouse}.`,
        `Dra en brikke fra hånden din til det fremhevede hus ${state.currentHouse}.`,
        playerColour(), 4000);
    }
  }
}

function playerColour() {
  // Return the color associated with the current player
  return state.currentPlayer === 0 ? "" : "good";
}

function highlightTarget(targetID, duration) {
  // Highlight the specified house to indicate where the user should drag a counter
  const target = els.svgHost.querySelector(`#${targetID}`);
  if (target) {
    target.classList.add("gebeta-target-help");
    setTimeout(() => {
      target.classList.remove("gebeta-target-help");
    }, duration);
  }
}

function selectableFromTarget(target) {
  // Determine if the clicked target is a selectable choice element, and return it if so.
  const choice = closestMatch(target, ".target, .counter, .rules, .help-btn");
  if (!choice) {
    return null;
  }
  return choice;
}

function handlePointerDown(event) {
  // Start a drag operation if the user presses down on a draggable source element within a task screen that supports drag-and-drop
  if (state.screen !== "sow" || state.drag) {
    return;
  }
  const source = draggableSourceFromTarget(event.currentTarget || event.target, event);
  if (!source || !isCounterOnHand(source)) {
    return;
  }
  const sourceName = source.id || source.getAttribute("id") || "unknown";
  event.preventDefault();
  if (source.setPointerCapture) {
    try {
      source.setPointerCapture(event.pointerId);
    } catch (error) {
      // Some browsers expose setPointerCapture on SVG elements but reject it.
    }
  }

  source.parentNode?.appendChild(source);

  ensureDragTransformState(source);
  const previous = parseTranslate(source.dataset.GebetaTranslate || "0,0");
  state.drag = {
    source,
    pointerId: normalizePointerId(event.pointerId),
    startPoint: clientPointInParent(source, event.clientX, event.clientY),
    baseX: previous.x,
    baseY: previous.y,
    moved: false,
    hoverTarget: null,
  };
  source.classList.add("gebeta-dragging");
}

function handlePointerMove(event) {
  // Update the position of the dragged element as the user moves the pointer, 
  // and determine if it is hovering over a valid drop target
  const target = targetAtPoint(event.clientX, event.clientY);
  const drag = state.drag;
  if (!drag || drag.pointerId !== normalizePointerId(event.pointerId)) {
    if (target) {
      if (target.id === "help-button" || target.id === "gebeta" || target.id === "sound") {
        highlightTarget(target.id, 500);
        return;
      }
      if (state.screen === "language" || state.screen === "opponent") {
        highlightTarget(target.id, 500);
        return;
      }
      if (state.screen === "choose") {
        const house = houses.find((h) => h.name === target.id);
        if (house) {
          if (house.owner === state.currentPlayer && house.content > 0) {
          highlightTarget(target.id, 500);
          }
        } 
        return;
      }
    }
    return;
  }

  const point = clientPointInParent(drag.source, event.clientX, event.clientY);
  const dx = point.x - drag.startPoint.x;
  const dy = point.y - drag.startPoint.y;
  if (Math.abs(dx) + Math.abs(dy) > 3) {
    drag.moved = true;
  }

  setTranslate(drag.source, drag.baseX + dx, drag.baseY + dy);
  setHoverTarget(target);
}

function handlePointerUp(event) {
  // End the drag operation, snap the dragged element back to its original position if not dropped on a valid target, 
  // or snap it to the target and record the drop if valid
  const drag = state.drag;
  if (!drag || drag.pointerId !== normalizePointerId(event.pointerId)) {
    return;
  }

  const source = drag.source;
  const target = targetAtPoint(event.clientX, event.clientY);
  const previousDropTarget = droppedTargetForSource(source);
  source.classList.remove("gebeta-dragging");
  setHoverTarget(null);
  state.drag = null;

  if (!target || target.id !== state.currentHouse) {
    showStatus(`You must drop the counter in home ${state.currentHouse}.`,
      `Du musst den Spielstein in das Haus ${state.currentHouse} ziehen.`,
      `Du må slippe brikken på hus ${state.currentHouse}.`, "bad", 2500);
    snapBack(source, drag.baseX, drag.baseY);
    return;
  }

  dropCounter(source, target);
}

function pointerLikeMouse(event) {
  // Convert a mouse event to a pointer-like object for unified handling with touch events
  return {
    clientX: event.clientX,
    clientY: event.clientY,
    pointerId: "mouse",
    target: event.target,
    preventDefault: () => event.preventDefault(),
  };
}

function normalizePointerId(pointerId) {
  return `${pointerId ?? "mouse"}`;
}

function pointerLikeTouch(event) {
  // Convert a touch event to a pointer-like object using the first changed touch point, 
  // for unified handling with mouse events
  const touch = event.changedTouches[0];
  if (!touch) {
    return null;
  }

  return {
    clientX: touch.clientX,
    clientY: touch.clientY,
    pointerId: touch.identifier,
    target: event.target,
    preventDefault: () => event.preventDefault(),
  };
}

function isCounterOnHand(counter) {
  if (!counter || !els.svgHost) {
    return false;
  }

  const handId = state.currentPlayer === 0 ? "hand_a" : "hand_b";
  const hand = els.svgHost.querySelector(`#${handId}`);
  if (!hand) {
    return false;
  }

  const handBox = hand.getBoundingClientRect();
  const counterBox = counter.getBoundingClientRect();
  if (!handBox.width || !handBox.height || !counterBox.width || !counterBox.height) {
    return false;
  }

  const counterCenterX = counterBox.left + counterBox.width / 2;
  const counterCenterY = counterBox.top + counterBox.height / 2;

  return counterCenterX >= handBox.left && counterCenterX <= handBox.right &&
    counterCenterY >= handBox.top && counterCenterY <= handBox.bottom;
}

function draggableSourceFromTarget(target, event) {
  // Determine if the clicked target is a draggable counter element, and return it if so.
  const svg = els.svgHost.querySelector("svg");
  if (!svg) {
    return null;
  }

  const source = sourceFromCounterTarget(target, svg);
  if (!source || !els.svgHost.contains(source)) {
    return null;
  }

  return draggableCounters(svg).includes(source) ? source : null;
}

function sourceFromCounterTarget(target, svg = els.svgHost.querySelector("svg")) {
  // Resolve the actual counter element from the event target, using the current SVG as the boundary.
  if (!svg) {
    return null;
  }

  const matched = closestMatch(target, ".counter");
  if (!matched || !matched.classList?.contains("counter")) {
    return null;
  }

  return matched;
}

function draggableCounters(svg = els.svgHost.querySelector("svg")) {
  // Get the counters that are currently draggable in the current SVG.
  if (!svg) {
    return [];
  }

  return [...svg.querySelectorAll(".counter")].filter((counter) => isCounterOnHand(counter));
}

function closestMatch(node, selector) {
  // Traverse up the DOM tree from the given node to find the closest ancestor that matches the selector,
  // stopping if we reach the svgHost element without finding a match
  for (let current = node; current && current !== els.svgHost; current = current.parentElement || current.parentNode) {
    if (current.matches && current.matches(selector)) {
      return current;
    }
  }
  // No closes match is found
  return null;
}

function targetAtPoint(clientX, clientY) {
  // Find the topmost target element at the given client coordinates, if any
  const targets = [...els.svgHost.querySelectorAll(".target, .rules, .help-btn")];
  return targets.find((target) => {
    const box = targetHitBox(target);
    return clientX >= box.left && clientX <= box.right && clientY >= box.top && clientY <= box.bottom;
  }) || null;
}

function targetHitBox(target) {
  // For grouped targets, ignore draggable children so moved sources do not expand the target hit area
  const children = [...(target.children || [])].filter((node) => !node.classList?.contains("counter"));
  const boxes = children.map((node) => node.getBoundingClientRect()).filter((box) => box.width && box.height);
  if (!boxes.length) {
    return target.getBoundingClientRect();
  }

  const left = Math.min(...boxes.map((box) => box.left));
  const top = Math.min(...boxes.map((box) => box.top));
  const right = Math.max(...boxes.map((box) => box.right));
  const bottom = Math.max(...boxes.map((box) => box.bottom));
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

function setHoverTarget(target) {
  // Update the visual hover state of the current drag operation to indicate which target, if any, is currently being hovered over
  if (state.drag?.hoverTarget === target) {
    return;
  }

  if (state.drag?.hoverTarget) {
    state.drag.hoverTarget.classList.remove("gebeta-target-hover");
  }

  if (target) {
    target.classList.add("gebeta-target-hover");
  }

  if (state.drag) {
    state.drag.hoverTarget = target;
  }
}

function parseTranslate(value) {
  // Parse a translate string in the format "x,y" and return an object with numeric x and y properties
  const [x, y] = value.split(",").map((part) => Number(part) || 0);
  return { x, y };
}

function setTranslate(node, x, y) {
  // Set the translate transform of a single node, ensuring that its original transform state is preserved for later restoration
  ensureDragTransformState(node);
  node.dataset.GebetaTranslate = `${x},${y}`;
  const original = node.dataset.GebetaOriginalTransform || "";
  const move = `translate(${x} ${y})`;
  node.setAttribute("transform", original ? `${move} ${original}` : move);
}

function ensureDragTransformState(node) {
  // Ensure that the node has a data attribute to track its original transform state before any dragging occurs, 
  // so that it can be restored later
  if (node.dataset.GebetaOriginalTransform !== undefined) {
    return;
  }

  node.dataset.GebetaOriginalTransform = node.getAttribute("transform") || "";
}

function clientPointInParent(node, clientX, clientY) {
  // Convert client coordinates to the coordinate system of the node's parent element, 
  // accounting for any transforms applied to the parent
  const parent = node.parentElement;
  const matrix = parent && parent.getScreenCTM ? parent.getScreenCTM() : null;
  if (!matrix) {
    return { x: clientX, y: clientY };
  }

  const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
  return { x: point.x, y: point.y };
}

function snapBack(node, x, y) {
  // Snap the node back to the position it had when the current drag started.
  setTranslate(node, x, y);
}

function targetKey(target) {
  // Get a unique key for the target element, using a data attribute to store it if not already set.
  if (!target.dataset.GebetaTargetKey) {
    target.dataset.GebetaTargetKey = target.id || `target-${[...els.svgHost.querySelectorAll(".target")].indexOf(target)}`;
  }

  return target.dataset.GebetaTargetKey;
}

function clearSourceDrop(source) {
  // Clear the data attribute on the source element that indicates it has been dropped on a target, 
  // allowing it to be dropped again
  delete source.dataset.GebetaDroppedTarget;
}

function droppedTargetForSource(source) {
  // Resolve the target currently associated with a dropped source, if any
  const key = source.dataset.GebetaDroppedTarget;
  if (key) {
    return targetForKey(key);
  }

  return null;
}

function targetForKey(key) {
  // Resolve a target element from its cached key
  return [...els.svgHost.querySelectorAll(".target")]
    .find((target) => targetKey(target) === key) || null;
}

function choiceValue(choice) {
  // Determine the value of a choice element
  if (!choice) {
    return "";
  }
  if (choice.classList && choice.classList.contains("counter")) {
    // For counters, use the ID of the house that contains the counter as the value
    const house = findHouse(choice);
    return house ? house.id : choice.id;
  } else {
    return choice.id;
  }
}

function findHouse(counter) {
  // Find the house that contains the given counter by comparing the counter's
  // current position to each house circle's center and radius.
  if (!counter || !els.svgHost) {
    return null;
  }

  const counterBox = counter.getBoundingClientRect();
  const counterCenter = {
    x: counterBox.left + counterBox.width / 2,
    y: counterBox.top + counterBox.height / 2,
  };
  const counterPoint = clientPointInParent(counter, counterCenter.x, counterCenter.y);

  const houses = [...els.svgHost.querySelectorAll(".target")];
  for (const house of houses) {
    const houseCx = Number(house.getAttribute("cx"));
    const houseCy = Number(house.getAttribute("cy"));
    const houseRadius = Number(house.getAttribute("r"));

    if (!Number.isFinite(houseCx) || !Number.isFinite(houseCy) || !Number.isFinite(houseRadius)) {
      continue;
    }

    const dx = counterPoint.x - houseCx;
    const dy = counterPoint.y - houseCy;
    if (dx * dx + dy * dy <= houseRadius * houseRadius) {
      return house;
    }
  }

  return null;
}

function sourceValue(source) {
  // Get the value of a source element for recording purposes 
  // by first checking for an explicit "id" attribute on the source itself,
  // then checking for a descendant element with a "id" attribute, 
  // and finally falling back to the visible text content or the source's ID if no explicit value is found, 
  // returning an empty string if none of these are available
  const valueNode = source.querySelector("[id]");
  return source.getAttribute("id") ||
    (valueNode ? valueNode.getAttribute("id") : "") ||
    source.id ||
    "";
}

function showStatus(messageEN, messageDE, messageNO, type = "", duration = 1600) {
  // Display a status message to the user with an optional type for styling and a duration for how long it should be visible,
  // and ensure that any previous status message is cleared before showing the new one
  window.clearTimeout(state.statusTimer);
  if (state.language === "DE") {
    message = messageDE;
  } else if (state.language === "NO") {
    message = messageNO;
  } else {
    message = messageEN;
  }
  els.status.textContent = message;
  els.status.className = `status visible${type ? ` ${type}` : ""}`;
  state.statusTimer = window.setTimeout(() => {
    els.status.className = "status";
  }, duration);
}

function showEndScreen() {
  // Display the end screen with the final scores and a message indicating the winner or if it's a tie
  const playerAScore = capturedFamilies[0].content;
  const playerBScore = capturedFamilies[1].content;
  let messageDE = "";
  let messageNO = "";
  let messageEN = "";
  let type = "";
  let scoreMessage = ` ${playerAScore} : ${playerBScore}!`;

  if (state.AI) {
    if (playerAScore > playerBScore) {
      type = "";
      messageEN = "You won" + scoreMessage;
      messageDE = "Du hast gewonnen" + scoreMessage;
      messageNO = "Du vant" + scoreMessage;
    } else if (playerBScore > playerAScore) {
      type = "good";
      scoreMessage = ` ${playerBScore} : ${playerAScore}!`;
      messageEN = "The AI won" + scoreMessage;
      messageDE = "Die KI hat gewonnen" + scoreMessage;
      messageNO = "KI'en vant" + scoreMessage;
    } else {
      type = "bad";
      messageEN = "It's a tie" + scoreMessage;
      messageDE = "Es ist ein Unentschieden" + scoreMessage;
      messageNO = "Det er uavgjort" + scoreMessage;
    }
  } else {
    if (playerAScore > playerBScore) {
      type = "";
      messageEN = "Player Blue won" + scoreMessage;
      messageDE = "Spieler Blau hat gewonnen" + scoreMessage;
      messageNO = "Spiller blå vant" + scoreMessage;
    } else if (playerBScore > playerAScore) {
      type = "good";
      scoreMessage = ` ${playerBScore} : ${playerAScore}!`;
      messageEN = "Player Green won" + scoreMessage;
      messageDE = "Spieler Grün hat gewonnen" + scoreMessage;
      messageNO = "Spiller grønn vant" + scoreMessage;
    } else {
      type = "bad";
      messageEN = "It's a tie" + scoreMessage;
      messageDE = "Es ist ein Unentschieden" + scoreMessage;
      messageNO = "Det er uavgjort" + scoreMessage;
    }
  }

  state.screen = "endscreen";
  state.currentSound = "restart"
  showStatus(messageEN, messageDE, messageNO, type, 10000);
  playCurrentSound();
}


// MCTS for AI player
class MCTSNode {
    constructor(moves, parent){
        this.parent = parent;
        this.visits = 0;
        this.wins = 0;
        this.numUnexpandedMoves = moves.length;
        this.children = new Array(this.numUnexpandedMoves).fill(null);
    }   
}


class MCTS {
    constructor(game, player){
        this.game = game;
        this.player = player;
        this.iterations = 500;
        this.exploration = 1.41;
    }

    selectMove(){
        const originalState = this.game.getState();
        const possibleMoves = this.game.moves();
        const root = new MCTSNode(possibleMoves, null);

        for (let i = 0; i < this.iterations; i++){
            this.game.setState(originalState);
            const clonedState = this.game.cloneState();
            this.game.setState(clonedState);
            
            let selectedNode = this.selectNode(root);
            //if selected node is terminal and we lost, make sure we never choose that move
            if (this.game.gameOver()){
                if (this.game.winner() != this.player && this.game.winner() != -1){
                    selectedNode.parent.wins = Number.MIN_SAFE_INTEGER
                }
            }
            let expandedNode = this.expandNode(selectedNode);
            this.playout(expandedNode);
            
            let reward;
            const winner = this.game.winner();
            const scoreDiff = this.game.scoreDiff(winner);
            if (winner === -1) {
              if (scoreDiff > 0) {
                reward = 0.5
              } else if (scoreDiff < 0) {
                reward = -0.5
              } else {
                reward = 0
              }
            } else if (winner === this.player) {
              reward = 1
            } else {
              reward = -1
            }
            this.backprop(expandedNode, reward)
        }

        //choose move with most wins
        let maxWins = -Infinity;
        let maxIndex = -1;
        for (let i in root.children){
            const child = root.children[i];
            if (child === null) {
              continue
            }
            if (child.wins > maxWins){
                maxWins = child.wins
                maxIndex = i
            }
        }

        this.game.setState(originalState);
        return possibleMoves[maxIndex];
    }

    selectNode(root){
        const c = this.exploration;

        while (root.numUnexpandedMoves === 0){
            let maxUBC = -Infinity;
            let maxIndex = -1;
            let Ni = root.visits;
            for (let i in root.children){
                const child = root.children[i];
                const ni = child.visits;
                const wi = child.wins;
                const ubc = this.computeUCB(wi,ni,c,Ni);
                if (ubc > maxUBC){
                    maxUBC = ubc;
                    maxIndex = i;
                }
            }
            const moves = this.game.moves();
            this.game.playMove(moves[maxIndex]);
           
            root = root.children[maxIndex];
            if (this.game.gameOver()){
                return root
            }
        }
        return root;
    }

    expandNode(node){
        if (this.game.gameOver()){
            return node
        }
        let moves = this.game.moves();
        const childIndex = this.selectRandomUnexpandedChild(node);
        this.game.playMove(moves[childIndex]);

        moves = this.game.moves();
        const newNode = new MCTSNode(moves, node);
        node.children[childIndex] = newNode;
        node.numUnexpandedMoves -= 1;
       
        return newNode;
    }

    playout(node){
        while (!this.game.gameOver()){
            const moves = this.game.moves();
            const randomChoice = Math.floor(Math.random() * moves.length);
            this.game.playMove(moves[randomChoice]);
        }
        return this.game.winner();
    }

    backprop(node, reward){  
        while (node != null){
            node.visits += 1;
            node.wins += reward;
            node = node.parent;
        }
    }

    // returns index of a random unexpanded child of node
    selectRandomUnexpandedChild(node){
        const choice = Math.floor(Math.random() * node.numUnexpandedMoves); //expand random nth unexpanded node
        let count = -1;
        for (let i in node.children){
            const child = node.children[i];
            if (child === null){
                count += 1
            }
            if (count === choice){
                return i
            }
        }
    }

    computeUCB(wi, ni, c, Ni){
        return (wi/ni) + c * Math.sqrt(Math.log(Ni)/ni)
    }
}

class Gebeta {
  constructor(){
    this.state = new Uint8Array(16);
    // Index 0...11: The 12 homes (0...5 belong to Player 0; 6...11 belong to Player 1)
    // Index 12: Player 0's store of captured families
    // Index 13: Player 1's store of captured families
    // Index 14, bit 1: currentPlayer
    // Index 14, bit 2: gameOver
    // Index 14, bit 3: draw 
    // Index 14, bit 4: winner
    // Index 15: moves

    this.state.fill(4, 0, 12); // Fill the board with 4 counters in each home
    this.state[14] |= (1 << 3); // Index 14, bit 3 is 1 until there is a winner
  }

  getState(){
    return this.state
  }

  setState(state){
    this.state = state
  }

  cloneState(){
    return new Uint8Array(this.state)
  }

  updateState(houses, families, currentPlayer, turn){
    // Updates the state after the human player's move
    for (let i = 0; i < 12; i++) {
      this.state[i] = houses[i].content; // The board
    }
    this.state[12] = families[0].content; // Player 0's captured families
    this.state[13] = families[1].content; // Player 1's captured families
    if (currentPlayer === 1) {
      this.state[14] |= (1 << 1); // Bit 1: currentPlayer = 1
      this.state[15] = turn * 2; // The number of moves is twice the number of turns
    } else {
      this.state[14] &= ~(1 << 1); // Bit 1: currentPlayer = 0
      this.state[15] = (turn * 2) - 1; // The number of moves is twice the number of turns minus 1
    }
    this.state[14] &= ~(1 << 2); // Bit 2: game over set to 0 (false)
    this.state[14] |= (1 << 3);  // Bit 3: draw (is 1 until there is a winner)
    // Bit 4: winner does not need to be changed
  }

  currentPlayer(){
    if ((this.state[14] & (1 << 1)) !== 0) { 
      return 1 // Bit 1 is set: current player is 1
    }
    return 0
  }

  moves(){
    let moves = [];
    const start = (this.state[14] & (1 << 1)) !== 0 ? 6 : 0;
    const end = start + 6;
    for (let i = start; i < end; i++){
      if (this.state[i] > 0){
        moves.push(i)
      }
    }
    if (moves.length === 0) {
      this.state[14] |= (1 << 2); // Set bit 2: Game over
    }
    return moves
  }

  playMove(move){
    let hand = this.state[move];
    this.state[move] = 0;
    let position = move;

    for (let n = 0; n < 50; n++) { // Avoid an infinit loop
      while (hand > 0) {
        // Sow a counter into the next home
        position = (position + 1) % 12;
        this.state[position] += 1;
        hand -= 1;

        // Check if a family is created
        if (this.state[position] === 4) {
          this.state[position] = 0;

          const owner = position < 6 ? 0 : 1;
          this.state[12 + owner] += 1;
        }
      }

      // Continue from the actual last house.
      if (this.state[position] > 1) {
        hand = this.state[position];
        this.state[position] = 0;
      } else {
        break; // The player's move is finished
      }
    }

    // Switch to the other player
    const recentPlayer = (this.state[14] & (1 << 1)) !== 0 ? 0 : 1;
    this.state[14] ^= (1 << 1); // Toggle bit 1

    // Check if the player can move
    const moves = this.moves();
    if (moves.length === 0) {
      this.state[14] |= (1 << 2); // Set bit 2: Game over

      // The recent player catches the remaining counters
      let remainingCounters = 0;
      for (let i = 0; i < 12; i++) {
        remainingCounters += this.state[i];
        this.state[i] = 0;
      }

      this.state[12 + recentPlayer] += Math.floor(remainingCounters / 4);

      // Determine the winner
      if (this.state[12] > this.state[13]) {
        this.state[14] &= ~(1 << 4); // Clear bit 4: Winner is Player 0
        this.state[14] &= ~(1 << 3); // Clear bit 3: Match is not a draw
      } else if (this.state[13] > this.state[12]) {
        this.state[14] |= (1 << 4); // Set bit 4: Winner is Player 1
        this.state[14] &= ~(1 << 3); // Clear bit 3: Match is not a draw
      } else {
        this.state[14] |= (1 << 3); // Set bit 3: Match is a draw
      }
    }

    this.state[15] += 1;
  }

  gameOver(){
    if ((this.state[14] & (1 << 2)) !== 0) {
      return true // Bit 2 is set -> Game over
    }
    const moves = this.moves();
    if (moves.length === 0){
      this.state[14] |= (1 << 2); // Set bit 2: Game over
      return true
    }
    return false
  }

  winner(){
    if ((this.state[14] & (1 << 3)) !== 0) {
      return -1 // Bit 3 is set -> Match is a draw (or not over)
    } else if ((this.state[14] & (1 << 4)) !== 0) {
      return 1 // Bit 4 is set -> Player 1 is winner
    }
    return 0 // Bit 4 is not set -> Player 0 is winner
  }

  scoreDiff(winner){
    if (winner === 1) {
      return this.state[13] - this.state[12]
    }
    return this.state[12] - this.state[13]
  }
}

// Initialise the event handlers
[
  "click",
  "keydown",
  "pointerdown",
  "pointermove",
  "pointerup",
  "mousedown",
  "mousemove",
  "mouseup",
  "touchstart",
  "touchmove",
  "touchend",
].forEach((eventName) => {
  document.addEventListener(eventName, scheduleInactivityPrompt, { capture: true, passive: true });
});
els.svgHost.addEventListener("click", handleActivation);
els.svgHost.addEventListener("pointerdown", handlePointerDown);
els.svgHost.addEventListener("mousedown", (event) => handlePointerDown(pointerLikeMouse(event)));
document.addEventListener("pointermove", handlePointerMove);
document.addEventListener("pointerup", handlePointerUp);
document.addEventListener("pointercancel", handlePointerUp);
document.addEventListener("mousemove", (event) => handlePointerMove(pointerLikeMouse(event)));
document.addEventListener("mouseup", (event) => handlePointerUp(pointerLikeMouse(event)));
els.svgHost.addEventListener("touchstart", (event) => {
  const pointer = pointerLikeTouch(event);
  if (pointer) {
    handlePointerDown(pointer);
  }
}, { passive: false });
document.addEventListener("touchmove", (event) => {
  const pointer = pointerLikeTouch(event);
  if (pointer) {
    handlePointerMove(pointer);
  }
}, { passive: false });
document.addEventListener("touchend", (event) => {
  const pointer = pointerLikeTouch(event);
  if (pointer) {
    handlePointerUp(pointer);
  }
});
document.addEventListener("touchcancel", (event) => {
  const pointer = pointerLikeTouch(event);
  if (pointer) {
    handlePointerUp(pointer);
  }
});
els.svgHost.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }
  event.preventDefault();
  handleActivation(event);
});

// After everything is defined, let's start
startSession();
