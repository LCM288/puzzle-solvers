// ==UserScript==
// @name         Hashi Solver
// @namespace    https://github.com/LCM288/puzzle-solvers
// @version      0.1
// @description  Solve Hashi
// @author       Charlie Li
// @include      /^https://www\.puzzle\-bridges\.com/(\?size=\d*)?$/
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(function() {
  "use strict";
  const islands = window.Game.task.map(({ index, number, row, col }) => ({
    index,
    number: parseInt(number),
    row,
    col,
    rightBlocks: [],
    downBlocks: [],
    bridges: {
      right: 0,
      down: 0
    }
  }));
  const countBridges = island =>
    island.bridges.right +
    island.bridges.down +
    (island.left?.bridges.right ?? 0) +
    (island.up?.bridges.down ?? 0);
  const countRemain = island => island.number - countBridges(island);
  const size =
    Math.max(
      ...islands.map(({ row }) => row),
      ...islands.map(({ col }) => col)
    ) + 1;
  {
    const rows = [...Array(size).keys()].map(() => []);
    const cols = [...Array(size).keys()].map(() => []);
    for (let i in islands) {
      const { row, col, index } = islands[i];
      rows[row].push(index);
      cols[col].push(index);
    }
    for (let i = 0; i < size; i++) {
      let pre;
      for (let j in rows[i]) {
        const cur = islands[rows[i][j]];
        if (pre) {
          pre.right = cur;
          cur.left = pre;
        }
        pre = cur;
      }
    }
    for (let i = 0; i < size; i++) {
      let pre;
      for (let j in cols[i]) {
        const cur = islands[cols[i][j]];
        if (pre) {
          pre.down = cur;
          cur.up = pre;
        }
        pre = cur;
      }
    }
    for (let i = 0; i < size; i++) {
      for (let j in rows[i]) {
        const cur = islands[rows[i][j]];
        if (!cur.down) {
          continue;
        }
        for (let k = cur.row + 1; k < cur.down.row; k++) {
          for (let l in rows[k]) {
            const candidate = islands[rows[k][l]];
            if (!candidate.right) {
              continue;
            }
            if (candidate.col < cur.col && candidate.right.col > cur.col) {
              cur.downBlocks.push(candidate.index);
              candidate.rightBlocks.push(cur.index);
            }
          }
        }
      }
    }
  }
  const isUpdated = islands.map(() => true);
  const updatedQueue = islands.map(({ index }) => index);
  const insertUpdated = index => {
    if (isUpdated[index]) {
      return;
    }
    updatedQueue.push(index);
    isUpdated[index] = true;
  };
  const islandDidUpdate = island => {
    if (island.up) {
      insertUpdated(island.up.index);
    }
    if (island.down) {
      insertUpdated(island.down.index);
    }
    if (island.left) {
      insertUpdated(island.left.index);
    }
    if (island.right) {
      insertUpdated(island.right.index);
    }
    insertUpdated(island.index);
  };
  const rightBlocksDown = island => {
    for (let i in island.rightBlocks) {
      const blockedDownIndex = island.rightBlocks[i];
      if (!islands[blockedDownIndex].down) {
        continue;
      }
      insertUpdated(blockedDownIndex);
      insertUpdated(islands[blockedDownIndex].down.index);
      delete islands[blockedDownIndex].down.up;
      delete islands[blockedDownIndex].down;
    }
  };
  const downBlocksRight = island => {
    for (let i in island.downBlocks) {
      const blockedRightIndex = island.downBlocks[i];
      if (!islands[blockedRightIndex].right) {
        continue;
      }
      insertUpdated(blockedRightIndex);
      insertUpdated(islands[blockedRightIndex].right.index);
      delete islands[blockedRightIndex].right.left;
      delete islands[blockedRightIndex].right;
    }
  };
  const findAllReamin = island => {
    return {
      left: island.left
        ? Math.min(2 - island.left.bridges.right, countRemain(island.left))
        : 0,
      up: island.up
        ? Math.min(2 - island.up.bridges.down, countRemain(island.up))
        : 0,
      right: island.right
        ? Math.min(2 - island.bridges.right, countRemain(island.right))
        : 0,
      down: island.down
        ? Math.min(2 - island.bridges.down, countRemain(island.down))
        : 0
    };
  };
  const placeBridgeLeft = (island, bridges) => {
    if (!island.left.bridges.right) {
      rightBlocksDown(island.left);
    }
    island.left.bridges.right += bridges;
    islandDidUpdate(island);
    islandDidUpdate(island.left);
  };
  const placeBridgeRight = (island, bridges) => {
    if (!island.bridges.right) {
      rightBlocksDown(island);
    }
    island.bridges.right += bridges;
    islandDidUpdate(island);
    islandDidUpdate(island.right);
  };
  const placeBridgeUp = (island, bridges) => {
    if (!island.up.bridges.down) {
      downBlocksRight(island.up);
    }
    island.up.bridges.down += bridges;
    islandDidUpdate(island);
    islandDidUpdate(island.up);
  };
  const placeBridgeDown = (island, bridges) => {
    if (!island.bridges.down) {
      downBlocksRight(island);
    }
    island.bridges.down += bridges;
    islandDidUpdate(island);
    islandDidUpdate(island.down);
  };
  const solveNaive = () => {
    while (updatedQueue.length) {
      const index = updatedQueue.shift();
      isUpdated[index] = false;
      const cur = islands[index];
      const {
        left: remainLeft,
        up: remainUp,
        right: remainRight,
        down: remainDown
      } = findAllReamin(cur);
      const remainMax = remainLeft + remainRight + remainUp + remainDown;
      const remainTotal = countRemain(cur);
      if (remainMax < remainTotal) {
        return false;
      }
      if (remainMax - remainLeft < remainTotal) {
        placeBridgeLeft(cur, remainTotal - (remainMax - remainLeft));
      }
      if (remainMax - remainRight < remainTotal) {
        placeBridgeRight(cur, remainTotal - (remainMax - remainRight));
      }
      if (remainMax - remainUp < remainTotal) {
        placeBridgeUp(cur, remainTotal - (remainMax - remainUp));
      }
      if (remainMax - remainDown < remainTotal) {
        placeBridgeDown(cur, remainTotal - (remainMax - remainDown));
      }
    }
    return true;
  };
  let iterationCount = 0;
  const checkValid = () => {
    const visited = islands.map(() => false);
    const dfs = index => {
      if (visited[index]) {
        return;
      }
      visited[index] = true;
      const island = islands[index];
      if (
        island.left &&
        (island.left.bridges.right ||
          (countRemain(island) && countRemain(island.left)))
      ) {
        dfs(island.left.index);
      }
      if (
        island.right &&
        (island.bridges.right ||
          (countRemain(island) && countRemain(island.right)))
      ) {
        dfs(island.right.index);
      }
      if (
        island.up &&
        (island.up.bridges.down ||
          (countRemain(island) && countRemain(island.up)))
      ) {
        dfs(island.up.index);
      }
      if (
        island.down &&
        (island.bridges.down ||
          (countRemain(island) && countRemain(island.down)))
      ) {
        dfs(island.down.index);
      }
    };
    dfs(0);
    return !visited.some(x => !x);
  };
  const exhaustiveSearch = () => {
    iterationCount++;
    if (!solveNaive()) {
      while (updatedQueue.length) {
        const index = updatedQueue.shift();
        isUpdated[index] = false;
      }
      return false;
    }
    if (!checkValid()) {
      return false;
    }
    const localIslands = islands.map(
      ({ rightBlocks, downBlocks, bridges, left, right, up, down }) => ({
        rightBlocks: [...rightBlocks],
        downBlocks: [...downBlocks],
        bridges: { ...bridges },
        ...(left && { left: left.index }),
        ...(right && { right: right.index }),
        ...(up && { up: up.index }),
        ...(down && { down: down.index })
      })
    );
    let minIsland = 0;
    let minRemain = 10;
    for (let i in islands) {
      const remainBridges = countRemain(islands[i]);
      if (remainBridges && remainBridges < minRemain) {
        minRemain = remainBridges;
        minIsland = i;
      }
    }
    if (minRemain === 10) {
      return true;
    }
    let islandToTry = islands[minIsland];
    const {
      left: remainLeft,
      up: remainUp,
      right: remainRight,
      down: remainDown
    } = findAllReamin(islandToTry);
    const resetIsland = () => {
      for (let i in localIslands) {
        islands[i].rightBlocks = [...localIslands[i].rightBlocks];
        islands[i].downBlocks = [...localIslands[i].downBlocks];
        islands[i].bridges = { ...localIslands[i].bridges };
        if ("left" in localIslands[i]) {
          islands[i].left = islands[localIslands[i].left];
        }
        if ("right" in localIslands[i]) {
          islands[i].right = islands[localIslands[i].right];
        }
        if ("up" in localIslands[i]) {
          islands[i].up = islands[localIslands[i].up];
        }
        if ("down" in localIslands[i]) {
          islands[i].down = islands[localIslands[i].down];
        }
      }
      islandToTry = islands[minIsland];
    };
    if (remainLeft) {
      placeBridgeLeft(islandToTry, 1);
      if (exhaustiveSearch()) {
        return true;
      } else {
        resetIsland();
      }
    }
    if (remainRight) {
      placeBridgeRight(islandToTry, 1);
      if (exhaustiveSearch()) {
        return true;
      } else {
        resetIsland();
      }
    }
    if (remainUp) {
      placeBridgeUp(islandToTry, 1);
      if (exhaustiveSearch()) {
        return true;
      } else {
        resetIsland();
      }
    }
    if (remainDown) {
      placeBridgeDown(islandToTry, 1);
      if (exhaustiveSearch()) {
        return true;
      } else {
        resetIsland();
      }
    }
    return false;
  };

  console.log(exhaustiveSearch());

  window.document.getElementById("robot").value = true;
  for (let i in islands) {
    const island = islands[i];
    if (island.bridges.right) {
      window.Game.currentState.cellStatus[i].right.index = island.right.index;
      window.Game.currentState.cellStatus[i].right.col = island.right.col;
      window.Game.currentState.cellStatus[i].right.bridges =
        island.bridges.right;
    }
    if (island.bridges.down) {
      window.Game.currentState.cellStatus[i].bottom.index = island.down.index;
      window.Game.currentState.cellStatus[i].bottom.row = island.down.row;
      window.Game.currentState.cellStatus[i].bottom.bridges =
        island.bridges.down;
    }
    if (window.Game.currentState.cellStatus[i].br !== -1) {
      window.Game.currentState.cellStatus[i].br = island.bridges.right;
    }
    if (window.Game.currentState.cellStatus[i].bb !== -1) {
      window.Game.currentState.cellStatus[i].bb = island.bridges.down;
    }
    if (window.Game.currentState.cellStatus[i].bl !== -1) {
      window.Game.currentState.cellStatus[i].bl =
        island.left?.bridges.right ?? 0;
    }
    if (window.Game.currentState.cellStatus[i].bt !== -1) {
      window.Game.currentState.cellStatus[i].bt = island.up?.bridges.down ?? 0;
    }
    window.Game.currentState.cellStatus[i].total = countBridges(island);
  }
  window.Game.drawCurrentState();
  window.document.getElementById("btnReady").click();
  const div = document.createElement("div");
  div.innerText =
    iterationCount === 1 ? "1 iteration" : `${iterationCount} iterations`;
  document.getElementById("pageContent").prepend(div);
})();
