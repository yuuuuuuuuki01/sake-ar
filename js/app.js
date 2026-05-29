// AR酒蔵見学 メインアプリケーション

let currentLang = 'ja';
let spotsData = [];
let activeSpotId = null;
let qrSpotId = null; // QRモードで表示中のスポット
const videoElements = {}; // スポットIDごとの<video>要素

const guideMessages = {
  ja: 'マーカーにカメラをかざしてください',
  en: 'Point your camera at a marker',
  zh: '请将相机对准标记',
};

const arBtnTexts = {
  ja: 'ARカメラで見る',
  en: 'Open AR Camera',
  zh: '打开AR相机',
};

// ========== QRモード ==========

function isQRMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get('spot') !== null;
}

function getQRSpotId() {
  const params = new URLSearchParams(window.location.search);
  const v = parseInt(params.get('spot'), 10);
  return isNaN(v) ? 0 : Math.max(0, Math.min(v, 9));
}

function showQRView(spotId) {
  qrSpotId = spotId;
  const spot = spotsData[spotId];
  if (!spot) return;

  const content = spot[currentLang];
  document.getElementById('qr-number').textContent = spotId + 1;
  document.getElementById('qr-title').textContent = content.title;
  document.getElementById('qr-desc').textContent = content.description;

  const photo = document.getElementById('qr-photo');
  photo.src = spot.image || '/images/placeholder.svg';

  // 動画
  const videoWrap = document.getElementById('qr-video-wrap');
  const videoEl = document.getElementById('qr-video');
  if (spot.video) {
    videoEl.src = spot.video;
    videoWrap.style.display = 'block';
    videoEl.play().catch(() => {});
  } else {
    videoWrap.style.display = 'none';
    videoEl.src = '';
  }

  // ナビゲーション
  document.getElementById('qr-nav-label').textContent =
    `${spotId + 1} / ${spotsData.length}`;
  document.getElementById('qr-prev').disabled = spotId === 0;
  document.getElementById('qr-next').disabled = spotId === spotsData.length - 1;
}

function setupQRNav() {
  document.getElementById('qr-prev').addEventListener('click', () => {
    if (qrSpotId > 0) showQRView(qrSpotId - 1);
  });
  document.getElementById('qr-next').addEventListener('click', () => {
    if (qrSpotId < spotsData.length - 1) showQRView(qrSpotId + 1);
  });

  // スワイプ対応
  let touchStartX = 0;
  const card = document.querySelector('.qr-card');
  card.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  card.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 60) {
      if (dx < 0 && qrSpotId < spotsData.length - 1) showQRView(qrSpotId + 1);
      if (dx > 0 && qrSpotId > 0) showQRView(qrSpotId - 1);
    }
  }, { passive: true });
}

// ========== ARモード ==========

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

  if (videoElements[spotId]) {
    videoElements[spotId].play().catch(() => {});
  }
}

function hideSpotOverlay() {
  if (activeSpotId !== null && videoElements[activeSpotId]) {
    videoElements[activeSpotId].pause();
    videoElements[activeSpotId].currentTime = 0;
  }
  activeSpotId = null;
  document.getElementById('spot-overlay').classList.remove('visible');
  document.getElementById('guide-message').classList.remove('hidden');
}

function refreshOverlay() {
  if (activeSpotId !== null) showSpotOverlay(activeSpotId);
}

function startARMode() {
  document.getElementById('qr-view').style.display = 'none';
  document.getElementById('ar-view').style.display = 'block';

  // A-Frame + AR.jsを動的ロード（カメラ起動はここで初めて発生）
  const aframe = document.createElement('script');
  aframe.src = 'https://aframe.io/releases/1.4.0/aframe.min.js';
  aframe.onload = () => {
    const arjs = document.createElement('script');
    arjs.src = 'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/aframe/build/aframe-ar.js';
    arjs.onload = () => initARScene();
    document.head.appendChild(arjs);
  };
  document.head.appendChild(aframe);
}

function initARScene() {
  const arView = document.getElementById('ar-view');

  const scene = document.createElement('a-scene');
  scene.setAttribute('embedded', '');
  scene.setAttribute('arjs',
    'sourceType: webcam; detectionMode: mono_and_matrix; matrixCodeType: 3x3_HAMMING63; debugUIEnabled: false;');
  scene.setAttribute('vr-mode-ui', 'enabled: false');
  scene.setAttribute('renderer', 'logarithmicDepthBuffer: true; colorManagement: true;');

  const assets = document.createElement('a-assets');
  scene.appendChild(assets);

  // マーカー生成
  for (let i = 0; i < 10; i++) {
    const marker = document.createElement('a-marker');
    marker.setAttribute('type', 'barcode');
    marker.setAttribute('value', i);
    marker.setAttribute('smooth', 'true');
    marker.setAttribute('smoothCount', '5');
    marker.setAttribute('smoothTolerance', '0.01');
    marker.setAttribute('smoothThreshold', '2');

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

    scene.appendChild(marker);

    // 透過動画プレーン
    const spot = spotsData[i];
    if (spot && spot.video) {
      const video = document.createElement('video');
      video.id = `spot-video-${i}`;
      video.src = spot.video;
      video.setAttribute('preload', 'auto');
      video.setAttribute('loop', 'true');
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.setAttribute('crossorigin', 'anonymous');
      video.muted = true;
      assets.appendChild(video);
      videoElements[i] = video;

      const plane = document.createElement('a-plane');
      plane.setAttribute('width', '2');
      plane.setAttribute('height', '2');
      plane.setAttribute('rotation', '-90 0 0');
      plane.setAttribute('position', '0 0.01 0');
      plane.setAttribute('material',
        `shader: flat; src: #spot-video-${i}; transparent: true; alphaTest: 0.1; side: double`);
      marker.appendChild(plane);
    }
  }

  const cam = document.createElement('a-entity');
  cam.setAttribute('camera', '');
  scene.appendChild(cam);

  arView.appendChild(scene);
}

// ========== 共通 ==========

async function loadSpots() {
  const res = await fetch('/data/spots.json');
  const data = await res.json();
  spotsData = data.spots;
}

function setupLangSwitcher() {
  const buttons = document.querySelectorAll('.lang-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentLang = btn.dataset.lang;

      // ガイドメッセージ更新
      const guideText = document.getElementById('guide-text');
      if (guideText) guideText.textContent = guideMessages[currentLang];

      // ARボタンテキスト更新
      document.getElementById('ar-btn-text-ja').style.display = currentLang === 'ja' ? '' : 'none';
      document.getElementById('ar-btn-text-en').style.display = currentLang === 'en' ? '' : 'none';
      document.getElementById('ar-btn-text-zh').style.display = currentLang === 'zh' ? '' : 'none';

      // 表示更新
      if (isQRMode() && qrSpotId !== null) showQRView(qrSpotId);
      refreshOverlay();
    });
  });
}

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
  await loadSpots();
  setupLangSwitcher();

  if (isQRMode()) {
    // QRモード：カメラなし、スポット直接表示
    document.getElementById('qr-view').style.display = 'flex';
    showQRView(getQRSpotId());
    setupQRNav();
    document.getElementById('btn-start-ar').addEventListener('click', startARMode);
  } else {
    // ARモード：従来のカメラ＋マーカー検出
    document.getElementById('ar-view').style.display = 'block';
    startARMode();
  }
});
