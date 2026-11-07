// 격자
const W = 150, H = 100;
const canvas = document.getElementById('box');
const ctx = canvas.getContext('2d');

//요소 번호: 간마다 이 숫자 하나가 저장됨
const EMPTY = 0, GLASS = 1, SOIL = 2, STONE = 3, GRAVEL = 4, WATER = 5,
    MOSS = 6,  // 이끼: 젖은 흙 표면에 붙어 번짐
    SEED = 7,  // 씨앗: 떨어지다가 젖은 흙에 닿으면 싹틈
    PLANT = 8, // 줄기: 물을 받아 위로 자람
    ROOT = 9;  // 뿌리: 흙 속에 고정, 흙에서 물을 빨아올림

//요소 별 색 - [R, G, B]
const COLORS = {
    [EMPTY]: [20, 24, 30],
    [GLASS]: [170, 200, 210],
    [SOIL]: [0x7A, 0x53, 0x30],
    [STONE]: [120, 120, 125],
    [GRAVEL]: [160, 150, 135],
    [WATER]: [0x9F, 0xDB, 0xF5],
    [MOSS]: [0x4F, 0x8A, 0x3C],
    [SEED]: [200, 180, 90],
    [PLANT]: [0x8F, 0xD1, 0x6A],
    [ROOT]: [190, 160, 110]
};

//격자 전체를 1줄짜리 배열로 저장
const grid = new Uint8Array(W * H);
const idx = (x, y) => y * W + x;
//칸마다 물기(흙만 사용)
const wet = new Uint8Array(W * H);
//흙 1칸이 머금을 수 있는 물방울 수
const MAX_WET = 4;
//칸마다 "이 식물이 싹튼 x 위치" (줄기만 사용)
const origin = new Uint8Array(W * H);
//줄기가 시작점에서 좌우로 뻗을 수 있는 최대 칸 수
const MAX_SPREAD = 3;
const ROOT_SPREAD = 5;
//칸마다 "시작점에서 몇 칸째 줄기인지" (줄기만 사용)
const height = new Uint8Array(W * H);
//칸마다 "이 식물의 최대 키" (줄기만 사용, 싹틀 때 정해져서 위 칸으로 물려줌)
const limit = new Uint8Array(W * H);
//상자 안 공기의 습도 0~100
let humidity = 50;




//유리벽: 좌,우,아래 (위는 뚜껑이라 비워둠)
for (let y = 0; y < H; y++) { grid[idx(0, y)] = GLASS; grid[idx(W - 1, y)] = GLASS; }
for (let x = 0; x < W; x++) grid[idx(x, H - 1)] = GLASS;

//그리기
//칸 1=픽셀 1
const img = ctx.createImageData(W, H);
function draw() {
    for (let i = 0; i < W * H; i++) {
        let c = COLORS[grid[i]];
        //젖을수록 흙 어둡게
        if (grid[i] === SOIL) {
            const k = 1 - wet[i] * 0.1;
            c = [c[0] * k, c[1] * k, c[2] * k];
        }
        img.data[i * 4] = c[0];
        img.data[i * 4 + 1] = c[1];
        img.data[i * 4 + 2] = c[2];
        img.data[i * 4 + 3] = grid[i] === EMPTY ? 0 : 255;
    }
    ctx.putImageData(img, 0, 0);
}

//습도계 + 시계
const fill = document.getElementById('fill');
const humText = document.getElementById('hum');
const clock = document.getElementById('clock');
function drawGauge() {
    fill.style.height = humidity + '%';  // 습도만큼 파란 기둥
    humText.textContent = Math.round(humidity);
    const m = Math.floor(time * 24 * 60);  // 하루 중 몇 분째인지
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    clock.textContent = `${light > 0 ? '☀' : '☾'} ${hh}:${mm}`;
}


//버튼
const TOOLS = [
    { name: '흙', type: SOIL },
    { name: '돌', type: STONE },
    { name: '자갈', type: GRAVEL },
    { name: '물', type: WATER },
    { name: '이끼', type: MOSS },
    { name: '씨앗', type: SEED },
    { name: '지우개', type: EMPTY }
];
let current = SOIL; // 지금 고른 붓

const box = document.getElementById('buttons');
for (const t of TOOLS) {
    const b = document.createElement('button');
    b.textContent = t.name;
    b.style.background = `rgb(${COLORS[t.type]})`; // 배열이 "122,82,48"로 바뀌어 들어감
    b.onclick = () => {
        current = t.type;
        box.querySelectorAll('button').forEach(x => x.classList.remove('selected'));
        b.classList.add('selected');
    };
    box.appendChild(b);
}
box.firstChild.classList.add('selected');

//마우스로 칠하기
let painting = false;
canvas.onmousedown = e => { painting = true; paint(e); };
window.onmouseup = () => { painting = false; };
canvas.onmousemove = e => { if (painting) paint(e); };

function paint(e) {
    // 화면 좌표 → 격자 좌표
    const r = canvas.getBoundingClientRect();
    const cx = Math.floor((e.clientX - r.left) / r.width * W);
    const cy = Math.floor((e.clientY - r.top) / r.height * H);
    const R = 1; // 붓 반지름
    for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
            if (dx * dx + dy * dy > R * R) continue; // 동그란 붓
            const x = cx + dx, y = cy + dy;
            if (x < 0 || x >= W || y < 0 || y >= H) continue;
            //유리는 못 칠함
            if (grid[idx(x, y)] === GLASS) continue;
            if (current === MOSS && Math.random() < 0.7)
                continue; // 이끼 붓은 칸마다 30%만 칠함 → 듬성
            grid[idx(x, y)] = current;
            wet[idx(x, y)] = 0; //새로 칠한 칸은 마른 상태
        }
    }
}

function update() {
    // 아래 줄부터 위로 훑음: 떨어진 알갱이를 같은 프레임에 또 옮기지 않으려고
    for (let y = H - 2; y >= 0; y--) {
        const dir = Math.random() < 0.5; // 줄마다 왼→오 / 오→왼을 바꿔서 한쪽으로 쏠리지 않게
        for (let k = 1; k < W - 1; k++) {
            const x = dir ? k : W - 1 - k;
            const t = grid[idx(x, y)];
            if (t === SOIL) {
                fall(x, y, [EMPTY, WATER]); soak(x, y);
                evaporate(x, y);
            } // 흙은 물속으로 가라앉음
            else if (t === GRAVEL) fall(x, y, [EMPTY]);
            else if (t === WATER) {
                flow(x, y);
                evaporate(x, y);
            }
            // 돌, 유리는 아무것도 안 함 = 고정
            else if (t === MOSS) moss(x, y);
            else if (t === SEED) seed(x, y);
            else if (t === ROOT) root(x, y);
            else if (t === PLANT) {
                plant(x, y);
                evaporate(x, y);
            }

        }
    }
}

//게임 루프
function loop() {
    tick();                                // 시간 흐름
    update();                              // 칸 규칙
    humidity -= humidity * 0.0005;         // 열린 위쪽으로 수증기가 조금씩 빠져나감 (뚜껑은 5단계)
    draw();
    if (frame % 10 === 0) {                // 하늘·습도계는 천천히 변하니 10프레임마다만
        drawSky();
        drawGauge();
        canvas.style.filter = `brightness(${0.35 + 0.65 * light})`; // 밤엔 상자 안도 어둡게
    }
    requestAnimationFrame(loop);
}
loop();
