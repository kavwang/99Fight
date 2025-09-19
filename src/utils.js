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

export function countSolutionsFromCells(cells, rows, cols, limit=9999){
  const n=cells.length; if(n<3) return 0;
  const vals = cells.map(c=>parseInt(c.dataset.value,10));
  let found=0;
  for(let i=0;i<n-2;i++){
    for(let j=i+1;j<n-1;j++){
      for(let k=j+1;k<n;k++){
        if(!areAdjacent([i,j,k], rows, cols)) continue;
        const arr=[vals[i],vals[j],vals[k]];
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
  for(let i=0;i<n-2;i++){
    for(let j=i+1;j<n-1;j++){
      for(let k=j+1;k<n;k++){
        if(!areAdjacent([i,j,k], rows, cols)) continue;
        const arr=[vals[i],vals[j],vals[k]];
        for(let x=0;x<3;x++) for(let y=0;y<3;y++) if(y!==x){
          for(let z=0;z<3;z++) if(z!==x && z!==y){
            if(arr[x]*arr[y]===arr[z]) return [i,j,k];
          }
        }
      }
    }
  }
  return null;
}
