//===== 시간 =====
const DAY_LEN = 60 * 60 * 3;   // 하루 길이(프레임) 하루 3분
let frame = DAY_LEN * 0.3;     // 시작 시각: 아침 7시쯤 
let time = 0;                  // 하루 중 위치 0~1 (0 자정, 0.25 해돋이, 0.5 정오, 0.75 해넘이)
let sunH = 0;                  // 해 높이 -1(자정)~1(정오)
let light = 0;                 // 상자에 드는 빛 해x=0, 해o=1

// 매 프레임 시간을 1칸 흘리고, 해 높이와 빛을 다시 계산
function tick() {
    frame++;
    time = (frame % DAY_LEN) / DAY_LEN;
    sunH = -Math.cos(time * 2 * Math.PI);  // 자정에 -1, 정오에 1
    light = Math.max(0, sunH);
}

//===== 하늘 그리기 =====
// 작은 캔버스(96x60)에 그리고 CSS로 화면 전체에 확대 → 픽셀 느낌
const sky = document.getElementById('sky');
const sctx = sky.getContext('2d');
const SW = sky.width, SH = sky.height;
const HORIZON = Math.floor(SH / 2);       // 지평선 = 화면 가운데
const skyImg = sctx.createImageData(SW, SH);

// 줄마다 고정된 랜덤 값 2개 → 가로로 길게 번진 구름 줄무늬를 만듦
const seeds = Array.from({ length: SH }, () => [Math.random() * 6, Math.random() * 6]);

// 시간대별 하늘 색 [맨 위, 지평선 근처]
const NIGHT = [[15, 18, 30], [45, 40, 45]];    // 밤: 어두운 남색
const DUSK = [[85, 75, 65], [225, 130, 50]];  // 해돋/해넘: 갈색 → 주황
const DAY = [[140, 145, 160], [240, 222, 190]]; // 낮: 회청색 → 크림색

const mix = (a, b, t) => a.map((v, k) => v + (b[k] - v) * t);
const clamp01 = v => Math.max(0, Math.min(1, v));

function drawSky() {
    // 1) 해 높이로 지금 하늘 색 정하기: 지평선 근처면 노을색, 높으면 낮색, 낮으면 밤색
    const pal = sunH < 0
        ? [0, 1].map(k => mix(DUSK[k], NIGHT[k], clamp01(-sunH * 4)))
        : [0, 1].map(k => mix(DUSK[k], DAY[k], clamp01(sunH * 2)));
    // 2) 해 위치: 해돋이 때 왼쪽 끝 → 정오에 가운데 → 해넘이 때 오른쪽 끝
    const sx = (time - 0.25) * 2 * SW;
    const sy = HORIZON - sunH * HORIZON * 0.9;
    const sunCol = mix([255, 140, 40], [255, 245, 225], clamp01(sunH * 2)); // 낮게 뜨면 주황, 높으면 흰색
    const glowOn = clamp01((sunH + 0.2) * 5);                               // 밤에는 빛 번짐 끔

    for (let y = 0; y < SH; y++) {
        const below = y > HORIZON;
        const ry = below ? 2 * HORIZON - y : y;   // 지평선 아래 = 위 하늘을 뒤집어 비춘 반사
        const v = ry / HORIZON;         // 0(맨 위) ~ 1(지평선)
        const [s1, s2] = seeds[y];
        for (let x = 0; x < SW; x++) {
            let c = mix(pal[0], pal[1], v * v);
            // 위→아래 그라데이션
            const d = Math.hypot(x - sx, ry - sy);
            // 해까지 거리
            c = mix(c, sunCol, (Math.max(0, 1 - d / (SW * 0.4)) ** 2) * glowOn); // 해 주변 빛 번짐
            if (d < 2.5) c = sunCol;       // 해 본체 
            let k = 1 + 0.12 * Math.sin(x * 0.12 + s1) * Math.sin(x * 0.04 + s2); // 구름 줄무늬 밝기
            if (below) k *= 0.75;      // 반사는 조금 어둡게
            if (y === HORIZON) k *= 0.6;   // 지평선은 진한 선
            const p = (y * SW + x) * 4;
            skyImg.data[p] = c[0] * k;
            skyImg.data[p + 1] = c[1] * k;
            skyImg.data[p + 2] = c[2] * k;
            skyImg.data[p + 3] = 255;
        }
    }
    sctx.putImageData(skyImg, 0, 0);
}
