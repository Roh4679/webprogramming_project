//물리
//2칸의 내용(종류+물기)를 맞바꿈 
function swap(a, b) {
    [grid[a], grid[b]] = [grid[b], grid[a]];
    [wet[a], wet[b]] = [wet[b], wet[a]];
}
// 아래 → 대각선 아래 순서로, into 목록에 있는 칸이면 그쪽으로 이동
function fall(x, y, into) {
    const d = Math.random() < 0.5 ? 1 : -1; // 대각선 방향은 랜덤
    for (const nx of [x, x + d, x - d]) {
        const j = idx(nx, y + 1);
        if (into.includes(grid[j])) { swap(idx(x, y), j); return true; }
    }
    return false;
}

function flow(x, y) {
    const i = idx(x, y);
    const below = idx(x, y + 1);
    // 1) 아래가 덜 젖은 흙이면 스며들고 사라짐
    //    바로 아래가 이끼면 이끼를 통과해서 그 밑의 흙을 봄
    const soil = grid[below] === MOSS ? idx(x, y + 2) : below;
    if (grid[soil] === SOIL && wet[soil] < MAX_WET) { wet[soil]++; grid[i] = EMPTY; return; }
    // 2) 떨어지기. 자갈은 통과함 (배수층)
    if (fall(x, y, [EMPTY, GRAVEL])) return;
    // 3) 못 떨어지면 옆으로 퍼짐
    const j = idx(x + (Math.random() < 0.5 ? 1 : -1), y);
    if (grid[j] === EMPTY) swap(i, j);
}

// 흙 속 물기가 아래로, 옆으로 번짐
function soak(x, y) {
    const i = idx(x, y);
    if (wet[i] === 0) return;
    const down = idx(x, y + 1);
    const side = idx(x + (Math.random() < 0.5 ? 1 : -1), y);
    if (grid[down] === SOIL && wet[down] < wet[i]) { wet[i]--; wet[down]++; }
    else if (grid[side] === SOIL && wet[side] + 1 < wet[i]) { wet[i]--; wet[side]++; }
}

// 증발: 공기(빈칸)에 닿은 물·젖은 흙·줄기에서 물 1방울이 수증기가 됨 → 습도 상승
function evaporate(x, y) {
    if (grid[idx(x, y - 1)] !== EMPTY) return;  // 위가 빈칸인 표면만 증발
    if (!chance(0.00005 + 0.0005 * light)) return;
    // 밤엔 아주 조금, 낮(빛 강할수록)엔 10배 넘게
    const i = idx(x, y);
    if (grid[i] === WATER) grid[i] = EMPTY;
    // 물방울은 통째로 사라짐
    else if (wet[i] > 0) wet[i]--;
    // 흙·줄기는 물기 1 감소
    else return;     // 말라 있으면 증발할 게 없음
    humidity = Math.min(100, humidity + 0.3);
}
