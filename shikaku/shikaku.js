// ==UserScript==
// @name         Shikaku Solver
// @namespace    https://github.com/LCM288/puzzle-solvers
// @version      0.1
// @description  Solve Shikaku
// @author       Charlie Li
// @include      /^https://www\.puzzle\-shikaku\.com/(\?size=\d*)?$/
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(function() {
  "use strict";
  let tasks = window.Game.task
    .flatMap((row, i) =>
      row.map((cell, j) =>
        cell ? { number: cell, row: i, col: j, finished: false } : null
      )
    )
    .filter(x => x);
  let board = window.Game.task.map(row => row.map(() => -1));
  const height = board.length;
  const width = board[0].length;
  let possibleShikaku = board.map(row => row.map(() => []));
  let possiblePoints = tasks.map(() => []);
  const getBoardSum = () => {
    const boardSum = board.map(row => row.map(cell => (cell !== -1 ? 1 : 0)));
    for (let i = 0; i < boardSum.length; i++) {
      for (let j = 1; j < boardSum[i].length; j++) {
        boardSum[i][j] += boardSum[i][j - 1];
      }
    }
    for (let i = 1; i < boardSum.length; i++) {
      for (let j = 0; j < boardSum[i].length; j++) {
        boardSum[i][j] += boardSum[i - 1][j];
      }
    }
    return boardSum;
  };
  let boardSum = getBoardSum();
  const findSum = (top, bottom, left, right) => {
    const p1 = boardSum[bottom][right];
    const p2 = left ? boardSum[bottom][left - 1] : 0;
    const p3 = top ? boardSum[top - 1][right] : 0;
    const p4 = top && left ? boardSum[top - 1][left - 1] : 0;
    return p1 - p2 - p3 + p4;
  };
  tasks.forEach(({ row, col }, i) => {
    board[row][col] = i;
  });
  const isPlacable = (top, bottom, left, right) => {
    if (top < 0 || left < 0 || bottom >= height || right >= width) {
      return false;
    }
    return findSum(top, bottom, left, right) === 1;
  };
  const findAllShikaku = (width, height, row, col) => {
    const res = [];
    for (let i = row - height + 1; i <= row; i++) {
      for (let j = col - width + 1; j <= col; j++) {
        const top = i;
        const bottom = i + height - 1;
        const left = j;
        const right = j + width - 1;
        if (isPlacable(top, bottom, left, right)) {
          res.push({ top, bottom, left, right });
        }
      }
    }
    return res;
  };
  const fillPossibleShikaku = ({ top, bottom, left, right }, task) => {
    for (let i = top; i <= bottom; i++) {
      for (let j = left; j <= right; j++) {
        possibleShikaku[i][j].push({ top, bottom, left, right, task });
      }
    }
  };
  const findAllPossibilities = () => {
    possibleShikaku = board.map(row => row.map(() => []));
    possiblePoints = tasks.map(() => []);
    boardSum = getBoardSum();
    for (let i in tasks) {
      if (tasks[i].finished) {
        continue;
      }
      for (let j = 1; j * j <= tasks[i].number; j++) {
        if (tasks[i].number % j !== 0) {
          continue;
        }
        let d1 = j;
        let d2 = tasks[i].number / j;
        possiblePoints[i] = possiblePoints[i].concat(
          findAllShikaku(d1, d2, tasks[i].row, tasks[i].col)
        );
        if (d1 !== d2) {
          possiblePoints[i] = possiblePoints[i].concat(
            findAllShikaku(d2, d1, tasks[i].row, tasks[i].col)
          );
        }
      }
      possiblePoints[i].forEach(points =>
        fillPossibleShikaku(points, parseInt(i))
      );
    }
  };
  const fillBoard = ({ top, bottom, left, right }, task) => {
    for (let i = top; i <= bottom; i++) {
      for (let j = left; j <= right; j++) {
        if (board[i][j] !== -1 && board[i][j] !== task) {
          return false;
        }
        board[i][j] = task;
        possibleShikaku[i][j] = [];
      }
    }
    possiblePoints[task] = [];
    tasks[task].finished = true;
    tasks[task].points = { top, bottom, left, right };
    return true;
  };
  const naiveFill = () => {
    let isUpdated = true;
    while (isUpdated) {
      isUpdated = false;
      findAllPossibilities();
      for (let i in possiblePoints) {
        if (possiblePoints[i].length === 1) {
          if (!fillBoard(possiblePoints[i][0], parseInt(i))) {
            return false;
          }
          isUpdated = true;
        }
      }
      for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
          if (possibleShikaku[i][j].length === 1) {
            if (
              !fillBoard(
                possibleShikaku[i][j][0],
                possibleShikaku[i][j][0].task
              )
            ) {
              return false;
            }
            isUpdated = true;
          }
        }
      }
    }
    return true;
  };
  let iterationCount = 0;
  const isValid = () => {
    for (let i in tasks) {
      if (!tasks[i].finished && possiblePoints[i].length === 0) {
        return false;
      }
    }
    for (let i in board) {
      for (let j in board[i]) {
        if (board[i][j] === -1 && possibleShikaku[i][j].length === 0) {
          return false;
        }
      }
    }
    return true;
  };
  const exhaustiveSearch = () => {
    iterationCount++;
    if (!naiveFill()) {
      return false;
    }
    if (!isValid()) {
      return false;
    }
    const localTasks = tasks.map(task => ({ ...task }));
    const localBoard = board.map(row => [...row]);
    const localPossibleShikaku = possibleShikaku.map(row =>
      row.map(shikaku => [...shikaku])
    );
    const localPossiblePoints = possiblePoints.map(points => [...points]);
    for (let i in board) {
      for (let j in board[i]) {
        if (board[i][j] !== -1) {
          continue;
        }
        const shikaku = [...possibleShikaku[i][j]];
        for (let k in shikaku) {
          if (fillBoard(shikaku[k], shikaku[k].task) && exhaustiveSearch()) {
            return true;
          }
          tasks = localTasks.map(task => ({ ...task }));
          board = localBoard.map(row => [...row]);
          possibleShikaku = localPossibleShikaku.map(row =>
            row.map(shikaku => [...shikaku])
          );
          possiblePoints = localPossiblePoints.map(points => [...points]);
        }
        return false;
      }
    }
    return true;
  };
  exhaustiveSearch();

  window.document.getElementById("robot").value = true;
  {
    const getCells = ({ top, bottom, left, right }) => {
      const res = [];
      for (let i = top; i <= bottom; i++) {
        for (let j = left; j <= right; j++) {
          res.push({ row: i, col: j });
        }
      }
      return res;
    };
    window.Game.currentState.areas = tasks
      .filter(({ finished }) => finished)
      .map(({ finished, points }, i) => ({
        cellStatus: i,
        cells: getCells(points),
        startPoint: { row: points.top, col: points.left },
        endPoint: { row: points.bottom, col: points.right },
        inverted: false
      }));
    let finishedTasks = 0;
    const tasksMap = [];
    for (let i in tasks) {
      if (tasks[i].finished) {
        tasksMap.push(finishedTasks);
        finishedTasks++;
      } else {
        tasksMap.push(-1);
      }
    }
    window.Game.currentState.cellStatus = board.map(row =>
      row.map(cell => (cell === -1 ? -1 : tasksMap[cell]))
    );
  }
  window.Game.drawCurrentState();
  window.document.getElementById("btnReady").click();
  const div = document.createElement("div");
  div.innerText =
    iterationCount === 1 ? "1 iteration" : `${iterationCount} iterations`;
  document.getElementById("pageContent").prepend(div);
})();
