// Uugguu Combo Tracker JavaScript


const $ = id => document.getElementById(id);
const STORAGE = 'uugguuComboTracker_v3';

let state = {
    original: 1,
    uCopies: 0,
    uTokens: 0,
    ritualists: 0,
    extraDevotion: 0,
    creatures: [],
    lastDeath: ''
};

function save() {
    try {
        localStorage.setItem(STORAGE, JSON.stringify(state));
    } catch (e) {
        console.warn('Could not save tracker state.', e);
    }
}

function load() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE) || 'null');
        if (saved && typeof saved === 'object') {
            state = { ...state, ...saved };
        }
    } catch (e) {
        console.warn('Could not load saved tracker state.', e);
    }
}

function int(value, min = 0) {
    const number = Math.floor(Number(value));
    return Number.isFinite(number) ? Math.max(min, number) : min;
}

function makeBuckets() {
    return {
        untapped: 0,
        tapped: 0,
        bluePips: 0,
        manaCost: '',
        image: '',
        typeLine: '',
        name: '',
        isUugguu: false
    };
}

function totalBucket(creature) {
    return creature.untapped + creature.tapped;
}

function applyNewTokens(creature, count) {
    creature.untapped += int(count);
}

function totalU() {
    return state.original + state.uCopies + state.uTokens;
}


// Main rendering


function render() {
    $('original').textContent = state.original;
    $('uCopies').textContent = state.uCopies;
    $('uTokens').textContent = state.uTokens;
    $('uTotal').textContent = totalU();
    $('uDevotion').textContent = totalU();

    $('ritualists').value = state.ritualists;
    $('ritualistPairsNote').textContent =
        `Pairs created: ${totalU()} (based on your current Uugguu count)`;

    $('extraDevotion').value = state.extraDevotion;
    $('deathResult').textContent =
        state.lastDeath || 'Death results will appear here.';

    renderCreatures();
    renderDevotion();
    calcRitualist(false);
    save();
}


// Gladewalker Ritualist calculator


function calculateRitualists() {
    let onBoard = int($('ritualists').value);
    const pairs = totalU();
    let sum = 0;
    const lines = [];

    for (let i = 1; i <= pairs; i++) {
        // Each entering Ritualist sees every other Ritualist entering.
        const draws = 2 * (onBoard + 1);

        sum += draws;
        lines.push(`Pair ${i}: ${draws}`);
        onBoard += 2;
    }

    return { sum, lines, pairs };
}

function calcRitualist(writeState = true) {
    state.ritualists = int($('ritualists').value);

    const result = calculateRitualists();

    $('ritualistPairsNote').textContent =
        `Pairs created: ${result.pairs} (based on your current Uugguu count)`;

    $('ritualistTotal').textContent = result.sum;
    $('ritualistBreakdown').textContent =
        result.lines.join(' · ') || 'No pairs';

    if (writeState) {
        save();
    }
}

// Generic creature token tracker


function renderCreatures() {
    const root = $('creatures');
    root.innerHTML = '';

    if (!state.creatures.length) {
        root.innerHTML =
            '<p class="section-note">No creature token types tracked yet.</p>';
        return;
    }

    state.creatures.forEach((creature, index) => {
        const total = totalBucket(creature);

        const element = document.createElement('div');
        element.className = 'creature';

        const header = document.createElement('div');
        header.className = 'creature-head';

        if (creature.image) {
            const image = document.createElement('img');
            image.src = creature.image;
            image.alt = creature.name + ' card image';
            image.loading = 'lazy';
            header.append(image);
        }

        const name = document.createElement('div');
        name.className = 'creature-name';
        name.textContent = creature.name;
        header.append(name);

        const count = document.createElement('span');
        count.className = 'pill';
        count.textContent = total + ' tokens';
        header.append(count);

        element.append(header);

        if (creature.typeLine) {
            const type = document.createElement('p');
            type.className = 'section-note';
            type.textContent =
                creature.typeLine +
                ' · Mana cost ' + (creature.manaCost || 'unknown') +
                ' · Blue pips: ' + creature.bluePips;
            element.append(type);
        }

        const grid = document.createElement('div');
        grid.className = 'token-grid';

        const buckets = [
            ['untapped', 'Untapped'],
            ['tapped', 'Tapped']
        ];

        buckets.forEach(([key, label]) => {
            const bucket = document.createElement('div');
            bucket.className = 'bucket';

            const heading = document.createElement('span');
            heading.textContent = label;
            bucket.append(heading);

            const value = document.createElement('b');
            value.textContent = creature[key];
            bucket.append(value);

            const row = document.createElement('div');
            row.className = 'row';

            const minus = document.createElement('button');
            minus.className = 'small';
            minus.textContent = '−';
            minus.setAttribute('aria-label', 'Remove ' + label);

            minus.onclick = () => {
                creature[key] = Math.max(0, creature[key] - 1);

                if (creature.isUugguu) {
                    state.uTokens = totalBucket(creature);
                }

                render();
            };

            const plus = document.createElement('button');
            plus.className = 'small';
            plus.textContent = '+';
            plus.setAttribute('aria-label', 'Add ' + label);

            plus.onclick = () => {
                creature[key]++;

                if (creature.isUugguu) {
                    state.uTokens = totalBucket(creature);
                }

                render();
            };

            row.append(minus, plus);
            bucket.append(row);
            grid.append(bucket);
        });

        element.append(grid);

        const controls = document.createElement('div');
        controls.className = 'row';
        controls.style.marginTop = '9px';

        const addPair = document.createElement('button');
        addPair.className = 'small';
        addPair.textContent = 'Add 2 tokens';

        addPair.onclick = () => {
            applyNewTokens(creature, 2);

            if (creature.isUugguu) {
                state.uTokens = totalBucket(creature);
            }

            render();
        };

        const tapOne = document.createElement('button');
        tapOne.className = 'small';
        tapOne.textContent = 'Tap 1';
        tapOne.disabled = creature.untapped < 1;

        tapOne.onclick = () => {
            creature.untapped = Math.max(0, creature.untapped - 1);
            creature.tapped++;
            render();
        };

        const untapOne = document.createElement('button');
        untapOne.className = 'small';
        untapOne.textContent = 'Untap 1';
        untapOne.disabled = creature.tapped < 1;

        untapOne.onclick = () => {
            creature.tapped = Math.max(0, creature.tapped - 1);
            creature.untapped++;
            render();
        };

        const untapAll = document.createElement('button');
        untapAll.className = 'small';
        untapAll.textContent = 'Untap all';

        untapAll.onclick = () => {
            creature.untapped += creature.tapped;
            creature.tapped = 0;
            render();
        };

        const remove = document.createElement('button');
        remove.className = 'small danger';
        remove.textContent = 'Remove card';

        remove.onclick = () => {
            state.creatures.splice(index, 1);
            render();
        };

        controls.append(addPair, tapOne, untapOne, untapAll, remove);
        element.append(controls);
        root.append(element);
    });
}


// Blue devotion


function renderDevotion() {
    let otherDevotion = 0;

    for (const creature of state.creatures) {
        if (!creature.isUugguu) {
            otherDevotion +=
                totalBucket(creature) * int(creature.bluePips);
        }
    }

    $('otherDevotion').textContent = otherDevotion;


    $('totalDevotion').textContent =
        totalU() + otherDevotion + int(state.extraDevotion) + 2;
}

// Uugguu token synchronization


function findUugguuCreature() {
    return state.creatures.find(creature =>
        creature.isUugguu ||
        creature.name.toLowerCase() === 'uugguu, the omniplasm'
    );
}

function syncUugguuBuckets() {
    let creature = findUugguuCreature();

    if (!creature) {
        creature = makeBuckets();
        creature.name = 'Uugguu token copies';
        creature.isUugguu = true;
        creature.bluePips = 1;
        creature.manaCost = '{B}{G}{U}';
        creature.typeLine = 'Token copies of Uugguu';
        state.creatures.push(creature);
    }

    const current = totalBucket(creature);
    const desired = state.uTokens;

    if (current < desired) {
        applyNewTokens(creature, desired - current);
    } else if (current > desired) {
        let remaining = current - desired;

        for (const key of ['tapped', 'untapped']) {
            const removed = Math.min(creature[key], remaining);
            creature[key] -= removed;
            remaining -= removed;

            if (!remaining) break;
        }
    }
}

function setUugguuTokenCount(count) {
    state.uTokens = int(count);
    syncUugguuBuckets();
}

function removeAllUugguuCards() {
    state.creatures = state.creatures.filter(creature =>
        !creature.isUugguu &&
        creature.name.toLowerCase() !== 'uugguu, the omniplasm'
    );
}


// Uugguu death and legend rule


function uugguuDies() {
    if (state.original < 1) {
        state.lastDeath = 'No original Uugguu to remove.';
        render();
        return;
    }

    // The dying original does not trigger for itself.
    const triggers = Math.max(0, totalU() - 1);
    const created = 2 * triggers;

    state.original = 0;
    setUugguuTokenCount(state.uTokens + created);

    state.lastDeath =
        `Original Uugguu died. Created ${created} Uugguu tokens.`;

    render();
}

function legendRuleDies() {
    // A new legendary Uugguu enters and dies to the legend rule.
    // All existing Uugguu sources see the new nontoken Ooze die.
    const triggers = totalU();
    const created = 2 * triggers;

    setUugguuTokenCount(state.uTokens + created);

    state.lastDeath =
        `Legend rule resolved. Created ${created} Uugguu tokens.`;

    render();
}

// Non-exile board wipe


function boardWipe() {
    const oldOriginal = state.original;
    const oldCopies = state.uCopies;
    const oldTokens = state.uTokens;

    const nontokenDying = oldOriginal + oldCopies;

    // Each Uugguu source triggers for each other qualifying
    // nontoken Uugguu dying. Token Uugguus also see nontoken
    // Uugguu deaths, but token deaths do not trigger the ability.
    const triggers = Math.max(
        0,
        nontokenDying * (nontokenDying - 1) +
        oldTokens * nontokenDying
    );

    const created = triggers * 2;

    state.original = 0;
    state.uCopies = 0;
    state.uTokens = 0;

    removeAllUugguuCards();

    // Other tracked creature tokens die in the wipe too.
    for (const creature of state.creatures) {
        creature.untapped = 0;
        creature.tapped = 0;
    }

    // Uugguu tokens created by the death triggers survive.
    if (created > 0) {
        state.uTokens = created;
        syncUugguuBuckets();
    }

    state.lastDeath = '';
    render();
}


// Scryfall card lookup


function bluePips(cost) {
    return (cost.match(/U/g) || []).length;
}

async function fetchCard(name) {
    const url =
        'https://api.scryfall.com/cards/named?fuzzy=' +
        encodeURIComponent(name);

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error('Card not found');
    }

    const card = await response.json();

    const face = card.card_faces?.[0];
    const manaCost = card.mana_cost || face?.mana_cost || '';

    const image =
        card.image_uris?.normal ||
        face?.image_uris?.normal ||
        '';

    return {
        name: card.name,
        typeLine: card.type_line || '',
        manaCost,
        bluePips: bluePips(manaCost),
        image,
        isUugguu:
            card.name.toLowerCase() === 'uugguu, the omniplasm'
    };
}

// Add a creature to the tracker


function addByName(name, data = {}) {
    if (!name.trim()) return;

    const existing = state.creatures.find(creature =>
        creature.name.toLowerCase() === name.trim().toLowerCase()
    );

    if (existing) {
        $('searchStatus').textContent =
            'That creature is already being tracked.';
        return;
    }

    const creature = {
        ...makeBuckets(),
        name: name.trim(),
        ...data
    };

    if (creature.isUugguu) {
        creature.isUugguu = true;
        creature.bluePips = 1;
        state.uTokens = totalBucket(creature);
    }

    state.creatures.push(creature);
    $('cardName').value = '';
    render();
}


// Button and input handlers


$('origMinus').onclick = () => {
    state.original = Math.max(0, state.original - 1);
    render();
};

$('origPlus').onclick = () => {
    state.original = Math.min(1, state.original + 1);
    render();
};

$('copyMinus').onclick = () => {
    state.uCopies = Math.max(0, state.uCopies - 1);
    render();
};

$('copyPlus').onclick = () => {
    state.uCopies++;
    render();
};

$('uMinus').onclick = () => {
    setUugguuTokenCount(state.uTokens - 1);
    render();
};

$('uPlus').onclick = () => {
    setUugguuTokenCount(state.uTokens + 1);
    render();
};

$('uugDies').onclick = uugguuDies;
$('legendDies').onclick = legendRuleDies;

$('wipe').onclick = () => {
    if (confirm('Resolve a non-exile board wipe?')) {
        boardWipe();
    }
};

$('ritualists').oninput = () => calcRitualist();

$('extraDevotion').oninput = event => {
    state.extraDevotion = int(event.target.value);
    renderDevotion();
    save();
};

$('addCreature').onclick = async () => {
    const name = $('cardName').value.trim();
    if (!name) return;

    $('searchStatus').textContent = 'Searching Scryfall…';

    try {
        const data = await fetchCard(name);
        addByName(data.name, data);
        $('searchStatus').textContent =
            'Added ' + data.name + ' from Scryfall.';
    } catch (error) {
        $('searchStatus').textContent =
            'Scryfall search failed. You can add the name manually; ' +
            'blue pips will default to 0.';
    }
};

$('manualAdd').onclick = () => {
    addByName($('cardName').value);
};

$('cardName').addEventListener('keydown', event => {
    if (event.key === 'Enter') {
        $('addCreature').click();
    }
});

$('resetAll').onclick = () => {
    if (confirm('Reset all tracker state?')) {
        localStorage.removeItem(STORAGE);

        state = {
            original: 0,
            uCopies: 0,
            uTokens: 0,
            ritualists: 0,
            extraDevotion: 0,
            creatures: [],
            lastDeath:
                'Tracker reset. All counters are zero and all tracked tokens have been cleared.'
        };

        render();
    }
};

// Startup and saved-state cleanup


load();

state.original = Math.min(1, int(state.original));
state.uCopies = int(state.uCopies);
state.uTokens = int(state.uTokens);
state.ritualists = int(state.ritualists);
state.extraDevotion = int(state.extraDevotion);

state.creatures = state.creatures.map(creature => ({
    ...makeBuckets(),
    ...creature,
    untapped: int(
        creature.untapped ??
        ((creature.tuS || 0) + (creature.tuN || 0))
    ),
    tapped: int(
        creature.tapped ??
        ((creature.taS || 0) + (creature.taN || 0))
    ),
    bluePips: int(creature.bluePips)
}));

syncUugguuBuckets();
render();