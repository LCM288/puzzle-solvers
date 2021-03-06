// ==UserScript==
// @name         Sudoku Solver
// @namespace    https://github.com/LCM288/puzzle-solvers
// @version      0.1
// @description  Solve sudoku
// @author       Charlie Li
// @include      /^https://www\.puzzle(-jigsaw)?\-sudoku\.com/(\?size=\d*)?$/
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(function() {
  "use strict";
  if (window.Game.sandwichTask.length) {
    // not solving sandwich sudoku
    return;
  }
  const numbers = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G"
  ];
  const indices = {
    "1": 0,
    "2": 1,
    "3": 2,
    "4": 3,
    "5": 4,
    "6": 5,
    "7": 6,
    "8": 7,
    "9": 8,
    A: 9,
    B: 10,
    C: 11,
    D: 12,
    E: 13,
    F: 14,
    G: 15
  };
  const countBits = n => {
    let bits = 0;
    let tmp = n;
    while (tmp) {
      tmp -= tmp & -tmp;
      bits++;
    }
    return bits;
  };
  const areaPoints = window.Game.areaPoints;
  const areas = window.Game.areas.map(row => row.map(area => parseInt(area)));

  const size = window.Game.currentState.cellStatus.length;
  const bitSequence = [...Array(1 << size).keys()].sort(
    (a, b) => countBits(a) - countBits(b)
  );
  const possibleNumber = window.Game.currentState.cellStatus.map(row =>
    row.map(cell => (cell.number ? 1 << indices[cell.number] : (1 << size) - 1))
  );
  const solvedBits = {
    row: [...Array(size).keys()].map(_i => []),
    col: [...Array(size).keys()].map(_i => []),
    area: areaPoints.map(_i => [])
  };
  const isUpdated = possibleNumber.map(row => row.map(_cell => false));
  const updatedQueue = [];
  const insertUpdatedQueue = (row, col) => {
    if (!isUpdated[row][col]) {
      updatedQueue.push([row, col]);
      isUpdated[row][col] = true;
    }
  };
  possibleNumber.forEach((row, i) => {
    row.forEach((cell, j) => {
      if (cell === (cell & -cell)) {
        insertUpdatedQueue(i, j);
      }
    });
  });
  const smartEliminate = (cells, solvedBits) => {
    const filteredBitSequence = bitSequence.filter(
      bits => !solvedBits.some(bitsB => (bitsB & bits) === bitsB)
    );
    for (let i in filteredBitSequence) {
      const bits = filteredBitSequence[i];
      let countSubset = 0;
      for (let j in cells) {
        const [row, col] = cells[j];
        if ((bits & possibleNumber[row][col]) === possibleNumber[row][col]) {
          countSubset++;
        }
      }
      if (countSubset === countBits(bits)) {
        const mask = ((1 << size) - 1) ^ bits;
        let changed = false;
        for (let j in cells) {
          const [row, col] = cells[j];
          if ((bits & possibleNumber[row][col]) !== possibleNumber[row][col]) {
            if (
              (possibleNumber[row][col] & mask) !==
              possibleNumber[row][col]
            ) {
              possibleNumber[row][col] &= mask;
              changed = true;
              insertUpdatedQueue(row, col);
            }
          }
        }
        if (changed) {
          solvedBits.push(bits);
          return;
        }
      }
    }
  };
  const eliminateAndFill = () => {
    while (updatedQueue.length) {
      const [row, col] = updatedQueue.shift();
      isUpdated[row][col] = false;
      // row
      smartEliminate(
        [...Array(size).keys()].map(i => [row, i]),
        solvedBits.row[row]
      );
      // column
      smartEliminate(
        [...Array(size).keys()].map(i => [i, col]),
        solvedBits.col[col]
      );
      // area
      smartEliminate(
        areaPoints[areas[row][col]].map(({ row: i, col: j }) => [i, j]),
        solvedBits.area[areas[row][col]]
      );
      if (!updatedQueue.length) {
        // row x area
        for (let i = 0; i < size; i++) {
          const intersect = areaPoints.map(() => false);
          for (let j = 0; j < size; j++) {
            intersect[areas[i][j]] = true;
          }
          for (let j in intersect) {
            if (!intersect[j]) {
              continue;
            }
            let mask = 0;
            // eliminate area
            for (let k = 0; k < size; k++) {
              // in row i but not in area j
              if (areas[i][k] === parseInt(j)) {
                continue;
              }
              mask |= possibleNumber[i][k];
            }
            for (let k in areaPoints[j]) {
              const { row, col } = areaPoints[j][k];
              // in area j but not in row i
              if (row === i) {
                continue;
              }
              if (
                (possibleNumber[row][col] & mask) !==
                possibleNumber[row][col]
              ) {
                possibleNumber[row][col] &= mask;
                insertUpdatedQueue(row, col);
              }
            }
            // eliminate row
            mask = 0;
            for (let k in areaPoints[j]) {
              const { row, col } = areaPoints[j][k];
              // in area j but not in row i
              if (row === i) {
                continue;
              }
              mask |= possibleNumber[row][col];
            }
            for (let k = 0; k < size; k++) {
              // in row i but not in area j
              if (areas[i][k] === parseInt(j)) {
                continue;
              }
              if ((possibleNumber[i][k] & mask) !== possibleNumber[i][k]) {
                possibleNumber[i][k] &= mask;
                insertUpdatedQueue(i, k);
              }
            }
          }
        }
        // column x area
        for (let i = 0; i < size; i++) {
          const intersect = areaPoints.map(() => false);
          for (let j = 0; j < size; j++) {
            intersect[areas[j][i]] = true;
          }
          for (let j in intersect) {
            if (!intersect[j]) {
              continue;
            }
            let mask = 0;
            // eliminate area
            for (let k = 0; k < size; k++) {
              // in column i but not in area j
              if (areas[k][i] === parseInt(j)) {
                continue;
              }
              mask |= possibleNumber[k][i];
            }
            for (let k in areaPoints[j]) {
              const { row, col } = areaPoints[j][k];
              // in area j but not in column i
              if (col === i) {
                continue;
              }
              if (
                (possibleNumber[row][col] & mask) !==
                possibleNumber[row][col]
              ) {
                possibleNumber[row][col] &= mask;
                insertUpdatedQueue(row, col);
              }
            }
            // eliminate column
            mask = 0;
            for (let k in areaPoints[j]) {
              const { row, col } = areaPoints[j][k];
              // in area j but not in column i
              if (col === i) {
                continue;
              }
              mask |= possibleNumber[row][col];
            }
            for (let k = 0; k < size; k++) {
              // in column i but not in area j
              if (areas[k][i] === parseInt(j)) {
                continue;
              }
              if ((possibleNumber[k][i] & mask) !== possibleNumber[k][i]) {
                possibleNumber[k][i] &= mask;
                insertUpdatedQueue(k, i);
              }
            }
          }
        }
      }
    }
  };
  let iterationCount = 0;
  const checkValid = () => {
    // row
    for (let i = 0; i < size; i++) {
      let sum = 0;
      for (let j = 0; j < size; j++) {
        switch (countBits(possibleNumber[i][j])) {
          case 0:
            return false;
          case 1:
            if (possibleNumber[i][j] & sum) {
              return false;
            }
            sum |= possibleNumber[i][j];
            break;
          default:
        }
      }
    }
    // col
    for (let j = 0; j < size; j++) {
      let sum = 0;
      for (let i = 0; i < size; i++) {
        switch (countBits(possibleNumber[i][j])) {
          case 0:
            return false;
          case 1:
            if (possibleNumber[i][j] & sum) {
              return false;
            }
            sum |= possibleNumber[i][j];
            break;
          default:
        }
      }
    }
    // area
    for (let i in areaPoints) {
      let sum = 0;
      for (let j in areaPoints[i]) {
        const { row, col } = areaPoints[i][j];
        switch (countBits(possibleNumber[row][col])) {
          case 0:
            return false;
          case 1:
            if (possibleNumber[row][col] & sum) {
              return false;
            }
            sum |= possibleNumber[row][col];
            break;
          default:
        }
      }
    }
    return true;
  };
  const exhaustiveSearch = () => {
    iterationCount++;
    eliminateAndFill();
    if (!checkValid()) {
      return false;
    }
    const localPossibleNumber = possibleNumber.map(row => [...row]);
    const localSolvedBits = {
      row: [...solvedBits.row],
      col: [...solvedBits.col],
      area: [...solvedBits.area]
    };
    let minBitsPos = { row: 0, col: 0 };
    let minBits = 10;
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        let numberOfBits = countBits(possibleNumber[i][j]);
        if (numberOfBits !== 1 && numberOfBits <= minBits) {
          minBits = numberOfBits;
          minBitsPos = { row: i, col: j };
        }
      }
    }
    if (minBits === 10) {
      return true;
    }
    if (minBits === 0) {
      return false;
    }
    const { row, col } = minBitsPos;
    let bits = possibleNumber[row][col];
    while (bits) {
      const lowestBit = bits & -bits;
      possibleNumber[row][col] = lowestBit;
      insertUpdatedQueue(row, col);
      if (exhaustiveSearch()) {
        return true;
      } else {
        localPossibleNumber[row][col] -= lowestBit;
        for (let k = 0; k < size; k++) {
          possibleNumber[k] = [...localPossibleNumber[k]];
        }
        solvedBits.row = [...localSolvedBits.row];
        solvedBits.col = [...localSolvedBits.col];
        solvedBits.area = [...localSolvedBits.area];
      }
      bits -= lowestBit;
    }
    return false;
  };

  exhaustiveSearch();

  window.document.getElementById("robot").value = true;
  for (let i in possibleNumber) {
    const row = possibleNumber[i];
    for (let j in possibleNumber) {
      const cell = row[j];
      const cellStatusOfCell = window.Game.currentState.cellStatus[i][j];
      if (!cellStatusOfCell.immutable) {
        if (countBits(cell) === 1) {
          cellStatusOfCell.number = numbers[Math.log2(cell)];
          cellStatusOfCell.pencil = false;
        } else {
          cellStatusOfCell.pencil = true;
          cellStatusOfCell.pencilNumbers = [];
          let x = cell;
          while (x) {
            let lowestBit = x & -x;
            cellStatusOfCell.pencilNumbers.push(numbers[Math.log2(lowestBit)]);
            x -= lowestBit;
          }
        }
      }
    }
  }
  window.Game.drawCurrentState();
  window.document.getElementById("btnReady").click();
  const div = document.createElement("div");
  div.innerText =
    iterationCount === 1 ? "1 iteration" : `${iterationCount} iterations`;
  document.getElementById("pageContent").prepend(div);
})();
