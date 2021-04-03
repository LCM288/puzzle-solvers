// ==UserScript==
// @name         Nurikabe Solver
// @namespace    https://github.com/LCM288/puzzle-solvers
// @version      0.1
// @description  Solve Nurikabe
// @author       Charlie Li
// @include      /^https://www\.puzzle\-nurikabe\.com/(\?size=\d*)?$/
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(function() {
  "use strict";
  const tasks = window.Game.task
    .flatMap((row, i) =>
      row.map((cell, j) => (cell > 0 ? { row: i, col: j, number: cell } : null))
    )
    .filter(x => x);
  let board = window.Game.task.map(row => row.map(cell => cell + 1));
  const maxBlacks =
    board
      .map(row => row.filter(cell => cell >= 0).length)
      .reduce((a, b) => a + b, 0) -
    tasks.reduce((a, { number: b }) => a + b, 0);
  let blackCount = 0;
  const width = board[0].length;
  const height = board.length;
  const directions = [
    { dx: -1, dy: 0 },
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: 1, dy: 0 }
  ];
  let components = board.map(row => row.map(() => ({})));
  let whiteComponents = tasks.map((_task, i) => ({
    index: i,
    count: 0,
    neighbours: []
  }));
  let blackComponents = [];
  let isUpdated = board.map(row => row.map(() => false));
  let updatedQueue = [];
  const insertUpdate = (row, col) => {
    if (isUpdated[row][col]) {
      return;
    }
    isUpdated[row][col] = true;
    updatedQueue.push({ row, col });
  };
  const unionNeighbours = (x, y) => {
    const arr = [];
    for (let i in x) {
      const { row, col } = x[i];
      if (!arr[row]) {
        arr[row] = [];
      }
      arr[row][col] = x[i];
    }
    for (let i in y) {
      const { row, col } = y[i];
      if (!arr[row]) {
        arr[row] = [];
      }
      arr[row][col] = y[i];
    }
    const res = [];
    for (let row in arr) {
      for (let col in arr[row]) {
        res.push({ row: parseInt(row), col: parseInt(col) });
      }
    }
    return res;
  };
  const findBlackComponent = index => {
    if (blackComponents[index].index !== index) {
      blackComponents[index] = findBlackComponent(blackComponents[index].index);
    }
    return blackComponents[index];
  };
  const isValidPos = (row, col) =>
    0 <= row &&
    row < height &&
    0 <= col &&
    col < width &&
    board[row][col] !== -1;
  const fillWhite = (row, col, index) => {
    if (board[row][col] === 1 || board[row][col] === -1) {
      return;
    }
    board[row][col] = 2;
    components[row][col] = { white: index };
    if (index !== -1) {
      whiteComponents[index].count++;
    }
    for (let i in directions) {
      const { dx, dy } = directions[i];
      const newRow = row + dy;
      const newCol = col + dx;
      if (isValidPos(newRow, newCol)) {
        const { white, black } = components[newRow][newCol];
        if (white === -1) {
          if (index !== -1) {
            fillWhite(newRow, newCol, index);
          }
        } else if (white !== undefined) {
          const neighboursIndex = whiteComponents[white].neighbours.findIndex(
            ({ row: neighbourRow, col: neighbourCol }) =>
              row === neighbourRow && col === neighbourCol
          );
          if (neighboursIndex !== -1) {
            whiteComponents[white].neighbours.splice(neighboursIndex, 1);
          }
          if (index === -1) {
            fillWhite(row, col, white);
            break;
          }
        } else if (black !== undefined) {
          findBlackComponent(black);
          const neighboursIndex = blackComponents[black].neighbours.findIndex(
            ({ row: neighbourRow, col: neighbourCol }) =>
              row === neighbourRow && col === neighbourCol
          );
          if (neighboursIndex !== -1) {
            blackComponents[black].neighbours.splice(neighboursIndex, 1);
          }
        } else if (index !== -1) {
          if (
            !whiteComponents[index].neighbours.find(
              ({ row: neighboursRow, col: neighboursCol }) =>
                neighboursRow === newRow && neighboursCol === newCol
            )
          ) {
            whiteComponents[index].neighbours.push({
              row: newRow,
              col: newCol
            });
          }
        }
      }
    }
    insertUpdate(row, col);
  };
  const fillBlack = (row, col) => {
    if (board[row][col]) {
      return;
    }
    const newIndex = blackComponents.length;
    blackComponents.push({ index: newIndex, neighbours: [] });
    blackCount++;
    board[row][col] = 1;
    components[row][col] = { black: newIndex };
    for (let i in directions) {
      const { dx, dy } = directions[i];
      const newRow = row + dy;
      const newCol = col + dx;
      if (isValidPos(newRow, newCol)) {
        const { white, black } = components[newRow][newCol];
        if (white === -1) {
          continue;
        } else if (white !== undefined) {
          const neighboursIndex = whiteComponents[white].neighbours.findIndex(
            ({ row: neighbourRow, col: neighbourCol }) =>
              row === neighbourRow && col === neighbourCol
          );
          if (neighboursIndex !== -1) {
            whiteComponents[white].neighbours.splice(neighboursIndex, 1);
          }
        } else if (black !== undefined) {
          findBlackComponent(black);
          findBlackComponent(newIndex);
          const neighboursIndex = blackComponents[black].neighbours.findIndex(
            ({ row: neighbourRow, col: neighbourCol }) =>
              row === neighbourRow && col === neighbourCol
          );
          if (neighboursIndex !== -1) {
            blackComponents[black].neighbours.splice(neighboursIndex, 1);
          }
          blackComponents[black].neighbours = unionNeighbours(
            blackComponents[black].neighbours,
            blackComponents[newIndex].neighbours
          );
          blackComponents[blackComponents[newIndex].index] =
            blackComponents[black];
          continue;
        } else {
          findBlackComponent(newIndex);
          if (
            !blackComponents[newIndex].neighbours.find(
              ({ row: neighboursRow, col: neighboursCol }) =>
                neighboursRow === newRow && neighboursCol === newCol
            )
          ) {
            blackComponents[newIndex].neighbours.push({
              row: newRow,
              col: newCol
            });
          }
        }
      }
    }
    insertUpdate(row, col);
  };
  for (let i in tasks) {
    const { row, col } = tasks[i];
    fillWhite(row, col, parseInt(i));
  }
  const fillAllNeighboursBlack = index => {
    const neighbours = [...whiteComponents[index].neighbours];
    for (let i in neighbours) {
      const { row, col } = neighbours[i];
      fillBlack(row, col);
    }
  };
  const fillUnreachable = () => {
    const reachable = board.map(row => row.map(() => false));
    const walkable = board.map((row, i) =>
      row.map(
        (cell, j) => cell === 0 || (cell === 2 && components[i][j].white === -1)
      )
    );
    for (let i in tasks) {
      for (let j in whiteComponents[i].neighbours) {
        const { row, col } = whiteComponents[i].neighbours[j];
        walkable[row][col] = false;
      }
    }
    const dist = board.map(row => row.map(() => 1000));
    let bfsQueue = [];
    let clearDistQueue = [];
    for (let i in tasks) {
      bfsQueue = [...whiteComponents[i].neighbours];
      bfsQueue.forEach(({ row, col }) => {
        dist[row][col] = 1;
      });
      clearDistQueue = [...whiteComponents[i].neighbours];
      while (bfsQueue.length) {
        const { row, col } = bfsQueue.shift();
        if (dist[row][col] + whiteComponents[i].count > tasks[i].number) {
          break;
        }
        reachable[row][col] = true;
        for (let j in directions) {
          const { dx, dy } = directions[j];
          const newRow = row + dy;
          const newCol = col + dx;
          if (
            isValidPos(newRow, newCol) &&
            dist[row][col] + 1 < dist[newRow][newCol]
          ) {
            dist[newRow][newCol] = dist[row][col] + 1;
            bfsQueue.push({ row: newRow, col: newCol });
            clearDistQueue.push({ row: newRow, col: newCol });
          }
        }
      }
      clearDistQueue.forEach(({ row, col }) => {
        dist[row][col] = 1000;
      });
    }
    for (let i in board) {
      for (let j in board[i]) {
        if (board[i][j] === 0 && !reachable[i][j]) {
          fillBlack(parseInt(i), parseInt(j));
        }
        if (components[i][j].white === -1 && !reachable[i][j]) {
          return false;
        }
      }
    }
    return true;
  };
  const naiveFill = () => {
    const checkOnlyOnePossibleMove = (row, col) => {
      const { white, black } = components[row][col];
      if (white !== undefined && white !== -1) {
        if (
          whiteComponents[white].neighbours.length === 1 &&
          whiteComponents[white].count < tasks[white].number
        ) {
          const { row: fillRow, col: fillCol } = whiteComponents[
            white
          ].neighbours[0];
          fillWhite(fillRow, fillCol, white);
        }
      } else if (black !== undefined && blackCount < maxBlacks) {
        findBlackComponent(black);
        if (blackComponents[black].neighbours.length === 1) {
          const { row: fillRow, col: fillCol } = blackComponents[
            black
          ].neighbours[0];
          fillBlack(fillRow, fillCol);
        }
      }
    };
    while (updatedQueue.length) {
      const { row, col } = updatedQueue.shift();
      isUpdated[row][col] = false;
      const { white, black } = components[row][col];
      if (white !== undefined && white !== -1) {
        if (whiteComponents[white].count === tasks[white].number) {
          fillAllNeighboursBlack(white);
        } else {
          const neighbours = [...whiteComponents[white].neighbours];
          for (let i in neighbours) {
            const { row: neighbourRow, col: neighbourCol } = neighbours[i];
            for (let j in directions) {
              const { dx, dy } = directions[j];
              const newRow = neighbourRow + dy;
              const newCol = neighbourCol + dx;
              if (isValidPos(newRow, newCol)) {
                const { white: neighboursWhite } = components[newRow][newCol];
                if (
                  neighboursWhite in whiteComponents &&
                  neighboursWhite !== white &&
                  neighboursWhite !== -1
                ) {
                  fillBlack(neighbourRow, neighbourCol);
                  break;
                }
              }
            }
          }
        }
      } else if (black !== undefined) {
        for (let i in directions) {
          const { dx, dy } = directions[i];
          const newRow = row + dy;
          const newCol = col + dx;
          if (!isValidPos(newRow, newCol)) {
            continue;
          }
          const { black: blackNeighbour } = components[newRow][newCol];
          if (blackNeighbour !== undefined) {
            if (dx) {
              if (
                isValidPos(newRow - 1, newCol) &&
                "black" in components[newRow - 1][newCol] &&
                !("white" in components[newRow - 1][col])
              ) {
                if ("black" in components[newRow - 1][col]) {
                  return false;
                }
                fillWhite(newRow - 1, col, -1);
                break;
              }
              if (
                isValidPos(newRow + 1, newCol) &&
                "black" in components[newRow + 1][newCol] &&
                !("white" in components[newRow + 1][col])
              ) {
                if ("black" in components[newRow + 1][col]) {
                  return false;
                }
                fillWhite(newRow + 1, col, -1);
                break;
              }
            } else {
              if (
                isValidPos(newRow, newCol - 1) &&
                "black" in components[newRow][newCol - 1] &&
                !("white" in components[row][newCol - 1])
              ) {
                if ("black" in components[row][newCol - 1]) {
                  return false;
                }
                fillWhite(row, newCol - 1, -1);
                break;
              }
              if (
                isValidPos(newRow, newCol + 1) &&
                "black" in components[newRow][newCol + 1] &&
                !("white" in components[row][newCol + 1])
              ) {
                if ("black" in components[row][newCol + 1]) {
                  return false;
                }
                fillWhite(row, newCol + 1, -1);
                break;
              }
            }
          }
        }
      } else if (white !== -1) {
        console.error("really?");
      }
      checkOnlyOnePossibleMove(row, col);
      for (let i in directions) {
        const { dx, dy } = directions[i];
        const newRow = row + dy;
        const newCol = col + dx;
        if (isValidPos(newRow, newCol)) {
          checkOnlyOnePossibleMove(newRow, newCol);
        }
      }
      if (!updatedQueue.length) {
        if (!fillUnreachable()) {
          return false;
        }
      }
    }
    return true;
  };
  let iterationCount = 0;
  let threshold = 1000000;
  const isValid = () => {
    for (let i in whiteComponents) {
      const component = whiteComponents[i];
      if (
        (component.neighbours.length === 0 &&
          component.count !== tasks[i].number) ||
        component.count > tasks[i].number
      ) {
        return false;
      }
    }
    {
      let allIndexSame = true;
      let someNeighboursEmpty = false;
      for (let i in blackComponents) {
        findBlackComponent(parseInt(i));
        allIndexSame &= blackComponents[i].index === blackComponents[0].index;
        someNeighboursEmpty |= blackComponents[i].neighbours.length === 0;
      }
      if (someNeighboursEmpty && (!allIndexSame || blackCount !== maxBlacks)) {
        return false;
      }
    }
    for (let i in components) {
      for (let j in components[i]) {
        const { white } = components[i][j];
        if (white === undefined) {
          continue;
        }
        let countNeighbours = 0;
        for (let k in directions) {
          const { dx, dy } = directions[k];
          const newRow = parseInt(i) + dy;
          const newCol = parseInt(j) + dx;
          if (isValidPos(newRow, newCol)) {
            const { white: neighbourWhite, black: neighbourBlack } = components[
              newRow
            ][newCol];
            if (neighbourWhite in whiteComponents && white !== neighbourWhite) {
              return false;
            }
            if (neighbourBlack === undefined) {
              countNeighbours++;
            }
          }
        }
        if (white === -1 && countNeighbours === 0) {
          return false;
        }
      }
    }
    for (let i in components) {
      for (let j in components[i]) {
        if (
          !isValidPos(parseInt(i), parseInt(j) + 1) ||
          !isValidPos(parseInt(i) + 1, parseInt(j)) ||
          !isValidPos(parseInt(i) + 1, parseInt(j) + 1)
        ) {
          continue;
        }
        {
          const { black } = components[i][j];
          if (black === undefined) {
            continue;
          }
        }
        {
          const { black } = components[i][parseInt(j) + 1];
          if (black === undefined) {
            continue;
          }
        }
        {
          const { black } = components[parseInt(i) + 1][j];
          if (black === undefined) {
            continue;
          }
        }
        {
          const { black } = components[parseInt(i) + 1][parseInt(j) + 1];
          if (black === undefined) {
            continue;
          }
        }
        return false;
      }
    }
    return true;
  };
  const exhaustiveSearch = () => {
    iterationCount++;
    if (iterationCount > threshold) {
      return false;
    }
    if (!naiveFill()) {
      isUpdated = board.map(row => row.map(() => false));
      updatedQueue = [];
      return false;
    }
    if (!isValid()) {
      return false;
    }
    let localBlackCount;
    let localBoard;
    let localComponents;
    let localWhiteComponents;
    let localBlackComponents;
    const copyToLocal = () => {
      localBlackCount = blackCount;
      localBoard = board.map(row => [...row]);
      localComponents = components.map(row => row.map(cell => ({ ...cell })));
      localWhiteComponents = whiteComponents.map(
        ({ index, count, neighbours }) => ({
          index,
          count,
          neighbours: [...neighbours]
        })
      );
      localBlackComponents = blackComponents.map(({ index, neighbours }) => ({
        index,
        neighbours: [...neighbours]
      }));
    };
    const resetComponentsAndBoard = () => {
      blackCount = localBlackCount;
      board = localBoard.map(row => [...row]);
      components = localComponents.map(row => row.map(cell => ({ ...cell })));
      whiteComponents = localWhiteComponents.map(
        ({ index, count, neighbours }) => ({
          index,
          count,
          neighbours: [...neighbours]
        })
      );
      blackComponents = localBlackComponents.map(({ index, neighbours }) => ({
        index,
        neighbours: [...neighbours]
      }));
      for (let i in blackComponents) {
        findBlackComponent(parseInt(i));
      }
    };
    copyToLocal();
    let minWhite = 0;
    let minNeighbourWhite = 1000;
    let minNeighbourWhiteRemain = 1000;
    for (let i in whiteComponents) {
      const component = whiteComponents[i];
      if (component.count === tasks[i].number) {
        continue;
      }
      if (component.neighbours.length < minNeighbourWhite) {
        minWhite = i;
        minNeighbourWhite = component.neighbours.length;
        minNeighbourWhiteRemain = tasks[i].number - component.count;
      } else if (
        component.neighbours.length === minNeighbourWhite &&
        tasks[i].number - component.count < minNeighbourWhiteRemain
      ) {
        minWhite = i;
        minNeighbourWhite = component.neighbours.length;
        minNeighbourWhiteRemain = tasks[i].number - component.count;
      }
    }
    let minBlack = 0;
    let minNeighbourBlack = 1000;
    for (let i in blackComponents) {
      findBlackComponent(parseInt(i));
      const component = blackComponents[i];
      if (
        component.neighbours.length &&
        component.neighbours.length < minNeighbourBlack
      ) {
        minBlack = i;
        minNeighbourBlack = component.neighbours.length;
      }
    }
    if (minNeighbourWhite === 1000) {
      return isValid();
    }
    const isFillBlack = minNeighbourBlack < minNeighbourWhite;
    const component = isFillBlack
      ? blackComponents[minBlack]
      : whiteComponents[minWhite];
    const { row, col } = component.neighbours[0];
    if (isFillBlack) {
      fillBlack(row, col);
    } else {
      fillWhite(row, col, parseInt(minWhite));
    }
    if (exhaustiveSearch()) {
      return true;
    }
    resetComponentsAndBoard();
    if (isFillBlack) {
      fillWhite(row, col, -1);
    } else {
      fillBlack(row, col);
    }
    return exhaustiveSearch();
  };
  exhaustiveSearch();
  window.document.getElementById("robot").value = true;
  for (let i in board) {
    const row = board[i];
    for (let j in row) {
      if (window.Game.task[i][j] > 0) {
        continue;
      }
      window.Game.currentState.cellStatus[i][j] = row[j];
    }
  }
  window.Game.drawCurrentState();
  window.document.getElementById("btnReady").click();
  const div = document.createElement("div");
  div.innerText =
    iterationCount === 1 ? "1 iteration" : `${iterationCount} iterations`;
  document.getElementById("pageContent").prepend(div);
})();
