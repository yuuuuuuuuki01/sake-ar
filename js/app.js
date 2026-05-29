// AR酒蔵見学 メインアプリケーション

let currentLang = 'ja';
let spotsData = [];
let activeSpotId = null;

const guideMessages = {
  ja: 'マーカーにカメラをかざしてください',
  en: 'Point your camera at a marker',
  zh: '请将相机对准标记',
};

// HTMLオーバーレイでコンテンツを表示（A-Frameのtextは日本語非対応のため）
function showSpotOverlay(spotId) {
  activeSpotId = spotId;
  const spot = spotsData.find((s) => s.id === spotId);
  if (!spot) return;

  const content = spot[currentLang];
  if (!content) return;

  const overlay = document.getElementById('spot-overlay');
  overlay.querySelector('.spot-number').textContent = spotId + 1;
  overlay.querySelector('.spot-title').textContent = content.title;
  overlay.querySelector('.spot-desc').textContent = content.description;

  const imgEl = overlay.querySelector('.spot-photo');
  imgEl.src = spot.image || '/images/placeholder.svg';

  overlay.classList.add('visible');
  document.getElementById('guide-message').classList.add('hidden');
}

function hideSpotOverlay() {
  activeSpotId = null;
  document.getElementById('spot-overlay').classList.remove('visible');
  document.getElementById('guide-message').classList.remove('hidden');
}

function refreshOverlay() {
  if (activeSpotId !== null) {
    showSpotOverlay(activeSpotId);
  }
}

// マーカーエンティティを動的生成
function createMarkers() {
  const scene = document.querySelector('a-scene');
  const camera = scene.querySelector('[camera]');

  for (let i = 0; i < 10; i++) {
    const marker = document.createElement('a-marker');
    marker.setAttribute('type', 'barcode');
    marker.setAttribute('value', i);
    marker.setAttribute('smooth', 'true');
    marker.setAttribute('smoothCount', '5');
    marker.setAttribute('smoothTolerance', '0.01');
    marker.setAttribute('smoothThreshold', '2');

    // マーカー上に小さな目印だけ表示（認識のフィードバック用）
    const indicator = document.createElement('a-plane');
    indicator.setAttribute('width', '0.5');
    indicator.setAttribute('height', '0.5');
    indicator.setAttribute('color', '#c9a96e');
    indicator.setAttribute('opacity', '0.4');
    indicator.setAttribute('rotation', '-90 0 0');
    indicator.setAttribute('material', 'shader: flat');
    marker.appendChild(indicator);

    const spotId = i;
    marker.addEventListener('markerFound', () => showSpotOverlay(spotId));
    marker.addEventListener('markerLost', () => {
      if (activeSpotId === spotId) hideSpotOverlay();
    });

    scene.insertBefore(marker, camera);
  }
}

// データ読み込み
async function loadSpots() {
  const res = await fetch('/data/spots.json');
  const data = await res.json();
  spotsData = data.spots;
}

// 言語切替
function setupLangSwitcher() {
  const buttons = document.querySelectorAll('.lang-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentLang = btn.dataset.lang;

      document.getElementById('guide-text').textContent =
        guideMessages[currentLang];

      refreshOverlay();
    });
  });
}

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
  createMarkers();
  await loadSpots();
  setupLangSwitcher();
});
