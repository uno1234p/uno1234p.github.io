/* =========================================
   KONFIGURASI DASAR & STATE GAME
   ========================================= */
const colors = ['red', 'blue', 'green', 'yellow'];
const types = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '🚫', '🔄', '+2'];
const names = ['PLAYER 1', 'PLAYER 2', 'PLAYER 3', 'PLAYER 4'];

let turn = 0,
    players = [],
    winners = [],
    current = {},
    busy = true,
    gameMode = 4;

let unoCalled = false,
    direction = 1,
    stackCount = 0;

let isViewing = false;
let initialCards = 7; 
let gameVariant = 'normal'; 

/* =========================================
   FUNGSI ALUR PERMAINAN (CORE)
   ========================================= */

function resetGameData() {
    players = [];
    winners = [];
    current = {};
    turn = 0;
    busy = true;
    unoCalled = false;
    direction = 1;
    stackCount = 0;
    isViewing = false;
}

function processStart() {
    const pCount = parseInt(document.getElementById('selectPlayers').value) || 4;
    const cCount = parseInt(document.getElementById('selectCards').value) || 7;
    gameVariant = document.getElementById('selectMode').value; 
    startSetup(pCount, cCount);
}

function startSetup(mode, cardCount) {
    resetGameData();
    gameMode = mode;
    initialCards = cardCount; 

    // Layout khusus untuk 2 pemain
    document.body.className = (mode === 2) ? 'mode-2' : 'mode-other';

    players = Array.from({ length: mode }, () => []);
    
    document.getElementById('mainMenu').style.opacity = '0';
    document.getElementById('scoreMenu').style.display = 'none';
    
    setTimeout(() => {
        document.getElementById('mainMenu').style.display = 'none';
        document.getElementById('table').style.display = 'flex';
        init();
    }, 600);
}

function init() {
    renderSlots();
    dealCardsAnimation();
}

/* =========================================
   LOGIKA KARTU & GENERATOR
   ========================================= */

function getCard() {
    let r = Math.random();

    // Mode No Mercy: Kartu-kartu beban berat
    if (gameVariant === 'nomercy') {
        if (r > 0.98) return { color: 'wild', val: '+100' };
        if (r > 0.95) return { color: 'wild', val: '+30' };
        if (r > 0.92) return { color: 'wild', val: '+25' };
        if (r > 0.88) return { color: 'wild', val: '+10' };
    }

    // Mode Flip: Kartu dengan sisi kedua (fCol & fVal)
    if (gameVariant === 'flip') {
        if (r > 0.80) {
            const darkColors = ['flip-purple', 'flip-cyan'];
            return { 
                color: darkColors[Math.floor(Math.random() * 2)], 
                val: types[Math.floor(Math.random() * types.length)],
                fCol: colors[Math.floor(Math.random() * 4)],
                fVal: types[Math.floor(Math.random() * types.length)],
                isDark: true
            };
        }
    }

    // Kartu Spesial Normal
    if (r > 0.88) return { color: 'wild', val: '+4' };
    if (r > 0.82) return { color: 'wild', val: '🌈' };

    // Kartu Angka Biasa
    const randomColor = colors[Math.floor(Math.random() * 4)];
    const randomVal = types[Math.floor(Math.random() * types.length)];

    return { 
        color: randomColor, 
        val: randomVal,
        fCol: (gameVariant === 'flip') ? 'flip-cyan' : colors[Math.floor(Math.random() * 4)],
        fVal: types[Math.floor(Math.random() * types.length)],
        isDark: false
    };
}

/* =========================================
   ANIMASI & UI RENDERING
   ========================================= */

async function dealCardsAnimation() {
    const deck = document.getElementById('deck');
    if(!deck) return;
    const dRect = deck.getBoundingClientRect();
    busy = true;

    for (let j = 0; j < initialCards; j++) {
        for (let i = 0; i < gameMode; i++) {
            await createFlyCard(dRect.left, dRect.top, i, getCard());
            await new Promise(r => setTimeout(r, 80)); 
        }
    }
    
    turn = Math.floor(Math.random() * gameMode);
    direction = Math.random() > 0.5 ? 1 : -1;
    
    let firstCard = getCard();
    while(firstCard.color === 'wild' || firstCard.val.includes('+')) { 
        firstCard = getCard(); 
    }
    
    await createFlyCard(dRect.left, dRect.top, 'topCard', firstCard);

    busy = false;
    render();
    showNotif(`${names[turn]} MULAI!\nMODE: ${gameVariant.toUpperCase()}`, "gold");
}

function createCardUI(data, isBack) {
    if (!data) return document.createElement('div');
    
    const kDiv = document.createElement('div');
    let extraClass = "";
    
    // Deteksi Desain RIDFOT & Flip
    if (data.isDark || (data.color && data.color.includes('flip'))) {
        extraClass += " flip-dark-card flip-card-active";
    }
    if (data.val && data.val.includes('+') && parseInt(data.val.replace('+','')) >= 10) {
        extraClass += " nomercy-card";
    }
    
    kDiv.className = `c ${isBack ? 'back' : (data.color === 'wild' ? 'wild-bg' : data.color)}${extraClass}`;
    
    const face = document.createElement('div');
    face.className = `c-face`;
    face.setAttribute('data-val', data.val || "");
    
    const symbol = document.createElement('div');
    symbol.className = 'c-symbol';
    
    if(data.val && data.val.length >= 3) symbol.style.fontSize = "0.85rem";
    
    if (isBack) {
        symbol.innerText = ""; 
    } else {
        const v = data.val;
        // Penanganan Simbol Non-Emoji (Menghubungkan ke CSS)
        if (v === '🚫') {
            symbol.classList.add('symbol-skip');
        } else if (v === '🔄') {
            symbol.classList.add('symbol-reverse');
        } else if (v === '🌈') {
            symbol.classList.add('symbol-wild');
        } else {
            symbol.innerText = v; 
        }
    }
    
    face.appendChild(symbol);
    kDiv.appendChild(face);
    return kDiv;
}

function createFlyCard(startX, startY, targetIdx, data) {
    return new Promise(resolve => {
        const fly = createCardUI(data, true);
        fly.classList.add('fly');
        fly.style.left = startX + 'px';
        fly.style.top = startY + 'px';
        document.body.appendChild(fly);
        
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                let target;
                if (targetIdx === 'topCard') {
                    target = document.getElementById('topCard');
                } else {
                    target = document.querySelectorAll('.hand')[targetIdx];
                }
                
                if (target) {
                    const rect = target.getBoundingClientRect();
                    fly.style.left = (rect.left + (rect.width/2) - 20) + 'px';
                    fly.style.top = (rect.top + (rect.height/2) - 30) + 'px';
                }
            });
        });

        setTimeout(() => {
            if (document.body.contains(fly)) document.body.removeChild(fly);
            if (targetIdx === 'topCard') {
                document.getElementById('topCard').style.visibility = 'visible';
                current = data;
            } else if (players[targetIdx]) {
                players[targetIdx].push(data);
            }
            render();
            resolve();
        }, 500); 
    });
}

function renderSlots() {
    const ui = document.getElementById('ui');
    if(!ui) return;
    ui.innerHTML = '';
    for (let i = 0; i < gameMode; i++) {
        const slot = document.createElement('div');
        let slotClass = i;
        if (gameMode === 2 && i === 1) slotClass = 2;
        slot.className = `slot s${slotClass}`;
        slot.style.display = 'flex';
        slot.innerHTML = `
            <div class="controls">
                <button class="btn btn-lihat" id="p-${i}" onclick="toggleView(${i})">LIHAT</button>
                <button class="btn btn-uno" id="u-${i}" onclick="callUno(${i})">UNO</button>
            </div>
            <div class="hand"></div>
            <div class="name-box">
                <span id="rank-${i}" class="rank-tag"></span>
                <div class="name">${names[i]}</div>
            </div>`;
        ui.appendChild(slot);
    }
}

function render() {
    const topCardEl = document.getElementById('topCard');
    if (!topCardEl || !current.color) return;

    topCardEl.innerHTML = '';
    topCardEl.appendChild(createCardUI(current, false));
    
    let visualTurn = turn;
    if (gameMode === 2 && turn === 1) visualTurn = 2;

    /* --- UPDATE POINTER & WARNA DINAMIS --- */
    const pointer = document.getElementById('pointer');
    if (pointer) {
        pointer.style.transform = `rotate(${visualTurn * 90}deg)`;
        
        let pCol = "gold"; // Warna default
        if (current.color === 'red') pCol = "#ED1C24";
        else if (current.color === 'blue') pCol = "#0054A6";
        else if (current.color === 'green') pCol = "#00A651";
        else if (current.color === 'yellow') pCol = "#FDCF08";
        else if (current.color === 'wild') pCol = "#ffffff";
        else if (current.color.includes('flip-cyan')) pCol = "#00e5ff";
        else if (current.color.includes('flip-purple')) pCol = "#9c27b0";

        // Update CSS Variable --current-color di :root
        document.documentElement.style.setProperty('--current-color', pCol);
    }

    const sInfo = document.getElementById('stackInfo');
    if (sInfo) {
        if (stackCount > 0) {
            sInfo.innerText = `STACK: +${stackCount}`;
            sInfo.style.display = 'block';
        } else {
            sInfo.style.display = 'none';
        }
    }

    for (let i = 0; i < gameMode; i++) {
        const isWinner = winners.includes(i);
        const slot = document.querySelectorAll('.slot')[i];
        if (!slot) continue;

        slot.classList.toggle('active-glow', turn === i && !busy);
        slot.classList.toggle('winner-out', isWinner);

        const hand = slot.querySelector('.hand');
        const btnP = document.getElementById(`p-${i}`);
        const btnU = document.getElementById(`u-${i}`);
        const rankTag = document.getElementById(`rank-${i}`);

        if (isWinner) {
            const rPos = winners.indexOf(i) + 1;
            if(rankTag) rankTag.innerHTML = `JUARA ${rPos} 🏆`;
            if(hand) hand.innerHTML = '';
            continue;
        }

        if(btnP) btnP.style.display = (turn === i && !busy && !isViewing) ? 'block' : 'none';
        if(btnU) btnU.style.display = (players[i] && players[i].length === 1 && turn === i && !busy) ? 'block' : 'none';

        if(hand && players[i]) {
            hand.innerHTML = '';
            const totalCards = players[i].length;

            players[i].forEach((kData, kIdx) => {
                const showCard = (turn === i && isViewing);
                const kDiv = createCardUI(kData, !showCard);
                
                let overlapValue = "8px"; 
                if (!showCard) {
                    if (totalCards > 15) overlapValue = "-42px";
                    else if (totalCards > 10) overlapValue = "-36px";
                    else if (totalCards > 5) overlapValue = "-30px";
                    else overlapValue = "-24px";
                }

                kDiv.style.marginLeft = kIdx === 0 ? "0px" : overlapValue;
                kDiv.style.zIndex = kIdx;
                
                kDiv.onclick = (e) => play(e, i, kIdx);
                hand.appendChild(kDiv);
            });
        }
    }
}

async function play(e, pIdx, kIdx) {
    if (busy || turn !== pIdx || !players[pIdx]) return;
    const k = players[pIdx][kIdx];
    if (!k) return;

    const isStacking = stackCount > 0 && k.val.includes('+');
    const isNormalMatch = stackCount === 0 && (k.color === current.color || k.val === current.val || k.color === 'wild');

    if (!isStacking && !isNormalMatch) return;

    busy = true;

    if (gameVariant === 'flip' && k.val === '🔄') {
        showNotif("FLIP! KARTU DIBALIK", "cyan");
        players.forEach(pHand => {
            pHand.forEach(c => {
                if(c.color !== 'wild') {
                    let tempC = c.color, tempV = c.val;
                    c.color = c.fCol || 'flip-cyan'; c.val = c.fVal || '0';
                    c.fCol = tempC; c.fVal = tempV;
                    c.isDark = !c.isDark;
                }
            });
        });
    }

    if (players[pIdx].length === 1 && !unoCalled) {
        showNotif("LUPA UNO! +2", "red");
        const dRect = document.getElementById('deck').getBoundingClientRect();
        for (let x = 0; x < 2; x++) await createFlyCard(dRect.left, dRect.top, pIdx, getCard());
        finishTurn({});
        return;
    }

    const handEl = document.querySelectorAll('.hand')[pIdx];
    const cardEl = handEl.children[kIdx];
    const rect = cardEl.getBoundingClientRect();

    const cln = createCardUI(k, false);
    cln.classList.add('fly');
    cln.style.left = rect.left + 'px';
    cln.style.top = rect.top + 'px';
    document.body.appendChild(cln);

    current = k;
    players[pIdx].splice(kIdx, 1);

    if (k.val && k.val.includes('+')) {
        stackCount += parseInt(k.val.replace('+', ''));
    }

    await new Promise(res => setTimeout(() => {
        if (document.body.contains(cln)) document.body.removeChild(cln);
        res();
    }, 400));

    if (players[pIdx].length === 0) {
        winners.push(pIdx);
        showNotif(`${names[pIdx]} SELESAI!`, "gold");
        if (winners.length >= gameMode - 1) {
            showScoreMenu();
            return;
        }
    }

    if (current.color === 'wild') {
        document.getElementById('colorPicker').style.display = 'grid';
    } else {
        finishTurn(current);
    }
}

async function draw() {
    if (busy || winners.includes(turn)) return;
    busy = true;
    const dRect = document.getElementById('deck').getBoundingClientRect();
    
    if (stackCount > 0) {
        showNotif(`AMBIL +${stackCount}!`, "red");
        for (let i = 0; i < stackCount; i++) {
            await createFlyCard(dRect.left, dRect.top, turn, getCard());
            await new Promise(r => setTimeout(r, 60));
        }
        stackCount = 0;
    } else {
        await createFlyCard(dRect.left, dRect.top, turn, getCard());
    }
    
    finishTurn({});
}

function finishTurn(k) {
    if (k.val === '🔄') direction *= -1;
    let skip = (k.val === '🚫') ? 2 : 1;
    
    let next = (turn + (direction * skip) + gameMode) % gameMode;
    while (winners.includes(next) && winners.length < gameMode) {
        next = (next + direction + gameMode) % gameMode;
    }
    
    turn = next;
    unoCalled = false;
    isViewing = false;
    busy = false;
    render();
}

function chooseColor(c) {
    current.color = c;
    document.getElementById('colorPicker').style.display = 'none';
    finishTurn(current);
}

function toggleView(idx) {
    if (turn !== idx || busy) return;
    isViewing = !isViewing;
    render();
}

function callUno(idx) {
    if (turn === idx) {
        unoCalled = true;
        showNotif("UNO!", "#ffcf08");
        render();
    }
}

function showNotif(txt, col) {
    const n = document.getElementById('gameNotif');
    n.innerText = txt;
    n.style.color = col;
    n.classList.add('show-notif');
    setTimeout(() => n.classList.remove('show-notif'), 1500);
}

function showScoreMenu() {
    let results = [...winners];
    let remaining = [];
    for (let i = 0; i < gameMode; i++) {
        if (!winners.includes(i)) {
            remaining.push({ idx: i, count: players[i].length });
        }
    }
    remaining.sort((a, b) => a.count - b.count);
    remaining.forEach(p => results.push(p.idx));

    const list = document.getElementById('scoreList');
    if(!list) return;
    list.innerHTML = '';
    results.forEach((pIdx, rank) => {
        const item = document.createElement('div');
        item.className = 'score-item';
        const rankLabel = rank === 0 ? "🏆 JUARA 1" : `JUARA ${rank + 1}`;
        item.innerHTML = `<span>${rankLabel}</span> <span class="${rank === 0 ? 'gold-txt' : ''}">${names[pIdx]}</span>`;
        list.appendChild(item);
    });

    setTimeout(() => {
        document.getElementById('scoreMenu').style.display = 'flex';
    }, 1500);
}

function backToRealMenu() {
    document.getElementById('scoreMenu').style.display = 'none';
    document.getElementById('table').style.display = 'none';
    document.getElementById('mainMenu').style.display = 'flex';
    document.getElementById('mainMenu').style.opacity = '1';
}
