const rows = 40;
const cols = 40;
const tileSize = 60;
const tileGap = 4;
const container = document.getElementById('gameContainer');
const player = document.getElementById('player');
let maxHP = 100;
let playerHP = 100;
let maxHunger = 100;
let playerHunger = 100;
let turnCount = 0;
let depth = 1;
let difficulty = 1;
let playerRow = 0;
let playerCol = 0;
let activeDebuffs = {
  poison: 0,
  bleeding: 0,
  bleedingLock: 0
};
let grid = [];
let rooms = [];
let rawInventory = [{
  name: "Hearty Ration",
  type: "food",
  description: "A filling meal that restores 30 hunger and 5 HP.",
  quantity: 3
}, {
  name: "Magic Berry",
  type: "food",
  description: "A glowing berry that restores 15 hunger and removes poison.",
  quantity: 2
}, {
  name: "Dragon Fruit",
  type: "food",
  description: "An exotic fruit that restores 20 hunger and grants temporary fire resistance.",
  quantity: 1
}, {
  name: "Health Potion",
  type: "potion",
  description: "Restores 25 HP instantly.",
  quantity: 2
}, {
  name: "Antidote",
  type: "potion",
  description: "Removes all poison effects.",
  quantity: 1
}, {
  name: "Scroll of Teleport",
  type: "scroll",
  description: "Teleports you to a random room in the current level.",
  quantity: 1
}, {
  name: "Scroll of Mapping",
  type: "scroll",
  description: "Reveals the entire layout of the current level.",
  quantity: 1
}];
function compressInventory(base) {
  const map = {};
  base.forEach(item => {
    const key = item.name + '|' + item.type + '|' + item.description;
    if (!map[key]) {
      map[key] = {
        ...item,
        quantity: 0
      };
    }
    map[key].quantity += item.quantity;
  });
  return Object.values(map);
}
let inventory = compressInventory(rawInventory);
let filteredInventory = [...inventory];
let currentInventoryPage = 0;
let selectedItemIndex = null;
let gear = {
  weapon: {
    name: "Wooden Sword",
    type: "weapon",
    description: "A simple wooden sword with minimal damage."
  },
  armor: {
    name: "Wooden Chestplate",
    type: "armor",
    description: "Basic wooden chestplate for minimal protection."
  },
  amulet: {
    name: "Iron Amulet",
    type: "amulet",
    description: "A basic iron amulet that provides minor magical protection."
  },
  ring: {
    name: "Ring of Health",
    type: "ring",
    description: "A simple ring that slowly regenerates health over time."
  }
};
function incrementTurnCount() {
  turnCount++;
  document.getElementById('turnCounter').innerText = "Turn: " + turnCount;
}
function updateDepthCounter() {
  document.getElementById('depthCounter').innerText = "Depth: " + depth;
}
function updateDebuffEffects() {
  if (activeDebuffs.poison > 0) {
    document.getElementById('poisonEffect').style.display = 'block';
  } else {
    document.getElementById('poisonEffect').style.display = 'none';
  }
  if (activeDebuffs.bleeding > 0 || activeDebuffs.bleedingLock > 0) {
    document.getElementById('bleedingEffect').style.display = 'block';
  } else {
    document.getElementById('bleedingEffect').style.display = 'none';
  }
}
function applyDotEffects() {
  if (activeDebuffs.poison > 0) {
    playerHP = Math.max(0, playerHP - 1);
    updateHPBar();
    activeDebuffs.poison--;
    if (activeDebuffs.poison <= 0) {
      document.getElementById('poisonDebuffIcon').style.display = 'none';
    }
  }
  if (activeDebuffs.bleeding > 0) {
    playerHP = Math.max(0, playerHP - 5);
    updateHPBar();
    activeDebuffs.bleeding--;
    if (activeDebuffs.bleeding <= 0) {
      document.getElementById('bleedingDebuffIcon').style.display = 'none';
    }
  }
  updateDebuffEffects();
  checkGameOver();
}
function updateHPBar() {
  const hpBar = document.getElementById('hpBar');
  const hpPercentage = playerHP / maxHP * 100;
  hpBar.style.width = hpPercentage + '%';
  if (hpPercentage < 25) {
    hpBar.style.background = 'linear-gradient(to right, #ff0000, #ff3333)';
  } else if (hpPercentage < 50) {
    hpBar.style.background = 'linear-gradient(to right, #ff3333, #ff6666)';
  } else {
    hpBar.style.background = 'linear-gradient(to right, #ff6666, #ff9999)';
  }
  if (playerHP <= 0) {
    checkGameOver();
  }
}
function updateHungerBar() {
  const hungerBar = document.getElementById('hungerBar');
  const hungerPercentage = playerHunger / maxHunger * 100;
  hungerBar.style.width = hungerPercentage + '%';
  if (hungerPercentage < 25) {
    hungerBar.style.background = 'linear-gradient(to right, #ff3333, #ff6666)';
  } else if (hungerPercentage < 50) {
    hungerBar.style.background = 'linear-gradient(to right, #ffff33, #ffff66)';
  } else {
    hungerBar.style.background = 'linear-gradient(to right, #33ff33, #66ff66)';
  }
  if (playerHunger <= 0) {
    checkGameOver();
  }
}
function generateRooms() {
  rooms = [];
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      grid[r][c] = {
        type: 'none'
      };
    }
  }
  const roomCount = Math.floor(Math.random() * 3) + 3;
  for (let i = 0; i < roomCount; i++) {
    const roomWidth = Math.floor(Math.random() * 5) + 3;
    const roomHeight = Math.floor(Math.random() * 5) + 3;
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 100) {
      attempts++;
      const startRow = Math.floor(Math.random() * (rows - roomHeight));
      const startCol = Math.floor(Math.random() * (cols - roomWidth));
      let overlap = false;
      for (let rr = 0; rr < roomHeight; rr++) {
        for (let cc = 0; cc < roomWidth; cc++) {
          if (grid[startRow + rr][startCol + cc].type !== 'none') {
            overlap = true;
            break;
          }
        }
        if (overlap) break;
      }
      if (!overlap) {
        for (let rr = 0; rr < roomHeight; rr++) {
          for (let cc = 0; cc < roomWidth; cc++) {
            grid[startRow + rr][startCol + cc].type = 'room';
          }
        }
        rooms.push({
          row: Math.floor(startRow + roomHeight / 2),
          col: Math.floor(startCol + roomWidth / 2)
        });
        placed = true;
      }
    }
  }
  rooms.sort((a, b) => a.row - b.row + (a.col - b.col));
  for (let i = 0; i < rooms.length - 1; i++) {
    const r1 = rooms[i].row;
    const c1 = rooms[i].col;
    const r2 = rooms[i + 1].row;
    const c2 = rooms[i + 1].col;
    if (r1 < r2) {
      for (let rr = r1; rr <= r2; rr++) {
        grid[rr][c1].type = 'corridor';
      }
    } else {
      for (let rr = r1; rr >= r2; rr--) {
        grid[rr][c1].type = 'corridor';
      }
    }
    if (c1 < c2) {
      for (let cc = c1; cc <= c2; cc++) {
        grid[r2][cc].type = 'corridor';
      }
    } else {
      for (let cc = c1; cc >= c2; cc--) {
        grid[r2][cc].type = 'corridor';
      }
    }
  }
  if (rooms.length > 0) {
    const fr = rooms[0].row;
    const fc = rooms[0].col;
    playerRow = fr;
    playerCol = fc;
  }
}
function placeTraps(numTraps) {
  let placed = 0;
  while (placed < numTraps) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (grid[r][c].type === 'room' || grid[r][c].type === 'corridor') {
      if (grid[r][c].type !== 'trap-poison' && grid[r][c].type !== 'trap-spike') {
        if (Math.random() < 0.5) {
          grid[r][c].type = 'trap-poison';
        } else {
          grid[r][c].type = 'trap-spike';
        }
        placed++;
      }
    }
  }
}
function placeLadder() {
  if (rooms.length > 0) {
    const lastIndex = rooms.length - 1;
    const lr = rooms[lastIndex].row;
    const lc = rooms[lastIndex].col;
    grid[lr][lc].type = 'ladder';
  }
}
function generateComplex() {
  generateRooms();
  placeTraps(2 + difficulty);
  placeLadder();
  renderGrid();
  updatePlayerPosition();
  drawMinimap();
}
function useLadder() {
  const fadeOverlay = document.getElementById('fadeOverlay');
  fadeOverlay.style.opacity = '1';
  fadeOverlay.style.pointerEvents = 'auto';
  setTimeout(() => {
    depth++;
    if (depth % 25 === 0 && difficulty < 10) {
      difficulty++;
    }
    updateDepthCounter();
    if (!checkVictory()) {
      generateComplex();
    }
    fadeOverlay.style.opacity = '0';
    setTimeout(() => {
      fadeOverlay.style.pointerEvents = 'none';
    }, 1000);
  }, 1000);
}
function renderGrid() {
  container.innerHTML = "";
  container.appendChild(player);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = document.createElement('div');
      tile.classList.add('tile', grid[r][c].type);
      if (grid[r][c].type === 'ladder') {
        tile.innerHTML = `
              <svg width="40" height="40" viewBox="0 0 100 100">
                <rect x="38" y="10" width="24" height="80" fill="#ccc" />
                <rect x="38" y="10" width="24" height="80" fill="none" stroke="#999" stroke-width="2"/>
                <rect x="30" y="20" width="40" height="6" fill="#777" />
                <rect x="30" y="35" width="40" height="6" fill="#777" />
                <rect x="30" y="50" width="40" height="6" fill="#777" />
                <rect x="30" y="65" width="40" height="6" fill="#777" />
                <rect x="30" y="80" width="40" height="6" fill="#777" />
              </svg>`;
      }
      tile.addEventListener('click', () => {
        if (r === playerRow && Math.abs(c - playerCol) === 1 || c === playerCol && Math.abs(r - playerRow) === 1) {
          movePlayer(r, c);
        }
      });
      container.appendChild(tile);
    }
  }
}
function updatePlayerPosition() {
  requestAnimationFrame(() => {
    player.style.transform = `translate3d(${playerCol * (tileSize + tileGap) + 10}px, ${playerRow * (tileSize + tileGap) + 10}px, 0)`;
  });
  centerCamera();
  drawMinimap();
  checkGameOver();
}
function centerCamera() {
  const centerPlayerX = playerCol * (tileSize + tileGap) + 30;
  const centerPlayerY = playerRow * (tileSize + tileGap) + 30;
  const offsetX = window.innerWidth / 2 - centerPlayerX;
  const offsetY = window.innerHeight / 2 - centerPlayerY;
  requestAnimationFrame(() => {
    container.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
  });
}
function drawMinimap() {
  const c = document.getElementById('minimapCanvas');
  const ctx = c.getContext('2d');
  const tileScale = 3;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 0.5;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      let color = 'rgba(0, 0, 0, 0.5)';
      if (grid[r][col].type === 'room') {
        color = 'rgba(100, 100, 100, 0.8)';
      } else if (grid[r][col].type === 'corridor') {
        color = 'rgba(120, 120, 120, 0.8)';
      } else if (grid[r][col].type === 'trap-poison') {
        color = 'rgba(128, 0, 128, 0.8)';
      } else if (grid[r][col].type === 'trap-spike') {
        color = 'rgba(255, 0, 0, 0.8)';
      } else if (grid[r][col].type === 'ladder') {
        color = 'rgba(200, 200, 200, 0.8)';
      }
      ctx.fillStyle = color;
      ctx.fillRect(col * tileScale, r * tileScale, tileScale, tileScale);
    }
  }
  ctx.fillStyle = '#ff3333';
  ctx.shadowColor = '#ff3333';
  ctx.shadowBlur = 5;
  ctx.fillRect(playerCol * tileScale, playerRow * tileScale, tileScale, tileScale);
  ctx.shadowBlur = 0;
}
function openInventory() {
  const inventoryOverlay = document.getElementById('inventoryOverlay');
  inventoryOverlay.style.display = 'block';
  inventoryOverlay.classList.add('show');
  searchInventory();
}
function closeInventory() {
  const inventoryOverlay = document.getElementById('inventoryOverlay');
  inventoryOverlay.classList.remove('show');
  setTimeout(() => {
    inventoryOverlay.style.display = 'none';
  }, 0);
}
function searchInventory() {
  const query = document.getElementById('inventorySearch').value.toLowerCase();
  filteredInventory = inventory.filter(item => item.name.toLowerCase().includes(query));
  renderInventoryPage();
}
function renderInventoryPage() {
  const slotsContainer = document.getElementById('inventorySlots');
  slotsContainer.innerHTML = '';
  const items = filteredInventory.filter(item => item.name !== "Item");
  items.forEach((item, index) => {
    const slot = document.createElement('div');
    slot.classList.add('inventory-slot');
    if (item.type === 'food') {
      slot.style.backgroundColor = 'rgba(51, 170, 51, 0.3)';
      slot.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; width: 100%; height: 100%;">
          <svg width="48" height="48" viewBox="0 0 100 100">
            <path d="M50,30c-10,0-18,8-18,18c0,12,7,20,18,30c11-10,18-18,18-30c0-10-8-18-18-18z" fill="lightgreen" />
            <rect x="45" y="18" width="10" height="10" fill="brown" />
          </svg>
        </div>
      `;
    } else if (item.type === 'potion') {
      slot.style.backgroundColor = 'rgba(51, 51, 170, 0.3)';
      slot.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; width: 100%; height: 100%;">
          <svg width="48" height="48" viewBox="0 0 100 100">
            <path d="M40,20h20v10l15,40c0,10-50,10-50,0l15-40V20" fill="#88f" />
            <path d="M45,25h10v8h-10v-8" fill="#fff" />
          </svg>
        </div>
      `;
    } else if (item.type === 'scroll') {
      slot.style.backgroundColor = 'rgba(170, 51, 51, 0.3)';
      slot.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; width: 100%; height: 100%;">
          <svg width="48" height="48" viewBox="0 0 100 100">
            <path d="M30,20h40v60c0,0-40,5-40-5V20z" fill="#ddd" />
            <path d="M35,30h30M35,40h30M35,50h20" stroke="#666" stroke-width="4" />
          </svg>
        </div>
      `;
    }
    slot.addEventListener('click', () => {
      openItemDetail(item, index);
    });
    slotsContainer.appendChild(slot);
  });
}
function openItemDetail(item, realIndex, isGear = false) {
  selectedItemIndex = realIndex;
  document.getElementById('itemDetailName').textContent = item.name;
  document.getElementById('itemDetailDescription').textContent = item.description;
  const detailStats = document.getElementById('itemDetailStats');
  detailStats.style.display = 'none';
  detailStats.textContent = '';
  const useBtn = document.getElementById('useItemBtn');
  if (!isGear && item.type === 'food') {
    useBtn.style.display = 'inline-block';
    detailStats.style.display = 'block';
    detailStats.textContent = `Type:              Food Item
Nutrition:          +25 Hunger
Freshness:          Good
Ration Quality:     Standard  
Additional Effects: None
Quantity:          ${item.quantity}`;
  } else if (!isGear) {
    useBtn.style.display = 'none';
    detailStats.style.display = 'block';
    detailStats.textContent = `Type:              ${item.type}
Quantity:          ${item.quantity}
Quality:           Standard
Durability:        Good`;
  } else {
    useBtn.style.display = 'none';
  }
  document.getElementById('itemDetailOverlay').style.display = 'block';
}
function closeItemDetail() {
  document.getElementById('itemDetailOverlay').style.display = 'none';
}
function useSelectedItem() {
  if (selectedItemIndex !== null && filteredInventory[selectedItemIndex]) {
    const item = filteredInventory[selectedItemIndex];
    switch (item.type) {
      case 'food':
        if (item.name === "Hearty Ration") {
          playerHunger = Math.min(maxHunger, playerHunger + 30);
          playerHP = Math.min(maxHP, playerHP + 5);
        } else if (item.name === "Magic Berry") {
          playerHunger = Math.min(maxHunger, playerHunger + 15);
          activeDebuffs.poison = 0;
          document.getElementById('poisonDebuffIcon').style.display = 'none';
        } else if (item.name === "Dragon Fruit") {
          playerHunger = Math.min(maxHunger, playerHunger + 20);
        }
        break;
      case 'potion':
        if (item.name === "Health Potion") {
          playerHP = Math.min(maxHP, playerHP + 25);
        } else if (item.name === "Antidote") {
          activeDebuffs.poison = 0;
          document.getElementById('poisonDebuffIcon').style.display = 'none';
        }
        break;
      case 'scroll':
        if (item.name === "Scroll of Teleport") {
          const randomRoom = rooms[Math.floor(Math.random() * rooms.length)];
          playerRow = randomRoom.row;
          playerCol = randomRoom.col;
          updatePlayerPosition();
        } else if (item.name === "Scroll of Mapping") {}
        break;
    }
    updateHPBar();
    updateHungerBar();
    incrementTurnCount();
    applyDotEffects();
    item.quantity--;
    if (item.quantity <= 0) {
      const idxInMain = inventory.indexOf(item);
      if (idxInMain !== -1) {
        inventory.splice(idxInMain, 1);
      }
    }
    closeItemDetail();
    closeInventory();
  }
}
function showGearPage() {
  document.getElementById('inventorySlots').style.display = 'none';
  document.getElementById('gearSlots').style.display = 'flex';
  renderGearSlots();
}
function showItemsPage() {
  document.getElementById('gearSlots').style.display = 'none';
  document.getElementById('inventorySlots').style.display = 'flex';
  renderInventoryPage();
}
function renderGearSlots() {
  const gearSlotsContainer = document.getElementById('gearSlots');
  gearSlotsContainer.innerHTML = '';
  const gearItems = [{
    slotName: 'weapon',
    icon: getWeaponIcon()
  }, {
    slotName: 'armor',
    icon: getArmorIcon()
  }, {
    slotName: 'amulet',
    icon: getAmuletIcon()
  }, {
    slotName: 'ring',
    icon: getRingIcon()
  }];
  gearItems.forEach(gearSlot => {
    const slot = document.createElement('div');
    slot.classList.add('gear-slot');
    const currentGear = gear[gearSlot.slotName];
    slot.style.backgroundColor = 'rgba(85, 85, 85, 0.3)';
    slot.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; width: 100%; height: 100%;">
        ${gearSlot.icon}
      </div>
    `;
    if (currentGear) {
      slot.addEventListener('click', () => {
        openGearDetail(currentGear);
      });
    }
    gearSlotsContainer.appendChild(slot);
  });
}
function openGearDetail(gearItem) {
  openItemDetail(gearItem, -1, true);
}
function getWeaponIcon() {
  return `
    <svg width="36" height="36" viewBox="0 0 100 100">
      <path d="M75 25l-10-10-16 16 6 6L45 47l-8-8-8 8 15 15-16 16 10 10 16-16 15 15 8-8-15-15 14-10 6 6 16-16z" fill="#ccc"/>
    </svg>
  `;
}
function getArmorIcon() {
  return `
    <svg width="36" height="36" viewBox="0 0 100 100">
      <path d="M25 20h50l10 20v20l-10 20H25l-10-20V40l10-20zm25 60c15 0 25-20 25-20V45H25v15s10 20 25 20z" fill="#ccc"/>
    </svg>
  `;
}
function getAmuletIcon() {
  return `
    <svg width="36" height="36" viewBox="0 0 100 100">
      <path d="M50 20L35 35h30L50 20z" fill="#ffd700"/>
      <circle cx="50" cy="55" r="20" fill="#ffd700"/>
      <path d="M40 75l10 10 10-10H40z" fill="#ffd700"/>
    </svg>
  `;
}
function getRingIcon() {
  return `
    <svg width="28" height="28" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="30" fill="#ffd700" stroke="#daa520" stroke-width="6"/>
      <circle cx="50" cy="50" r="20" fill="none" stroke="#daa520" stroke-width="4"/>
    </svg>
  `;
}
function toggleDebuffDesc(descId) {
  const element = document.getElementById(descId);
  if (!element.classList.contains('show')) {
    element.classList.add('show');
    requestAnimationFrame(() => {
      const rect = element.getBoundingClientRect();
      const offsetRight = rect.right - window.innerWidth;
      const offsetLeft = rect.left;
      const offsetBottom = rect.bottom - window.innerHeight;
      if (offsetRight > 0) {
        element.style.left = element.offsetLeft - offsetRight - 10 + 'px';
      }
      if (offsetLeft < 0) {
        element.style.left = element.offsetLeft - offsetLeft + 10 + 'px';
      }
      if (offsetBottom > 0) {
        element.style.top = element.offsetTop - offsetBottom - 10 + 'px';
      }
    });
  } else {
    element.classList.remove('show');
    element.style.left = '0';
    element.style.top = '52px';
  }
}
const subtexts = ["Delving is believing", "Watch your hunger", "Poison is not your friend", "Beware of spikes", "Time is your greatest foe", "Deeper dungeons, bigger foes", "Your next run awaits", "Survive or die trying", "Hordes lurk in the darkness", "Fortune favors the bold", "Wits, not fits", "Brought to you by Adversity's Den"];
function cycleSubtexts() {
  const titleSubtext = document.getElementById('titleSubtext');
  const randomIndex = Math.floor(Math.random() * subtexts.length);
  titleSubtext.style.opacity = '0';
  setTimeout(() => {
    titleSubtext.textContent = subtexts[randomIndex];
    titleSubtext.style.opacity = '1';
  }, 300);
}
setInterval(cycleSubtexts, 5000);
cycleSubtexts();
function openTutorial() {
  alert("Tutorial not implemented yet!");
}
function openCredits() {
  alert("Credits: Game created by the dev team!");
}
function startGame() {
  document.getElementById('titleScreenOverlay').style.display = 'none';
  document.getElementById('instructionsOverlay').style.display = 'none';
  backgroundMusic = document.getElementById('backgroundMusic');
  backgroundMusic.volume = 0.5;
  backgroundMusic.play().catch(function (error) {
    console.log("Audio play failed:", error);
  });
}
const VICTORY_DEPTH = 100;
function checkGameOver() {
  if (playerHP <= 0 || playerHunger <= 0) {
    let reason = playerHP <= 0 ? "You have died!" : "You starved to death!";
    showGameOver(reason);
    return true;
  }
  return false;
}
function checkVictory() {
  if (depth >= VICTORY_DEPTH) {
    showVictory();
    return true;
  }
  return false;
}
function showGameOver(reason) {
  if (backgroundMusic) {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
  }
  const gameOverOverlay = document.getElementById('gameOverOverlay');
  gameOverOverlay.innerHTML = `
    <div class="game-over-content">
      <h1>Game Over</h1>
      <p id="gameOverReason">${reason}</p>
      <p id="gameOverStats">Final Depth: ${depth}<br>Turns Survived: ${turnCount}</p>
      <button onclick="restartGame()">Try Again</button>
    </div>
  `;
  gameOverOverlay.style.display = 'flex';
}
function showVictory() {
  if (backgroundMusic) {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
  }
  const victoryOverlay = document.getElementById('victoryOverlay');
  const victoryStats = document.getElementById('victoryStats');
  victoryStats.textContent = `Final Depth: ${depth}\nTurns Taken: ${turnCount}`;
  victoryOverlay.style.display = 'block';
}
function restartGame() {
  playerHP = maxHP;
  playerHunger = maxHunger;
  depth = 1;
  difficulty = 1;
  turnCount = 0;
  activeDebuffs = {
    poison: 0,
    bleeding: 0,
    bleedingLock: 0
  };
  document.getElementById('gameOverOverlay').style.display = 'none';
  document.getElementById('victoryOverlay').style.display = 'none';
  if (backgroundMusic && backgroundMusic.paused) {
    backgroundMusic.play().catch(function (error) {
      console.log("Audio play failed:", error);
    });
  }
  updateHPBar();
  updateHungerBar();
  updateDepthCounter();
  generateComplex();
}
function openInstructions() {
  const instructionsOverlay = document.getElementById('instructionsOverlay');
  instructionsOverlay.style.display = 'block';
  document.getElementById('titleScreenOverlay').style.display = 'none';
  instructionsOverlay.innerHTML = `
    <div id="instructionsContainer">
      <button id="closeInstructionsBtn" onclick="closeInstructions()">&#xd7;</button>
      <h2>How to Play</h2>
      <p style="margin-bottom: 20px;">
        Welcome to the Roguelike Adventure! Navigate the dungeon, find treasures, and survive the depths.
      </p>
      <h3>Quick Guide:</h3>
      <ul style="font-size: 20px; line-height: 1.8; margin-bottom: 30px;">
        <li>Move with arrow keys or click adjacent tiles</li>  
        <li>Press 'I' or click inventory button to manage items</li>
        <li>Watch your health and hunger bars</li>
        <li>Find the ladder to descend deeper</li>
      </ul>
      <h3>Game Elements:</h3>
      <ul style="font-size: 20px; line-height: 1.8; margin-bottom: 30px;">
        <li>Combat powerful enemies</li>
        <li>Use potions and scrolls wisely</li> 
        <li>Find magical items and gear</li>
        <li>Watch for traps and hazards</li>
      </ul>
      <p style="margin-top: 30px; font-size: 24px; text-align: center; color: #fff;">
        Good luck on your adventure!
      </p>
    </div>
  `;
  const instructionsContainer = document.getElementById('instructionsContainer');
  instructionsContainer.style.zIndex = 1;
}
function closeInstructions() {
  document.getElementById('instructionsOverlay').style.display = 'none';
  const titleScreen = document.getElementById('titleScreenOverlay');
  titleScreen.style.display = 'flex';
  titleScreen.style.alignItems = 'center';
  titleScreen.style.justifyContent = 'center';
}
function movePlayer(newRow, newCol) {
  if (newRow < 0 || newRow >= rows || newCol < 0 || newCol >= cols) {
    return;
  }
  if (activeDebuffs.bleedingLock > 0) {
    incrementTurnCount();
    applyDotEffects();
    activeDebuffs.bleedingLock--;
    return;
  }
  if (grid[newRow][newCol].type !== 'none') {
    incrementTurnCount();
    applyDotEffects();
    playerRow = newRow;
    playerCol = newCol;
    playerHunger = Math.max(0, playerHunger - 1);
    updateHungerBar();
    updatePlayerPosition();
    if (grid[newRow][newCol].type === 'trap-poison') {
      activeDebuffs.poison = 6;
      document.getElementById('poisonDebuffIcon').style.display = 'flex';
      updateDebuffEffects();
    }
    if (grid[newRow][newCol].type === 'trap-spike') {
      activeDebuffs.bleeding = 5;
      activeDebuffs.bleedingLock = 1;
      document.getElementById('bleedingDebuffIcon').style.display = 'flex';
      updateDebuffEffects();
    }
    if (grid[newRow][newCol].type === 'ladder') {
      useLadder();
    }
    checkGameOver();
  }
}
document.addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'i') {
    openInventory();
  }
  const newRow = playerRow;
  const newCol = playerCol;
  switch (e.key) {
    case 'ArrowUp':
      movePlayer(playerRow - 1, playerCol);
      break;
    case 'ArrowDown':
      movePlayer(playerRow + 1, playerCol);
      break;
    case 'ArrowLeft':
      movePlayer(playerRow, playerCol - 1);
      break;
    case 'ArrowRight':
      movePlayer(playerRow, playerCol + 1);
      break;
  }
});
function getDebuffIcons() {
  document.querySelector('#poisonDebuffIcon svg').setAttribute('width', '36');
  document.querySelector('#poisonDebuffIcon svg').setAttribute('height', '36');
  document.querySelector('#bleedingDebuffIcon svg').setAttribute('width', '36');
  document.querySelector('#bleedingDebuffIcon svg').setAttribute('height', '36');
}
document.addEventListener('DOMContentLoaded', getDebuffIcons);
let backgroundMusic;
updateHPBar();
updateHungerBar();
updateDepthCounter();
generateComplex();