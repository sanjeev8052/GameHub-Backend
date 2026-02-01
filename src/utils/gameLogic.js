export const WORD_DICTIONARY = [
    "APPLE", "BANANA", "CHERRY", "DRAGON", "ELDER", "FLOWER", "GALAXY", "HONEY", "ISLAND", "JUNGLE",
    "KNIGHT", "LEMON", "MAGIC", "NATURE", "ORANGE", "PLANET", "QUEEN", "RIVER", "SILVER", "TIGER",
    "URANUS", "VALLEY", "WINTER", "YELLOW", "ZEBRA", "BRAVE", "CLOUD", "DREAM", "EAGLE", "FROST",
    "GHOST", "HEART", "INDUS", "JOLLY", "KOALA", "LIGHT", "MOON", "NIGHT", "OCEAN", "PEARL",
    "QUARK", "ROBOT", "STORM", "TRAIN", "UNITY", "VISTA", "WATER", "XENON", "YACHT", "ZONE"
];

export function validateWin(board, calledNumbers) {
    const gridSize = 5;
    const markedArray = board.map((num) => calledNumbers.includes(num));

    let lines = [];

    // Rows
    for (let i = 0; i < gridSize; i++) {
        let rowWin = true;
        for (let j = 0; j < gridSize; j++) {
            if (!markedArray[i * gridSize + j]) {
                rowWin = false;
                break;
            }
        }
        if (rowWin) lines.push({ type: 'row', index: i });
    }

    // Columns
    for (let i = 0; i < gridSize; i++) {
        let colWin = true;
        for (let j = 0; j < gridSize; j++) {
            if (!markedArray[j * gridSize + i]) {
                colWin = false;
                break;
            }
        }
        if (colWin) lines.push({ type: 'col', index: i });
    }

    // Diagonals
    let diag1 = true;
    let diag2 = true;
    for (let i = 0; i < gridSize; i++) {
        if (!markedArray[i * gridSize + i]) diag1 = false;
        if (!markedArray[i * gridSize + (gridSize - 1 - i)]) diag2 = false;
    }
    if (diag1) lines.push({ type: 'diag', index: 0 }); // top-left to bottom-right
    if (diag2) lines.push({ type: 'diag', index: 1 }); // top-right to bottom-left

    return {
        isWin: lines.length >= 5,
        lines: lines
    };
}

export function generateWordSearchPuzzle(size) {
    let grid = Array(size)
        .fill()
        .map(() => Array(size).fill(""));
    let selectedWords = [...WORD_DICTIONARY]
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.min(size + 2, WORD_DICTIONARY.length));
    let placedWords = [];

    selectedWords.forEach((word) => {
        if (tryPlaceWord(grid, word, size)) placedWords.push(word);
    });

    // Fill empty
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (grid[r][c] === "")
                grid[r][c] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        }
    }
    return { grid, words: placedWords };
}

function tryPlaceWord(grid, word, size) {
    const directions = [
        [0, 1], [1, 0], [1, 1], [1, -1],
        [0, -1], [-1, 0], [-1, -1], [-1, 1],
    ];
    for (let attempt = 0; attempt < 50; attempt++) {
        const d = directions[Math.floor(Math.random() * directions.length)];
        const r = Math.floor(Math.random() * size);
        const c = Math.floor(Math.random() * size);
        if (canPlace(grid, word, r, c, d, size)) {
            for (let i = 0; i < word.length; i++)
                grid[r + d[0] * i][c + d[1] * i] = word[i];
            return true;
        }
    }
    return false;
}

function canPlace(grid, word, r, c, d, size) {
    for (let i = 0; i < word.length; i++) {
        const nr = r + d[0] * i,
            nc = c + d[1] * i;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) return false;
        if (grid[nr][nc] !== "" && grid[nr][nc] !== word[i]) return false;
    }
    return true;
}

export function generateBingoBoard() {
    const numbers = Array.from({ length: 25 }, (_, i) => i + 1);
    for (let i = numbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    return numbers;
}
