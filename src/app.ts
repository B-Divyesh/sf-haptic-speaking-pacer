import './styles.css';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { AudioPacer } from './audio';
import { DEMO_SESSIONS, demoSessionTitle } from './demo-data';
import { classifyPace, csvForSessions, sessionSummary, suggestedBand, type PaceSample, type SessionRecord } from './pace';
import { sessionsFromImport } from './session-schema';
import { clearSessions, getSessions, importSessions, saveSession, setStorageNamespace } from './storage';

const PRODUCT_SLUG = 'haptic-speaking-pacer';
const CHECKOUT_API_BASE = import.meta.env.VITE_BILLING_API_BASE || 'https://api.sociobot.in/api/v1';
const VERIFY_URL = location.protocol === 'capacitor:' ? 'https://haptic-speaking-pacer.sociobot.in/api/license/verify' : '/api/license/verify';
const LICENSE_KEY = `sb_license:${PRODUCT_SLUG}`;
const VERDICT_KEY = `${LICENSE_KEY}:verdict`;
const app = document.querySelector<HTMLDivElement>('#app')!;
const demoMode = location.pathname === '/demo' || location.pathname === '/demo/' || new URLSearchParams(location.search).get('demo') === '1';

setStorageNamespace(demoMode ? 'demo' : 'real');

type Pattern = 'ridge' | 'double' | 'triple';
interface Settings { low: number; high: number; pattern: Pattern; baseline?: number }
interface CachedVerdict { valid: boolean; checkedAt: number }

let settings: Settings = readSettings();
let sessions: SessionRecord[] = [];
let audio: AudioPacer | undefined;
let activeSamples: PaceSample[] = [];
let activeStarted = 0;
let activeTimer = 0;
let fastReadings = 0;
let lastNudge = 0;
let deferredInstall: Event | undefined;
let licenseActive = readCachedLicense();

function storageKey(key: string): string {
  return demoMode ? `demo:${key}` : key;
}

function readSettings(): Settings {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey('pace-settings')) ?? 'null') as Settings | null;
    if (value && value.low >= 60 && value.high <= 240 && value.low < value.high) return value;
  } catch { /* use safe defaults */ }
  return { low: 120, high: 150, pattern: 'ridge' };
}

function storeSettings() {
  localStorage.setItem(storageKey('pace-settings'), JSON.stringify(settings));
}

function readCachedLicense(): boolean {
  const token = localStorage.getItem(storageKey(LICENSE_KEY));
  if (!token) return false;
  try {
    const verdict = JSON.parse(localStorage.getItem(storageKey(VERDICT_KEY)) ?? 'null') as CachedVerdict | null;
    return verdict?.valid === true;
  } catch { return false; }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]!);
}

function shell(content: string, page: 'home' | 'privacy' | 'terms' = 'home'): string {
  return `
    <header class="site-header">
      <a class="brand" href="/" aria-label="Haptic Speaking Pacer home">
        <img src="/icons/icon.svg" width="40" height="40" alt="" />
        <span>Haptic Speaking Pacer</span>
      </a>
      <nav aria-label="Main navigation">
        ${page === 'home' ? `<a href="/demo">Demo</a><a href="#sessions">Sessions</a><a href="#install">Install</a><a href="/privacy/">Privacy</a>` : '<a href="/demo">Demo</a><a href="/">Open pacer</a><a href="/privacy/">Privacy</a>'}
        <button class="icon-button" id="theme-toggle" type="button" aria-label="Switch color theme"><span aria-hidden="true">◐</span></button>
      </nav>
    </header>
    <div class="network-strip" id="network-strip" role="status" hidden>You’re offline. The pacer and saved sessions still work.</div>
    ${demoMode ? `<aside class="demo-banner" aria-label="Demo mode"><strong>Demo — sample data, nothing is saved</strong><span>Explore the sample without changing your sessions.</span><div><button class="text-button" id="reset-demo" type="button">Reset demo</button><button class="button secondary small" id="start-real" type="button">Start for real</button></div></aside>` : ''}
    ${content}
    <footer>
      <div><strong>Haptic Speaking Pacer</strong><p>Private speaking pace practice with device haptics.</p></div>
      <nav aria-label="Legal"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="https://github.com/B-Divyesh/sf-haptic-speaking-pacer">Source</a></nav>
      <p class="art-credit">Original generated paper-relief artwork. No tracking scripts are used.</p>
      </footer>
    <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
  `;
}

function renderHome(): void {
  const visibleSessions = licenseActive ? sessions : sessions.slice(0, 3);
  app.innerHTML = shell(`
    <main id="main">
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow">Private speaking pace practice</p>
          <h1 id="hero-title">${demoMode ? 'See sample speaking pace results' : 'Practice a steady speaking pace'}</h1>
          <p class="lede">${demoMode ? 'Four sample rehearsals show pace, target bands, and time in range.' : 'For presenters and teachers who need a discreet cue when they speak too fast.'}</p>
          <div class="hero-actions">
            ${demoMode ? '<a class="button primary" href="#sessions">View sample sessions</a>' : '<a class="button primary" href="/demo">Try it with sample data</a>'}
            ${demoMode ? '<button class="button secondary" id="open-calibration" type="button">Learn my baseline</button>' : '<button class="button secondary" id="start-session" type="button">Start a practice</button>'}
          </div>
          ${demoMode ? '<p class="action-note">The sample opens with four saved practice sessions. It never changes your real data.</p>' : '<p class="action-note">See four realistic practice sessions before you allow microphone access.</p>'}
          <ul class="plain-facts"><li>Audio stays on this device.</li><li>Works offline after the first visit.</li><li>$7 once unlocks full history and extra tap patterns.</li></ul>
        </div>
        ${demoMode ? renderDemoPreview() : `<picture class="hero-art">
          <source media="(max-width: 600px)" srcset="/assets/topographic-pulse-640.webp" />
          <img src="/assets/topographic-pulse-960.webp" width="960" height="640" alt="Layered paper contour terrain with an emerald pace waypoint" fetchpriority="high" decoding="async" />
        </picture>`}
      </section>

      <section class="route-panel" aria-labelledby="route-title">
        <div class="section-heading"><div><p class="eyebrow">Your settings</p><h2 id="route-title">Set a target pace</h2></div><span class="map-key">words / minute</span></div>
        <div class="target-grid">
          <div class="range-visual" aria-hidden="true"><span class="range-low">${settings.low}</span><div class="range-line"><i></i></div><span class="range-high">${settings.high}</span></div>
          <form id="pace-form">
            <div class="field-pair">
              <label for="pace-low">Lower edge <output id="low-output">${settings.low}</output></label>
              <input id="pace-low" name="low" type="range" min="60" max="210" step="5" value="${settings.low}" />
              <label for="pace-high">Upper edge <output id="high-output">${settings.high}</output></label>
              <input id="pace-high" name="high" type="range" min="75" max="240" step="5" value="${settings.high}" />
            </div>
            <p class="field-help">Most conversational speech falls around 120–160 WPM. Choose a band at least 15 WPM wide.</p>
            ${settings.baseline ? `<p class="baseline-mark">Your learned baseline: <strong>${settings.baseline} WPM</strong></p>` : ''}
          </form>
          <fieldset class="pattern-field">
            <legend>When I’m fast, tap</legend>
            ${patternOption('ridge', 'One tap', true)}
            ${patternOption('double', 'Two taps', licenseActive)}
            ${patternOption('triple', 'Three taps', licenseActive)}
            <button class="text-button" id="test-haptic" type="button">Test selected tap</button>
          </fieldset>
        </div>
      </section>

      <section class="how-it-works" aria-labelledby="how-title">
        <p class="eyebrow">Private practice</p><h2 id="how-title">How speaking pace practice works</h2>
        <ol class="contour-steps">
          <li><span>01</span><div><h3>Set a pace band</h3><p>Choose a range from 60 to 240 words per minute, or learn a starting band from a short sample.</p></div></li>
          <li><span>02</span><div><h3>Practice your talk</h3><p>The app estimates pace from audio energy on your device. It does not create a transcript.</p></div></li>
          <li><span>03</span><div><h3>Receive a fast-pace cue</h3><p>After sustained fast speech, the app sends a tactile cue. Stop to see your private pace results.</p></div></li>
        </ol>
        <aside class="accuracy-note"><strong>Pace estimate limits</strong><p>Pace estimates vary with room noise, microphone position, accent, and pauses. This is a personal rehearsal aid, not clinical speech assessment.</p></aside>
      </section>

      <section id="sessions" class="sessions-section" aria-labelledby="sessions-title">
        <div class="section-heading"><div><p class="eyebrow">Private session history</p><h2 id="sessions-title">Practice sessions</h2></div><button class="button secondary small" id="export-json" type="button" ${sessions.length ? '' : 'disabled'}>Export JSON and CSV</button></div>
        <div id="session-list">${renderSessions(visibleSessions)}</div>
        ${!licenseActive && sessions.length > 3 ? `<p class="quiet-notice">${sessions.length - 3} earlier session${sessions.length - 3 === 1 ? '' : 's'} are stored on this device. Buy the full-history license to view them here. Export includes every session.</p>` : ''}
        <div class="data-actions"><label class="button secondary small" for="import-file">Import JSON</label><input class="visually-hidden" id="import-file" type="file" accept="application/json" /><button class="text-button danger-link" id="clear-data" type="button" ${sessions.length ? '' : 'disabled'}>Clear session data</button></div>
      </section>

      <section class="unlock-section" aria-labelledby="unlock-title">
        <div><p class="eyebrow">One-time license</p><h2 id="unlock-title">See your full session history</h2><p>For $7 once, see unlimited session history and choose alternate haptic patterns. Calibration, custom targets, the core pacer, and data export stay free.</p></div>
        <div class="unlock-actions">
          ${licenseActive ? '<p class="license-active"><span aria-hidden="true">✓</span> Full session history is active on this device.</p>' : `<a class="button primary" href="${CHECKOUT_API_BASE}/products/${PRODUCT_SLUG}/checkout">Buy once — $7</a>`}
          <button class="text-button" id="restore-license" type="button">Have a license? Restore it</button>
        </div>
      </section>

      <section id="install" class="install-section" aria-labelledby="install-title">
        <p class="eyebrow">Install options</p><h2 id="install-title">Install the speaking pacer</h2>
        <div class="install-grid">
          <div><h3>Install the PWA</h3><p>Works offline after the first visit. On iPhone, use Share → Add to Home Screen.</p><button class="button secondary" id="install-pwa" type="button">Install web app</button></div>
          <div><h3>Sideload the iPhone app</h3><p>Download the unsigned IPA, verify its <a href="https://github.com/B-Divyesh/sf-haptic-speaking-pacer/releases/latest/download/SHA256SUMS">SHA-256 checksum</a>, then install it with AltStore, Sideloadly, or Xcode. App Store or TestFlight distribution needs the owner’s Apple Developer account.</p><a class="button secondary" href="https://github.com/B-Divyesh/sf-haptic-speaking-pacer/releases/latest/download/haptic-speaking-pacer-unsigned.ipa">Download unsigned IPA</a></div>
        </div>
      </section>
    </main>

    <dialog id="calibration-dialog" aria-labelledby="calibration-title">
      <button class="dialog-close" id="close-calibration" type="button" aria-label="Close calibration">×</button>
      <p class="eyebrow">Baseline sample</p><h2 id="calibration-title">Learn your natural pace</h2>
      <div id="calibration-content"><p>Speak as you would in a real presentation. The microphone is used only for live energy measurements; no recording is made.</p><ul class="permission-list"><li>Find a reasonably quiet room</li><li>Keep the device within arm’s reach</li><li>Allow microphone access when asked</li></ul><button class="button primary" id="begin-calibration" type="button">Allow mic &amp; begin</button><button class="text-button" id="skip-calibration" type="button">Use 120–150 WPM instead</button></div>
    </dialog>

    <dialog id="restore-dialog" aria-labelledby="restore-title">
      <button class="dialog-close" id="close-restore" type="button" aria-label="Close restore purchase">×</button>
      <p class="eyebrow">Move devices</p><h2 id="restore-title">Restore your unlock</h2><p>Paste the license token from your purchase receipt.</p>
      <form id="license-form"><label for="license-token">License token</label><input id="license-token" name="license" required autocomplete="off" spellcheck="false" /><p id="license-error" class="form-error" role="alert"></p><button class="button primary" type="submit">Verify license</button></form>
    </dialog>
  `);
  bindHome();
  bindGlobal();
  updateNetworkState();
}

function patternOption(value: Pattern, label: string, available: boolean): string {
  const checked = settings.pattern === value ? 'checked' : '';
  return `<label class="pattern-option ${available ? '' : 'locked'}"><input type="radio" name="pattern" value="${value}" ${checked} ${available ? '' : 'disabled'} /><span class="pattern-glyph" aria-hidden="true">${value === 'ridge' ? '●' : value === 'double' ? '● ●' : '● ● ●'}</span><span>${label}${available ? '' : ' · Full history license'}</span></label>`;
}

function renderDemoPreview(): string {
  return `<section class="demo-preview" aria-labelledby="demo-preview-title">
    <p class="eyebrow">Sample output</p>
    <h2 id="demo-preview-title">Four saved rehearsals</h2>
    <ol>
      ${DEMO_SESSIONS.slice(0, 3).map((session) => `<li><strong>${demoSessionTitle(session.id)}</strong><span>${session.averageWpm} avg WPM · ${session.inBandPercent}% in range</span></li>`).join('')}
    </ol>
    <p>Each result includes a target band and an accessible pace chart.</p>
  </section>`;
}

function renderSessions(items: SessionRecord[]): string {
  if (!items.length) return `<div class="empty-state"><span class="empty-contour" aria-hidden="true"></span><h3>No practice sessions yet</h3><p>Complete a practice and your first private pace chart will appear here.</p><button class="button secondary" type="button" data-start>Start the first practice</button></div>`;
  return `<ol class="session-list">${items.map((session) => {
    const date = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(session.startedAt));
    const title = demoMode ? demoSessionTitle(session.id) : undefined;
    return `<li>${title ? `<h3>${title}</h3>` : ''}<div class="session-summary"><div><time datetime="${escapeHtml(session.startedAt)}">${escapeHtml(date)}</time><strong>${escapeHtml(String(session.inBandPercent))}% in range</strong></div><div><span>${escapeHtml(String(session.averageWpm))} avg WPM</span><span>${escapeHtml(formatDuration(session.durationSeconds))}</span></div></div>${sparkline(session)}<details><summary>View accessible pace samples</summary><p>Target ${escapeHtml(String(session.targetLow))}–${escapeHtml(String(session.targetHigh))} WPM. ${escapeHtml(String(session.inBandPercent))}% of speaking samples were in range.</p><table><thead><tr><th>Time</th><th>Pace</th><th>State</th></tr></thead><tbody>${session.samples.filter((_, i) => i % 5 === 0).map((sample) => `<tr><td>${escapeHtml(String(sample.at))}s</td><td>${escapeHtml(sample.wpm ? String(sample.wpm) : '—')}</td><td>${escapeHtml(sample.state)}</td></tr>`).join('')}</tbody></table></details></li>`;
  }).join('')}</ol>`;
}

function sparkline(session: SessionRecord): string {
  const values = session.samples.filter((s) => s.speaking && s.wpm);
  if (values.length < 2) return '<p class="no-speech">Not enough speech to draw a pace chart.</p>';
  const width = 600, height = 86;
  const points = values.map((s, i) => `${Math.round((i / (values.length - 1)) * width)},${Math.round(height - ((Math.min(240, Math.max(60, s.wpm)) - 60) / 180) * height)}`).join(' ');
  const yHigh = Math.round(height - ((session.targetHigh - 60) / 180) * height);
  const bandHeight = Math.max(3, Math.round(((session.targetHigh - session.targetLow) / 180) * height));
  return `<svg class="sparkline" viewBox="0 0 ${width} ${height}" role="img" aria-label="Pace chart: average ${session.averageWpm} words per minute, ${session.inBandPercent} percent in target range"><rect x="0" y="${yHigh}" width="${width}" height="${bandHeight}"/><polyline points="${points}"/></svg>`;
}

function bindHome(): void {
  document.querySelector('#start-session')?.addEventListener('click', () => void startSession());
  document.querySelector('[data-start]')?.addEventListener('click', () => void startSession());
  document.querySelector('#open-calibration')?.addEventListener('click', () => openDialog('calibration-dialog'));
  document.querySelector('#close-calibration')?.addEventListener('click', () => closeDialog('calibration-dialog'));
  document.querySelector('#begin-calibration')?.addEventListener('click', () => void beginCalibration());
  document.querySelector('#skip-calibration')?.addEventListener('click', () => { settings = { ...settings, low: 120, high: 150 }; storeSettings(); closeDialog('calibration-dialog'); renderHome(); });
  document.querySelectorAll<HTMLInputElement>('input[name="pattern"]').forEach((input) => input.addEventListener('change', () => { settings.pattern = input.value as Pattern; storeSettings(); }));
  document.querySelector('#test-haptic')?.addEventListener('click', () => void hapticCue(settings.pattern));
  const low = document.querySelector<HTMLInputElement>('#pace-low');
  const high = document.querySelector<HTMLInputElement>('#pace-high');
  const updateRange = () => {
    if (!low || !high) return;
    let nextLow = Number(low.value), nextHigh = Number(high.value);
    if (nextHigh - nextLow < 15) {
      if (document.activeElement === low) nextHigh = Math.min(240, nextLow + 15);
      else nextLow = Math.max(60, nextHigh - 15);
      low.value = String(nextLow); high.value = String(nextHigh);
    }
    settings = { ...settings, low: nextLow, high: nextHigh };
    storeSettings();
    document.querySelector('#low-output')!.textContent = String(nextLow);
    document.querySelector('#high-output')!.textContent = String(nextHigh);
    document.querySelector('.range-low')!.textContent = String(nextLow);
    document.querySelector('.range-high')!.textContent = String(nextHigh);
  };
  low?.addEventListener('input', updateRange); high?.addEventListener('input', updateRange);
  document.querySelector('#export-json')?.addEventListener('click', exportData);
  document.querySelector('#import-file')?.addEventListener('change', (event) => void handleImport(event));
  document.querySelector('#clear-data')?.addEventListener('click', () => void confirmClearData());
  document.querySelector('#restore-license')?.addEventListener('click', () => openDialog('restore-dialog'));
  document.querySelector('#close-restore')?.addEventListener('click', () => closeDialog('restore-dialog'));
  document.querySelector('#license-form')?.addEventListener('submit', (event) => void restoreLicense(event));
  document.querySelector('#install-pwa')?.addEventListener('click', () => void installPwa());
  document.querySelector('#reset-demo')?.addEventListener('click', () => void resetDemo());
  document.querySelector('#start-real')?.addEventListener('click', () => void startForReal());
}

async function resetDemo(): Promise<void> {
  if (!demoMode) return;
  await clearSessions();
  localStorage.removeItem(storageKey('pace-settings'));
  localStorage.removeItem(storageKey('pace-theme'));
  localStorage.removeItem(storageKey(LICENSE_KEY));
  localStorage.removeItem(storageKey(VERDICT_KEY));
  licenseActive = false;
  settings = readSettings();
  document.documentElement.dataset.theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  await importSessions(DEMO_SESSIONS);
  sessions = await getSessions();
  renderHome();
  showToast('Sample data reset. Your real data was not changed.');
}

async function startForReal(): Promise<void> {
  if (!demoMode) return;
  await clearSessions();
  localStorage.removeItem(storageKey('pace-settings'));
  localStorage.removeItem(storageKey('pace-theme'));
  localStorage.removeItem(storageKey(LICENSE_KEY));
  localStorage.removeItem(storageKey(VERDICT_KEY));
  location.assign('/');
}

async function startSession(): Promise<void> {
  const button = document.querySelector<HTMLButtonElement>('#start-session') ?? document.querySelector<HTMLButtonElement>('[data-start]');
  if (button) { button.disabled = true; button.textContent = 'Opening microphone…'; }
  audio = new AudioPacer(); activeSamples = []; activeStarted = Date.now(); fastReadings = 0; lastNudge = 0; lastSampleSecond = -1;
  try {
    await audio.start(handleReading);
    renderLive();
    activeTimer = window.setInterval(updateLiveClock, 1000);
  } catch (error) {
    audio = undefined;
    showToast(microphoneError(error));
    if (button) { button.disabled = false; button.textContent = 'Start a practice'; }
  }
}

function renderLive(): void {
  app.innerHTML = `
    <main id="main" class="live-main">
      <section class="live-panel" aria-labelledby="live-title">
        <p class="eyebrow">Practice in progress</p><h1 id="live-title">Practice your speaking pace</h1>
        <div class="live-state steady" id="live-state"><span class="state-symbol" aria-hidden="true">—</span><strong id="live-label">Listening</strong><span id="live-wpm">Speak when you’re ready</span></div>
        <div class="live-band"><span>Slow</span><div><i id="live-marker"></i></div><span>Fast</span></div>
        <p class="target-caption">Target ${settings.low}–${settings.high} WPM · <time id="live-time">0:00</time></p>
        <p class="screen-away">You can put the screen away. A tap will cue sustained fast speech.</p>
        <button class="button stop" id="stop-session" type="button">Stop and see results</button>
        <p class="live-privacy">Microphone active · audio is not recorded</p>
      </section>
      <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
    </main>`;
  document.querySelector('#stop-session')?.addEventListener('click', () => void stopSession());
}

let lastSampleSecond = -1;
function handleReading(reading: { speaking: boolean; wpm: number }): void {
  const second = Math.floor((Date.now() - activeStarted) / 1000);
  const state = classifyPace(reading.wpm, reading.speaking && reading.wpm > 0, settings.low, settings.high);
  if (second !== lastSampleSecond) {
    activeSamples.push({ at: second, wpm: reading.wpm, speaking: reading.speaking && reading.wpm > 0, state });
    lastSampleSecond = second;
  }
  const panel = document.querySelector('#live-state');
  if (!panel) return;
  panel.className = `live-state ${state}`;
  const copy = state === 'quiet' ? ['Listening', 'Speak when you’re ready', '—'] : state === 'slow' ? ['Below your band', `${reading.wpm} WPM`, '↓'] : state === 'fast' ? ['Over your band', `${reading.wpm} WPM`, '↑'] : ['In your target band', `${reading.wpm} WPM`, '✓'];
  document.querySelector('#live-label')!.textContent = copy[0];
  document.querySelector('#live-wpm')!.textContent = copy[1];
  document.querySelector('.state-symbol')!.textContent = copy[2];
  const marker = document.querySelector<HTMLElement>('#live-marker');
  if (marker && reading.wpm) marker.style.left = `${Math.max(0, Math.min(100, ((reading.wpm - 60) / 180) * 100))}%`;
  fastReadings = state === 'fast' ? fastReadings + 1 : 0;
  if (fastReadings >= 4 && Date.now() - lastNudge > 6000) { lastNudge = Date.now(); fastReadings = 0; void hapticCue(settings.pattern); }
}

function updateLiveClock(): void {
  const time = document.querySelector('#live-time');
  if (time) time.textContent = formatDuration(Math.floor((Date.now() - activeStarted) / 1000));
}

async function stopSession(): Promise<void> {
  audio?.stop(); audio = undefined; clearInterval(activeTimer);
  const durationSeconds = Math.max(1, Math.round((Date.now() - activeStarted) / 1000));
  const summary = sessionSummary(activeSamples, settings.low, settings.high);
  const session: SessionRecord = { id: crypto.randomUUID(), startedAt: new Date(activeStarted).toISOString(), durationSeconds, targetLow: settings.low, targetHigh: settings.high, ...summary, samples: activeSamples };
  try { await saveSession(session); sessions.unshift(session); } catch { /* still show the result */ }
  renderResult(session);
}

function renderResult(session: SessionRecord): void {
  app.innerHTML = shell(`<main id="main" class="result-main"><section class="result-hero"><p class="eyebrow">Practice complete</p><h1>${session.inBandPercent}% in your pace band</h1><p class="lede">${session.inBandPercent >= 70 ? 'You stayed in your selected band for most speaking time.' : session.averageWpm ? 'Use this result to plan your next rehearsal.' : 'Not enough speech was detected for a reliable pace estimate.'}</p><div class="result-stats"><div><strong>${session.averageWpm || '—'}</strong><span>average WPM</span></div><div><strong>${formatDuration(session.durationSeconds)}</strong><span>practice time</span></div><div><strong>${session.targetLow}–${session.targetHigh}</strong><span>target band</span></div></div>${sparkline(session)}<div class="hero-actions"><button class="button primary" id="practice-again" type="button">Practice again</button><button class="button secondary" id="back-home" type="button">Return to session history</button></div></section></main>`);
  document.querySelector('#practice-again')?.addEventListener('click', () => void startSession());
  document.querySelector('#back-home')?.addEventListener('click', renderHome);
  bindGlobal();
}

async function beginCalibration(): Promise<void> {
  const content = document.querySelector<HTMLElement>('#calibration-content')!;
  content.innerHTML = '<p class="calibration-status" role="status">Opening the microphone…</p>';
  const readings: number[] = [];
  const calibrationAudio = new AudioPacer();
  let remaining = 20;
  try {
    await calibrationAudio.start((reading) => { if (reading.speaking && reading.wpm >= 60) readings.push(reading.wpm); });
    content.innerHTML = `<div class="calibration-clock" aria-live="polite"><strong id="calibration-seconds">20</strong><span>seconds</span></div><p>Talk about a familiar topic. Pause naturally.</p><button class="button secondary" id="cancel-calibration" type="button">Cancel sample</button>`;
    const timer = window.setInterval(() => {
      remaining -= 1;
      const seconds = document.querySelector('#calibration-seconds'); if (seconds) seconds.textContent = String(remaining);
      if (remaining <= 0) {
        clearInterval(timer); calibrationAudio.stop();
        if (readings.length < 5) {
          content.innerHTML = `<p class="form-error" role="alert">We couldn’t detect enough speech. Move closer to the microphone or find a quieter spot, then try again.</p><button class="button primary" id="retry-calibration" type="button">Try another sample</button><button class="text-button" id="fallback-calibration" type="button">Use 120–150 WPM</button>`;
          document.querySelector('#retry-calibration')?.addEventListener('click', () => void beginCalibration());
          document.querySelector('#fallback-calibration')?.addEventListener('click', () => { settings = { ...settings, low: 120, high: 150 }; storeSettings(); closeDialog('calibration-dialog'); renderHome(); });
          return;
        }
        readings.sort((a, b) => a - b);
        const baseline = readings[Math.floor(readings.length / 2)];
        const [low, high] = suggestedBand(baseline);
        settings = { ...settings, baseline, low, high }; storeSettings();
        content.innerHTML = `<p class="calibration-result"><span>Natural baseline</span><strong>${baseline} WPM</strong></p><p>We set your starting band to ${low}–${high} WPM. You can adjust it anytime.</p><button class="button primary" id="finish-calibration" type="button">Use this pace band</button>`;
        document.querySelector('#finish-calibration')?.addEventListener('click', () => { closeDialog('calibration-dialog'); renderHome(); });
      }
    }, 1000);
    document.querySelector('#cancel-calibration')?.addEventListener('click', () => { clearInterval(timer); calibrationAudio.stop(); closeDialog('calibration-dialog'); renderHome(); });
  } catch (error) {
    calibrationAudio.stop();
    content.innerHTML = `<p class="form-error" role="alert">${escapeHtml(microphoneError(error))}</p><button class="button primary" id="retry-calibration" type="button">Try microphone again</button><button class="text-button" id="fallback-calibration" type="button">Use 120–150 WPM</button>`;
    document.querySelector('#retry-calibration')?.addEventListener('click', () => void beginCalibration());
    document.querySelector('#fallback-calibration')?.addEventListener('click', () => { settings = { ...settings, low: 120, high: 150 }; storeSettings(); closeDialog('calibration-dialog'); renderHome(); });
  }
}

function microphoneError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError') return 'Microphone access was blocked. Allow it in browser or device settings, then try again.';
  if (name === 'NotFoundError') return 'No microphone was found. Connect or enable a microphone, then try again.';
  return error instanceof Error ? error.message : 'The microphone could not start. Check permission and try again.';
}

async function hapticCue(pattern: Pattern): Promise<void> {
  const impacts = pattern === 'ridge' ? 1 : pattern === 'double' ? 2 : 3;
  for (let index = 0; index < impacts; index += 1) {
    try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch { navigator.vibrate?.(90); }
    if (index < impacts - 1) await new Promise((resolve) => setTimeout(resolve, 130));
  }
  showToast(`${impacts === 1 ? 'One tap' : `${impacts} taps`} sent.`);
}

function exportData(): void {
  const payload = { product: PRODUCT_SLUG, exportedAt: new Date().toISOString(), settings, sessions };
  downloadFile(JSON.stringify(payload, null, 2), 'pace-trail-export.json', 'application/json');
  downloadFile(csvForSessions(sessions), 'pace-trail-sessions.csv', 'text/csv');
  showToast('JSON and CSV exports downloaded.');
}

function downloadFile(content: string, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function handleImport(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
  try {
    const parsed: unknown = JSON.parse(await file.text());
    const imported = await importSessions(sessionsFromImport(parsed));
    sessions = await getSessions(); renderHome(); showToast(`Imported ${imported} session${imported === 1 ? '' : 's'}.`);
  } catch { showToast('That file is not a valid Pace Trail export.'); }
}

async function confirmClearData(): Promise<void> {
  if (!window.confirm(`Delete all ${sessions.length} saved practice session${sessions.length === 1 ? '' : 's'} from this device? This cannot be undone unless you exported a copy.`)) return;
  await clearSessions(); sessions = []; renderHome(); showToast('All session data was deleted.');
}

async function restoreLicense(event: Event): Promise<void> {
  event.preventDefault();
  const token = new FormData(event.currentTarget as HTMLFormElement).get('license')?.toString().trim(); if (!token) return;
  const error = document.querySelector('#license-error')!; error.textContent = 'Checking license…';
  const valid = await verifyLicense(token, true);
  if (valid) { closeDialog('restore-dialog'); renderHome(); showToast('Full session history is active.'); }
  else error.textContent = navigator.onLine ? 'That license is not active for this product. Check the token and try again.' : 'You’re offline. Reconnect to restore a license on this device.';
}

async function verifyLicense(token: string, force = false): Promise<boolean> {
  let cached: CachedVerdict | null = null;
  try { cached = JSON.parse(localStorage.getItem(storageKey(VERDICT_KEY)) ?? 'null') as CachedVerdict | null; } catch { /* reverify */ }
  if (!force && cached && Date.now() - cached.checkedAt < 86_400_000) return cached.valid;
  try {
    const response = await fetch(`${VERIFY_URL}?license=${encodeURIComponent(token)}`, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Verification unavailable');
    const result = await response.json() as { valid: boolean };
    const verdict = { valid: result.valid, checkedAt: Date.now() };
    localStorage.setItem(storageKey(VERDICT_KEY), JSON.stringify(verdict));
    if (result.valid) localStorage.setItem(storageKey(LICENSE_KEY), token); else localStorage.removeItem(storageKey(LICENSE_KEY));
    licenseActive = result.valid;
    return result.valid;
  } catch { return cached?.valid ?? false; }
}

async function acceptReturnedLicense(): Promise<void> {
  const url = new URL(location.href); const token = url.searchParams.get('license'); if (!token) return;
  localStorage.setItem(storageKey(LICENSE_KEY), token); url.searchParams.delete('license'); history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  licenseActive = true; localStorage.setItem(storageKey(VERDICT_KEY), JSON.stringify({ valid: true, checkedAt: 0 }));
  await verifyLicense(token, true);
}

async function installPwa(): Promise<void> {
  if (deferredInstall && 'prompt' in deferredInstall) {
    await (deferredInstall as Event & { prompt: () => Promise<void> }).prompt(); deferredInstall = undefined; return;
  }
  showToast(/iphone|ipad/i.test(navigator.userAgent) ? 'On iPhone: tap Share, then Add to Home Screen.' : 'Use your browser menu and choose “Install app”.');
}

function formatDuration(seconds: number): string { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }
function openDialog(id: string): void { document.querySelector<HTMLDialogElement>(`#${id}`)?.showModal(); }
function closeDialog(id: string): void { document.querySelector<HTMLDialogElement>(`#${id}`)?.close(); }
function showToast(message: string): void { const toast = document.querySelector<HTMLElement>('#toast'); if (!toast) return; toast.textContent = message; toast.hidden = false; setTimeout(() => { toast.hidden = true; }, 4500); }

function legalPage(kind: 'privacy' | 'terms'): string {
  const privacy = `<main id="main" class="legal-page"><p class="eyebrow">Policy · effective 5 September 2026</p><h1>Privacy policy</h1><p class="lede">Your speech audio stays on your device during free practice.</p><h2>What the app processes</h2><p>When you start a calibration or practice, the app requests microphone access and calculates short-lived audio energy measurements on your device. Raw audio is not recorded, transcribed, uploaded, or retained. The app stores derived pace samples, your target band, preferences, and session summaries locally in your browser or app storage.</p><h2>What leaves your device</h2><p>Nothing during free use. We do not use analytics, advertising pixels, third-party fonts, cookies, or tracking scripts. If you buy or verify a license, the license token passes through this app’s rate-limited verification endpoint to the Sociobot billing API. It is not stored by the endpoint. Sociobot/Dodo is the merchant of record and handles payment information under its own policy; this app never receives card details.</p><h2>Your control</h2><p>Use Export JSON and CSV to download copies. Use Clear session data to remove all practice history from this device. Removing the app or clearing site data also removes local data and the saved license token.</p><h2>Permissions and battery</h2><p>The microphone runs only while a calibration or practice is visibly active. Continuous audio processing can use additional battery. Closing or stopping the session releases the microphone.</p><h2>Contact</h2><p>Questions can be opened in the project’s <a href="https://github.com/B-Divyesh/sf-haptic-speaking-pacer/issues">public issue tracker</a>.</p></main>`;
  const terms = `<main id="main" class="legal-page"><p class="eyebrow">Terms · effective 5 September 2026</p><h1>Terms of use</h1><p class="lede">Haptic Speaking Pacer is a personal rehearsal aid, offered as-is.</p><h2>Appropriate use</h2><p>Use the app to practice your own speaking pace. Do not use it to monitor participants, make employment or educational decisions, diagnose a condition, or replace professional speech or medical advice. Pace estimates are approximate and can be affected by background sound, microphone placement, accent, and pauses.</p><h2>Purchase and license</h2><p>The $7 one-time license shows unlimited session history and alternate haptic patterns. Core pacing, custom targets, calibration, accessibility, safety notices, and export remain free. Sociobot/Dodo is the merchant of record. Checkout, receipts, and refunds are handled there. A license is for personal use and may be restored on your devices.</p><h2>Availability</h2><p>The app may change or be unavailable. Offline use requires one successful initial load. Browser and device restrictions can limit microphone or haptic behavior. The unsigned IPA requires your own sideloading or signing method and may need periodic re-signing.</p><h2>Warranty and liability</h2><p>To the extent permitted by law, the software is provided without warranties. The authors are not liable for indirect or consequential loss arising from use of the app.</p><h2>Privacy</h2><p>See the <a href="/privacy/">privacy policy</a> for the clear description of local processing and billing verification.</p></main>`;
  return shell(kind === 'privacy' ? privacy : terms, kind);
}

function notFoundPage(): string {
  return shell(`<main id="main" class="not-found-page"><section aria-labelledby="not-found-title"><p class="eyebrow">Error 404</p><h1 id="not-found-title">Page not found</h1><p class="lede">This page does not exist. Open the pacer or try the sample sessions.</p><div class="hero-actions"><a class="button primary" href="/">Open the pacer</a><a class="button secondary" href="/demo">Try sample data</a></div></section></main>`);
}

function updateNetworkState(): void { const strip = document.querySelector<HTMLElement>('#network-strip'); if (strip) strip.hidden = navigator.onLine; }
function bindGlobal(): void {
  document.querySelector('#theme-toggle')?.addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme !== 'dark'; document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem(storageKey('pace-theme'), dark ? 'dark' : 'light');
  });
}

async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing; worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          showToast('An update is ready. Reload to use the new map.');
          worker.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });
  } catch { /* app remains usable without install support */ }
}

async function init(): Promise<void> {
  document.documentElement.dataset.theme = localStorage.getItem(storageKey('pace-theme')) ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  window.addEventListener('online', updateNetworkState); window.addEventListener('offline', updateNetworkState);
  window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); deferredInstall = event; });
  if (!demoMode) await acceptReturnedLicense();
  const token = localStorage.getItem(storageKey(LICENSE_KEY)); if (token) void verifyLicense(token).then((valid) => { if (licenseActive !== valid) { licenseActive = valid; if (location.pathname === '/' || location.pathname === '/demo') renderHome(); } });
  if (document.body.dataset.page === 'not-found') {
    document.title = 'Page not found — Haptic Speaking Pacer';
    app.innerHTML = notFoundPage();
  } else if (location.pathname.startsWith('/privacy')) app.innerHTML = legalPage('privacy');
  else if (location.pathname.startsWith('/terms')) app.innerHTML = legalPage('terms');
  else {
    try {
      sessions = await getSessions();
      if (demoMode && !sessions.length) {
        await importSessions(DEMO_SESSIONS);
        sessions = await getSessions();
      }
    } catch { showToast('Session storage is unavailable in this browser.'); }
    document.title = demoMode ? 'Demo — Haptic Speaking Pacer' : 'Haptic Speaking Pacer — speech pace cues';
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = `${location.origin}${demoMode ? '/demo' : '/'}`;
    renderHome();
  }
  bindGlobal(); updateNetworkState(); void registerServiceWorker();
}

void init();
