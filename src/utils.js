// Pure utilities (no DOM side-effects)

export function rngInt(min, max){
  return Math.floor(Math.random()*(max-min+1))+min;
}

export function generateTriple(){
  const a = rngInt(2,9);
  const b = rngInt(2,9);
  const c = a*b;
  const arr = [a,b,c];
  for(let i=arr.length-1;i>0;i--){
    const r = Math.floor(Math.random()*(i+1));
    [arr[i],arr[r]]=[arr[r],arr[i]];
  }
  return arr;
}

export function isValidTriple(values){
  const nums = values.map(v=>parseInt(v,10));
  for(let i=0;i<3;i++){
    for(let j=0;j<3;j++) if(j!==i){
      for(let k=0;k<3;k++) if(k!==i && k!==j){
        const a=nums[i], b=nums[j], c=nums[k];
        if(a*b===c) return {a,b,c};
      }
    }
  }
  return null;
}

export function areAdjacent(indices, rows, cols){
  const set = new Set(indices);
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  const visited = new Set([indices[0]]);
  const queue = [indices[0]];
  const idxToRC = idx => [Math.floor(idx/cols), idx%cols];
  while(queue.length){
    const cur = queue.shift();
    const [r,c] = idxToRC(cur);
    for(const [dr,dc] of dirs){
      const nr=r+dr, nc=c+dc; if(nr<0||nc<0||nr>=rows||nc>=cols) continue;
      const nIdx = nr*cols+nc;
      if(set.has(nIdx) && !visited.has(nIdx)){
        visited.add(nIdx); queue.push(nIdx);
      }
    }
  }
  return visited.size === set.size;
}

function getNeighbors(idx, rows, cols) {
  const r = Math.floor(idx / cols);
  const c = idx % cols;
  const neighbors = [];
  if (r > 0) neighbors.push((r - 1) * cols + c);
  if (r < rows - 1) neighbors.push((r + 1) * cols + c);
  if (c > 0) neighbors.push(r * cols + (c - 1));
  if (c < cols - 1) neighbors.push(r * cols + (c + 1));
  return neighbors;
}

function areIndicesAdjacent(idx1, idx2, cols) {
  const r1 = Math.floor(idx1 / cols);
  const c1 = idx1 % cols;
  const r2 = Math.floor(idx2 / cols);
  const c2 = idx2 % cols;
  return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
}

export function countSolutionsFromCells(cells, rows, cols, limit=9999){
  const n=cells.length; if(n<3) return 0;
  const vals = cells.map(c=>parseInt(c.dataset.value,10));
  let found=0;

  for (let u = 0; u < n; u++) {
    const neighbors = getNeighbors(u, rows, cols);
    for (let i = 0; i < neighbors.length; i++) {
      const v = neighbors[i];
      for (let j = i + 1; j < neighbors.length; j++) {
        const w = neighbors[j];

        // If triangle, ensure unique counting by requiring u to be the smallest index
        if (areIndicesAdjacent(v, w, cols)) {
          if (!(u < v && u < w)) continue;
        }

        const arr = [vals[u], vals[v], vals[w]];
        for(let x=0;x<3;x++) for(let y=0;y<3;y++) if(y!==x){
          for(let z=0;z<3;z++) if(z!==x && z!==y){
            if(arr[x]*arr[y]===arr[z]){ found++; if(found>=limit) return found; }
          }
        }
      }
    }
  }
  return found;
}

export function findOneSolutionFromCells(cells, rows, cols){
  const n=cells.length; if(n<3) return null;
  const vals = cells.map(c=>parseInt(c.dataset.value,10));

  for (let u = 0; u < n; u++) {
    const neighbors = getNeighbors(u, rows, cols);
    for (let i = 0; i < neighbors.length; i++) {
      const v = neighbors[i];
      for (let j = i + 1; j < neighbors.length; j++) {
        const w = neighbors[j];

        const arr=[vals[u],vals[v],vals[w]];
        for(let x=0;x<3;x++) for(let y=0;y<3;y++) if(y!==x){
          for(let z=0;z<3;z++) if(z!==x && z!==y){
            if(arr[x]*arr[y]===arr[z]) return [u,v,w];
          }
        }
      }
    }
  }
  return null;
}
