//===== 생물 =====
// 확률 p로 true. 1초에 60번 검사하므로 p는 아주 작게 (0.01 ≈ 2초에 1번)
const chance = p => Math.random() < p;
// -1(왼쪽) 또는 +1(오른쪽) 랜덤
const rdir = () => (Math.random() < 0.5 ? -1 : 1);
// -1, 0, +1 중 랜덤 (왼쪽, 가운데, 오른쪽)
const r3 = () => Math.floor(Math.random() * 3) - 1;

// (x,y) 주변 8칸 중 type인 칸 수
// → "주변에 같은 게 1개뿐인 칸"으로만 자라게 해서, 덩어리가 아니라 가는 가지처럼 뻗게 함
function countAround(x, y, type) {
    let n = 0;
    for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
            if ((dx || dy) && grid[idx(x + dx, y + dy)] === type) n++;
    return n;
}

// 물관: 아래 3칸 중 하나가 뿌리·줄기면 물 1방울을 내 칸으로 끌어올림
// 이게 매 프레임 반복되면 물이 뿌리 끝 → 줄기 끝까지 올라감
function pullUp(x, y) {
    const i = idx(x, y), j = idx(x + r3(), y + 1);
    if ((grid[j] === ROOT || grid[j] === PLANT) && wet[j] > 0 && wet[i] < MAX_WET) {
        wet[j]--; wet[i]++;
    }
}

// 이끼: 흙 위 빈칸에 붙어 삶
function moss(x, y) {
    const below = idx(x, y + 1);
    if (grid[below] === EMPTY) { swap(idx(x, y), below); return; } // 공중이면 떨어짐
    if (grid[below] !== SOIL) return;                                // 흙 위가 아니면 아무것도 안 함
    if (wet[below] === 0) {                                          // 아래 흙이 마름 → 천천히 말라 죽음
        if (chance(0.002)) grid[idx(x, y)] = EMPTY;
        return;
    }
    if (chance(0.02 * light)) {      // 아래 흙이 젖음 → 옆으로 번식
        const nx = x + rdir(), ny = y + r3();                        // 옆 / 옆위 / 옆아래 중 한 칸
        if (grid[idx(nx, ny)] === EMPTY && grid[idx(nx, ny + 1)] === SOIL) { // 그 칸도 흙 표면이어야 함
            grid[idx(nx, ny)] = MOSS;
            wet[below]--;       // 번식에 물 1방울 씀
        }
    }
}

// 씨앗: 흙처럼 떨어짐. 젖은 흙 위에 멈추면 싹틈
function seed(x, y) {
    if (fall(x, y, [EMPTY, WATER])) return;                          // 아직 떨어지는 중
    const below = idx(x, y + 1);
    if (grid[below] === SOIL && wet[below] > 0) {
        // 젖은 흙에 안착
        grid[idx(x, y)] = PLANT;     // 씨앗 → 첫 줄기
        origin[idx(x, y)] = x;
        height[idx(x, y)] = 1;
        //10% 확률로 큰 식물(30), 나머지 20
        limit[idx(x, y)] = chance(0.1) ? 30 : 20;
        grid[below] = ROOT;
        // 아래 흙 → 첫 뿌리 (물기는 그대로 넘겨받음)
        origin[below] = x;   // 뿌리도 시작점 x 기록
        height[below] = 1;    // 첫 뿌리 = 깊이 1
        const r = Math.random();    // 뿌리 최대 깊이 뽑기
        limit[below] = r < 0.1 ? 15 : r < 0.4 ? 10 : 5;  
    }
    // 마른 흙이면 그냥 기다림 (물 주면 싹틈)
}

// 뿌리: 움직이지 않음. 물 흡수 + 흙 속으로 뻗기
function root(x, y) {
    const i = idx(x, y);
    pullUp(x, y);                                                    // 더 깊은 뿌리에서 물 받기
    // 1) 흡수: 상하좌우 중 한 칸이 젖은 흙이면 물 1방울 가져옴
    const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)];
    const j = idx(x + dx, y + dy);
    if (grid[j] === SOIL && wet[j] > 0 && wet[i] < MAX_WET) { wet[j]--; wet[i]++; }
    // 2) 성장: 물이 있고 최대 깊이 미만이면, 가끔 아래·대각선 아래 흙을 뿌리로 바꿈
    if (wet[i] > 0 && height[i] < limit[i] && chance(0.003)) {
        const nx = x + r3(), ny = y + 1;
        if (Math.abs(nx - origin[i]) > ROOT_SPREAD) return;          // 시작점에서 좌우 5칸 넘으면 안 뻗음
        if (grid[idx(nx, ny)] === SOIL && countAround(nx, ny, ROOT) === 1) { // 가늘게 뻗도록
            grid[idx(nx, ny)] = ROOT;
            origin[idx(nx, ny)] = origin[i];  // 새 뿌리도 같은 시작점
            height[idx(nx, ny)] = height[i] + 1;       // 한 칸 더 깊음
            limit[idx(nx, ny)] = limit[i];          // 최대 깊이 물려받음
            wet[i]--;                                              
        }
    }

}

// 줄기: 물 끌어올리기 + 위로 자라기
function plant(x, y) {
    const i = idx(x, y);
    pullUp(x, y);   // 아래 뿌리·줄기에서 물 받기
    if (wet[i] > 0 && y > 1 && height[i] < limit[i] && chance(0.02 * light)) {
        // 물이 있으면 가끔 자람 (0.01 = 예전의 절반 속도)
        const nx = x + (chance(0.7) ? 0 : rdir()), ny = y - 1;
        // 70%는 곧게 위, 30%는 대각선 = 가지
        if (Math.abs(nx - origin[i]) > MAX_SPREAD) return;
        // 시작점에서 좌우 3칸을 넘으면 그쪽으로 안 자람
        if (grid[idx(nx, ny)] === EMPTY && countAround(nx, ny, PLANT) === 1) { // 뭉치지 않게
            grid[idx(nx, ny)] = PLANT;
            origin[idx(nx, ny)] = origin[i];
            // 새 칸도 같은 시작점을 물려받음
            height[idx(nx, ny)] = height[i] + 1;
            // 새 칸은 한 칸 더 높음
            limit[idx(nx, ny)] = limit[i];
            // 최대 키도 물려받음
            wet[i]--;                  // 성장에 물 1방울 씀
        }
    }
}