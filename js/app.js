// AR酒蔵見学 メインアプリケーション

let currentLang = 'ja';
let spotsData = [];
let activeSpotId = null;
const videoElements = {}; // スポットIDごとの<video>要素

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

  // 透過動画の再生
  if (videoElements[spotId]) {
    videoElements[spotId].play().catch(() => {});
  }
}

function hideSpotOverlay() {
  // 透過動画の停止
  if (activeSpotId !== null && videoElements[activeSpotId]) {
    videoElements[activeSpotId].pause();
    videoElements[activeSpotId].currentTime = 0;
  }

  activeSpotId = null;
  document.getElementById('spot-overlay').classList.remove('visible');
  document.getElementById('guide-message').classList.remove('hidden');
}

function refreshOverlay() {
  if (activeSpotId !== null) {
    showSpotOverlay(activeSpotId);
  }
}

// 透過動画用の<video>要素を作成してA-Frame assetsに登録
function setupVideoAssets() {
  const assets = document.querySelector('a-assets');
  spotsData.forEach((spot) => {
    if (!spot.video) return;
    const video = document.createElement('video');
    video.id = `spot-video-${spot.id}`;
    video.src = spot.video;
    video.setAttribute('preload', 'auto');
    video.setAttribute('loop', 'true');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('crossorigin', 'anonymous');
    video.muted = true; // autoplay policy対策（必要なら後でunmute）
    assets.appendChild(video);
    videoElements[spot.id] = video;
  });
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

// 透過動画をマーカー上にa-planeとして配置
function attachVideoPlanes() {
  spotsData.forEach((spot) => {
    if (!spot.video) return;
    const marker = document.querySelector(`a-marker[value="${spot.id}"]`);
    if (!marker) return;

    const plane = document.createElement('a-plane');
    plane.setAttribute('width', '2');
    plane.setAttribute('height', '2');
    plane.setAttribute('rotation', '-90 0 0');
    plane.setAttribute('position', '0 0.01 0');
    plane.setAttribute('material', `shader: flat; src: #spot-video-${spot.id}; transparent: true; alphaTest: 0.1; side: double`);
    marker.appendChild(plane);
  });
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

// URLパラメータからスポット直接表示（QRコード経由）
function checkUrlSpot() {
  const params = new URLSearchParams(window.location.search);
  const spotParam = params.get('spot');
  if (spotParam !== null) {
    const spotId = parseInt(spotParam, 10);
    if (!isNaN(spotId) && spotId >= 0 && spotId < spotsData.length) {
      showSpotOverlay(spotId);
    }
  }
}

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
  createMarkers();
  await loadSpots();
  setupVideoAssets();
  attachVideoPlanes();
  setupLangSwitcher();
  checkUrlSpot();
});
