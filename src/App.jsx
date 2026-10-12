import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import { api } from './api.js';

const AppContext = createContext(null);
const useApp = () => useContext(AppContext);
const pipeline = ['QUEUED','VALIDATING','SEARCHING_DATA','DOWNLOADING','PREPROCESSING','FLOOD_MAPPING','DAMAGE_ANALYSIS','CONNECTIVITY_ANALYSIS','GENERATING_REPORT','COMPLETED','FAILED'];

function Icon({ name, size = 18 }) {
  const paths = {
    plus: <><path d="M12 5v14M5 12h14"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.6.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.6-.9l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.9l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.6-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.6.9l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.9Z" transform="translate(-1 -1)"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    eyeOff: <><path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.2A11 11 0 0 1 12 5c6.4 0 10 7 10 7a15 15 0 0 1-3.1 3.8M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7a10 10 0 0 0 3.5-.6"/></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    alert: <><path d="M10.3 3.9 1.8 18.4A2 2 0 0 0 3.5 21h17a2 2 0 0 0 1.7-2.6L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></>,
    globe: <><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.map}</svg>;
}

function Brand({ light = false }) {
  return <div className={`brand ${light ? 'brand-light' : ''}`}><span className="brand-mark"><Icon name="layers" size={20}/></span><span><b>FLOODSIGHT</b><small>AI · FLOOD INTELLIGENCE</small></span></div>;
}

function AppProvider({ children }) {
  const [draft, setDraft] = useState({ location: '', date: '', bbox: null });
  // Restored from sessionStorage so a page reload keeps the active analysis id.
  const [analysisId, setAnalysisId] = useState(() => sessionStorage.getItem('floodsight-analysis-id') || '');
  const [theme, setTheme] = useState('dark');
  const [profile, setProfile] = useState({ name: '', username: '', email: '' });
  // Authentication is only ever confirmed by the backend. Until /api/auth/me answers
  // the status stays 'loading' so the UI never reports a user that is not signed in.
  const [auth, setAuth] = useState({ status: 'loading', user: null });
  const updateAnalysisId = useCallback((value) => {
    setAnalysisId(value);
    if (value) sessionStorage.setItem('floodsight-analysis-id', String(value));
    else sessionStorage.removeItem('floodsight-analysis-id');
  }, []);
  const applyUser = useCallback((user) => {
    if (!user) {
      setProfile({ name: '', username: '', email: '' });
      setAuth({ status: 'anonymous', user: null });
      return;
    }
    setProfile({ name: user.full_name || '', username: (user.email || '').split('@')[0], email: user.email || '' });
    setAuth({ status: 'authenticated', user });
  }, []);
  const refreshAuth = useCallback(async () => {
    try {
      const user = await api.me();
      applyUser(user);
      return user;
    } catch {
      applyUser(null);
      return null;
    }
  }, [applyUser]);
  useEffect(() => { refreshAuth(); }, [refreshAuth]);
  useEffect(() => {
    const onUnauthorized = () => applyUser(null);
    window.addEventListener('floodsight:unauthorized', onUnauthorized);
    return () => window.removeEventListener('floodsight:unauthorized', onUnauthorized);
  }, [applyUser]);
  const login = useCallback(async (credentials) => {
    const data = await api.login(credentials);
    applyUser(data && data.user);
    return data && data.user;
  }, [applyUser]);
  const signup = useCallback(async (payload) => {
    const data = await api.register(payload);
    applyUser(data && data.user);
    return data && data.user;
  }, [applyUser]);
  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // The backend may already consider the session gone; clear local state regardless.
    }
    applyUser(null);
  }, [applyUser]);
  const value = useMemo(() => ({ draft, setDraft, analysisId, setAnalysisId: updateAnalysisId, theme, setTheme, profile, setProfile, auth, login, signup, logout, refreshAuth }), [draft, analysisId, theme, profile, auth, login, signup, logout, refreshAuth, updateAnalysisId]);
  return <AppContext.Provider value={value}><div className={`app-shell theme-${theme}`}>{children}</div></AppContext.Provider>;
}

function AuthLoading() {
  return <div role="status" aria-live="polite" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}><span className="status-pill"><i/> VERIFYING SESSION</span></div>;
}

function RequireAuth({ children }) {
  const { auth } = useApp();
  const location = useLocation();
  if (auth.status === 'loading') return <AuthLoading/>;
  if (auth.status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}

function PublicOnly({ children }) {
  const { auth } = useApp();
  if (auth.status === 'loading') return <AuthLoading/>;
  if (auth.status === 'authenticated') return <Navigate to="/workspace" replace/>;
  return children;
}

export default function App() {
  return <AppProvider><Routes>
    <Route path="/" element={<Navigate to="/workspace" replace/>}/>
    <Route path="/login" element={<PublicOnly><AuthPage mode="login"/></PublicOnly>}/>
    <Route path="/signup" element={<PublicOnly><AuthPage mode="signup"/></PublicOnly>}/>
    <Route path="/intro" element={<RequireAuth><IntroPage/></RequireAuth>}/>
    <Route path="/workspace" element={<RequireAuth><WorkspacePage/></RequireAuth>}/>
    <Route path="/analyze" element={<RequireAuth><AnalyzePage/></RequireAuth>}/>
    <Route path="/review" element={<RequireAuth><ReviewPage/></RequireAuth>}/>
    <Route path="/data-check" element={<RequireAuth><DataCheckPage/></RequireAuth>}/>
    <Route path="/analysis" element={<RequireAuth><ProcessingPage/></RequireAuth>}/>
    <Route path="/results" element={<RequireAuth><ResultsPage/></RequireAuth>}/>
    <Route path="/dashboard" element={<Navigate to="/workspace" replace/>}/>
    <Route path="/reports" element={<RequireAuth><ReportsPage/></RequireAuth>}/>
    <Route path="/report" element={<RequireAuth><ReportPage/></RequireAuth>}/>
    <Route path="/settings" element={<RequireAuth><SettingsPage/></RequireAuth>}/>
    <Route path="*" element={<Navigate to="/login" replace/>}/>
  </Routes></AppProvider>;
}

function AuthPage({ mode }) {
  const signup = mode === 'signup';
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup: register } = useApp();
  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    const email = form.email.trim();
    if (!email || !form.password) return setError('Enter your email and password to continue.');
    if (signup && !form.name.trim()) return setError('Enter your full name to create an account.');
    if (signup && form.password !== form.confirm) return setError('Passwords do not match.');
    if (signup && form.password.length < 8) return setError('Use a password with at least 8 characters.');
    setSubmitting(true);
    try {
      if (signup) await register({ email, password: form.password, full_name: form.name.trim() });
      else await login({ email, password: form.password, remember });
      const from = location.state && location.state.from ? location.state.from : '/intro';
      navigate(from, { replace: true });
    } catch (err) {
      setError((err && err.message) ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };
  return <main className="auth-page">
    <div className="auth-visual">
      <div className="auth-image"></div><div className="auth-image-overlay"></div>
      <div className="auth-brand"><Brand light/></div>
      <div className="auth-visual-copy">
        <div className="eyebrow"><span className="eyebrow-dot"></span> SATELLITE-POWERED FLOOD INTELLIGENCE</div>
        <h1>See the flood.<br/><em>Understand the impact.</em></h1>
        <p>Turn satellite imagery into decision-ready flood intelligence — from inundation extent to infrastructure impact and settlement connectivity.</p>
        <div className="triad">
          <div><span className="triad-letter">01 / WHERE</span><b>Flood extent</b></div>
          <div><span className="triad-letter">02 / WHAT</span><b>Affected infrastructure</b></div>
          <div><span className="triad-letter">03 / WHO</span><b>Cut-off settlements</b></div>
        </div>
      </div>
      <div className="visual-footer"><span>EARTH OBSERVATION · DISASTER RESPONSE</span><span>FLOODSIGHT AI / 01</span></div>
    </div>
    <div className="auth-panel">
      <div className="auth-panel-top"><span>FLOODSIGHT AI</span><span className="status-pill"><i/> SYSTEM READY</span></div>
      <div className="auth-form-wrap">
        <div className="form-kicker">{signup ? 'CREATE YOUR ACCOUNT' : 'WELCOME BACK'}</div>
        <h2>{signup ? 'Get started with FloodSight' : 'Sign in to FloodSight'}</h2>
        <p className="form-subtitle">{signup ? 'Create an account to access your flood intelligence workspace.' : 'Access your flood intelligence workspace.'}</p>
        <form onSubmit={submit} className="auth-form">
          {signup && <label>Full Name<input autoComplete="name" placeholder="Your full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>}
          <label>Email<input autoComplete="username" type="email" placeholder="you@organization.org" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
          <label>Password<div className="password-field"><input autoComplete={signup ? 'new-password' : 'current-password'} type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/><button className="icon-button" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={()=>setShowPassword(!showPassword)}><Icon name={showPassword ? 'eyeOff' : 'eye'}/></button></div></label>
          {signup && <label>Confirm Password<input autoComplete="new-password" type={showPassword ? 'text' : 'password'} placeholder="Confirm your password" value={form.confirm} onChange={e=>setForm({...form,confirm:e.target.value})}/></label>}
          {!signup && <div className="form-options"><label className="check-label"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/> <span>Remember me</span></label><button type="button" className="text-button" onClick={()=>setError('Password recovery is not available in this build.')}>Forgot password?</button></div>}
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="button button-primary button-full" type="submit" disabled={submitting}>{submitting ? 'Please wait…' : (signup ? 'Create Account' : 'Login')} <Icon name="arrow" size={17}/></button>
        </form>
        <div className="or-divider"><span></span><small>OR</small><span></span></div>
        <button className="button button-google button-full" onClick={()=>setError('Google sign-in is not available in this build.')}><span className="google-g">G</span>Continue with Google</button>
        <p className="auth-switch">{signup ? 'Already have an account?' : "Don't have an account?"} <NavLink to={signup ? '/login' : '/signup'}>{signup ? 'Log in' : 'Sign up'}</NavLink></p>
      </div>
      <div className="auth-panel-footer"><span>© 2026 FLOODSIGHT AI</span><span>PRIVACY-FIRST · EARTH OBSERVATION</span></div>
    </div>
  </main>;
}

function IntroPage() {
  const navigate = useNavigate();
  const enter = () => navigate('/workspace');
  return <main className="intro-page">
    <section className="intro-hero" id="about">
      <div className="intro-bg"></div><div className="intro-shade"></div>
      <header className="intro-nav"><Brand light/><nav><a href="#about">About</a><a href="#data-sources">Data Sources</a><a href="#use-cases">Use Cases</a><a href="#how-it-works">How It Works</a></nav><button className="button button-outline-light nav-enter" onClick={enter}>Open workspace <Icon name="arrow" size={16}/></button></header>
      <div className="intro-hero-content"><div className="eyebrow"><span className="eyebrow-dot"></span> EARTH OBSERVATION FOR EMERGENCY RESPONSE</div><h1>MAPPING FLOOD DAMAGE<br/><span>FROM SPACE</span></h1><p>See the flood. Understand the impact.</p><div className="hero-cards">
        <div><span>01 / WHERE</span><b>Flood extent and<br/>affected areas</b></div><div><span>02 / WHAT</span><b>Affected buildings,<br/>roads and infrastructure</b></div><div><span>03 / WHO</span><b>Potentially cut-off<br/>settlements</b></div>
      </div><button className="button button-primary hero-cta" onClick={enter}>ENTER FLOODSIGHT <Icon name="arrow" size={18}/></button></div>
      <a className="scroll-indicator" href="#how-it-works"><span className="scroll-line"></span> SCROLL TO EXPLORE <span className="scroll-chevron">⌄</span></a>
      <div className="hero-coordinate-note"><span>REMOTE SENSING</span><span>DECISION SUPPORT</span><span>GEOSPATIAL ANALYSIS</span></div>
    </section>
    <section className="intro-section process-section" id="how-it-works"><div className="section-kicker">THE WORKFLOW / 01</div><div className="section-heading-row"><h2>From Satellite Data<br/><em>to Actionable Insights</em></h2><p>A structured workflow designed to translate earth-observation data into information that can support response planning.</p></div><div className="workflow-grid">{[['01','Collect Satellite Data','Acquire suitable satellite observations for the selected area and date.'],['02','AI-Powered Analysis','Prepare imagery and derive flood-related evidence from the data.'],['03','Detect Impacted Infrastructure','Assess possible impacts to buildings, roads, bridges and settlement access.'],['04','Generate Situation Report','Bring validated findings into a concise, decision-ready report.']].map(item=><article className="workflow-card" key={item[0]}><span className="workflow-number">{item[0]}</span><div className="workflow-symbol"><Icon name={item[0]==='01'?'globe':item[0]==='02'?'layers':item[0]==='03'?'map':'file'} size={22}/></div><h3>{item[1]}</h3><p>{item[2]}</p><span className="workflow-rule"></span></article>)}</div></section>
    <section className="intro-section questions-section"><div className="section-kicker">THREE QUESTIONS / 02</div><h2>WHERE <span>•</span> WHAT <span>•</span> WHO</h2><div className="question-grid"><article><span>WHERE</span><h3>Map the extent</h3><p>Understand the mapped flood extent and identify the areas potentially affected by inundation.</p><div className="question-visual question-map"><Icon name="map" size={36}/></div></article><article><span>WHAT</span><h3>Assess infrastructure</h3><p>Review buildings, road segments, bridges and possible surface changes in the selected area.</p><div className="question-visual question-infra"><Icon name="layers" size={36}/></div></article><article><span>WHO</span><h3>Understand connectivity</h3><p>Identify settlements that may be connected, cut off or still require further assessment.</p><div className="question-visual question-connect"><Icon name="globe" size={36}/></div></article></div></section>
    <section className="intro-section sources-section" id="data-sources"><div className="section-kicker">OBSERVATION INPUTS / 03</div><div className="section-heading-row"><h2>Trusted Satellite<br/><em>Data Sources</em></h2><p>Designed to integrate open earth-observation sources and supporting geospatial datasets when available from the backend.</p></div><div className="source-grid"><article><div className="source-logo">S1</div><div><h3>Sentinel-1</h3><p>SAR imagery</p><small>Radar observations</small></div><Icon name="arrow" size={18}/></article><article><div className="source-logo">S2</div><div><h3>Sentinel-2</h3><p>Optical imagery</p><small>Multispectral observations</small></div><Icon name="arrow" size={18}/></article><article><div className="source-logo source-logo-c">C</div><div><h3>Copernicus</h3><p>Open access</p><small>Earth observation programme</small></div><Icon name="arrow" size={18}/></article><article><div className="source-logo source-logo-g"><Icon name="globe" size={24}/></div><div><h3>Global Coverage</h3><p>Regular updates</p><small>Subject to source availability</small></div><Icon name="arrow" size={18}/></article></div></section>
    <section className="intro-section use-section" id="use-cases"><div className="section-kicker">DESIGNED FOR RESPONSE / 04</div><div className="section-heading-row"><h2>Built for<br/><em>Real-World Impact</em></h2><p>Support situational awareness across teams that need to understand flood extent, potential infrastructure impacts and access constraints.</p></div><div className="use-grid">{[['01','Disaster Response','Build a clearer picture of affected areas.'],['02','Government Agencies','Support planning and coordination.'],['03','NGOs & Humanitarian Aid','Inform prioritization of field assessment.'],['04','Researchers','Explore geospatial evidence and methods.']].map(i=><article key={i[0]}><span>{i[0]}</span><h3>{i[1]}</h3><p>{i[2]}</p><Icon name="arrow" size={18}/></article>)}</div></section>
    <section className="intro-final"><div className="intro-final-bg"></div><div className="section-kicker">FLOODSIGHT AI / READY WHEN YOU ARE</div><h2>READY TO ANALYZE<br/><em>A FLOOD EVENT?</em></h2><p>Define your area of interest and flood date to start a new analysis.</p><button className="button button-primary" onClick={enter}>ENTER FLOODSIGHT <Icon name="arrow" size={18}/></button></section>
    <footer className="intro-footer"><Brand light/><span>Mapping flood damage from space.</span><span>© 2026 FLOODSIGHT AI</span></footer>
  </main>;
}

function MapView({ draft, setDraft, interactive = false, height = '100%', onMapReady, dataLayers = null }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const drawRef = useRef({ start: null, dragging: false });
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const setterRef = useRef(setDraft);
  setterRef.current = setDraft;
  const dataLayersRef = useRef(dataLayers);
  dataLayersRef.current = dataLayers;
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: { type: 'raster', tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png', 'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png', 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' }
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-saturation': -0.55, 'raster-contrast': 0.12, 'raster-brightness-min': 0.03, 'raster-brightness-max': 0.82 } }]
      },
      center: [76.27, 10.85], zoom: 6.2, attributionControl: false
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    // MapLibre can initialize while its parent grid/flex panel is still settling.
    // Resize after layout and whenever the map panel changes size.
    const resizeMap = () => { if (mapRef.current === map) map.resize(); };
    const resizeObserver = typeof ResizeObserver !== 'undefined' && mapContainer.current
      ? new ResizeObserver(() => resizeMap()) : null;
    if (resizeObserver && mapContainer.current) resizeObserver.observe(mapContainer.current);
    requestAnimationFrame(resizeMap);
    setTimeout(resizeMap, 250);
    setTimeout(resizeMap, 800);
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.on('error', (event) => {
      const message = event?.error?.message || 'Map tiles could not be loaded.';
      console.warn('[FloodSight map]', message);
      const node = mapContainer.current?.parentElement?.querySelector('.map-load-error');
      if (node) node.hidden = false;
    });
    map.on('load', () => {
      resizeMap();
      map.addSource('aoi', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'aoi-fill', type: 'fill', source: 'aoi', paint: { 'fill-color': '#36b9d8', 'fill-opacity': 0.12 } });
      map.addLayer({ id: 'aoi-outline', type: 'line', source: 'aoi', paint: { 'line-color': '#54d7f2', 'line-width': 2, 'line-dasharray': [2, 1.5] } });
      map.addSource('result-flood', { type: 'geojson', data: emptyGeoJSON() });
      map.addLayer({ id: 'result-flood-fill', type: 'fill', source: 'result-flood', paint: { 'fill-color': '#df797f', 'fill-opacity': 0.35 } });
      map.addLayer({ id: 'result-flood-outline', type: 'line', source: 'result-flood', paint: { 'line-color': '#ed9298', 'line-width': 1.6 } });
      map.addSource('result-infrastructure', { type: 'geojson', data: emptyGeoJSON() });
      map.addLayer({ id: 'result-infrastructure-line', type: 'line', source: 'result-infrastructure', paint: { 'line-color': '#f2c779', 'line-width': 2 } });
      map.addLayer({ id: 'result-infrastructure-points', type: 'circle', source: 'result-infrastructure', paint: { 'circle-radius': 4, 'circle-color': '#f2c779', 'circle-stroke-color': '#132331', 'circle-stroke-width': 1 } });
      map.addSource('result-settlements', { type: 'geojson', data: emptyGeoJSON() });
      map.addLayer({ id: 'result-settlements-points', type: 'circle', source: 'result-settlements', paint: { 'circle-radius': 4, 'circle-color': '#78d3c0', 'circle-stroke-color': '#102431', 'circle-stroke-width': 1.2 } });
      onMapReady?.(map);
      syncBox(map, draftRef.current.bbox);
      syncDataLayers(map, dataLayersRef.current);
    });
    if (interactive) {
      map.getCanvas().style.cursor = 'crosshair';
      map.on('mousedown', (e) => {
        drawRef.current = { start: e.lngLat, dragging: true };
        map.dragPan.disable();
      });
      map.on('mousemove', (e) => {
        if (!drawRef.current.dragging || !drawRef.current.start) return;
        const a = drawRef.current.start, b = e.lngLat;
        syncBox(map, [[Math.min(a.lng,b.lng),Math.min(a.lat,b.lat)],[Math.max(a.lng,b.lng),Math.max(a.lat,b.lat)]]);
      });
      map.on('mouseup', (e) => {
        if (!drawRef.current.dragging || !drawRef.current.start) return;
        const a = drawRef.current.start, b = e.lngLat;
        drawRef.current.dragging = false; drawRef.current.start = null; map.dragPan.enable();
        const bbox = [[Number(Math.min(a.lng,b.lng).toFixed(5)),Number(Math.min(a.lat,b.lat).toFixed(5))],[Number(Math.max(a.lng,b.lng).toFixed(5)),Number(Math.max(a.lat,b.lat).toFixed(5))]];
        if (Math.abs(bbox[1][0]-bbox[0][0]) > 0.001 && Math.abs(bbox[1][1]-bbox[0][1]) > 0.001) {
          setterRef.current(prev => ({ ...prev, bbox }));
        }
      });
    }
    mapRef.current = map;
    return () => { resizeObserver?.disconnect(); map.remove(); mapRef.current = null; };
  }, [interactive]);
  useEffect(() => {
    const map = mapRef.current;
    if (map?.isStyleLoaded()) syncBox(map, draft.bbox);
  }, [draft.bbox]);
  useEffect(() => {
    const map = mapRef.current;
    if (map?.isStyleLoaded()) syncDataLayers(map, dataLayers);
  }, [dataLayers]);
  return <div className="map-view" style={{ height }}><div ref={mapContainer} className="map-canvas"/><div className="map-load-error" hidden><b>Map tiles are unavailable</b><span>Check your internet connection and refresh the page. The map uses OpenStreetMap tiles.</span></div>{interactive && <div className="map-draw-hint"><span className="hint-crosshair">＋</span><span><b>Draw an area of interest</b><small>Click and drag on the map to define a bounding box</small></span></div>}<div className="map-status"><span className="map-status-dot"></span> BASE MAP <span className="map-status-divider"></span> {draft.bbox ? 'AREA SELECTED' : 'NO AREA SELECTED'}</div></div>;
}

function emptyGeoJSON() { return { type: 'FeatureCollection', features: [] }; }

function syncDataLayers(map, dataLayers) {
  if (!map || !map.getSource('result-flood')) return;
  const validGeoJSON = (value) => {
    if (!value) return emptyGeoJSON();
    if (value.type === 'FeatureCollection' && Array.isArray(value.features)) return value;
    if (value.type === 'Feature' && value.geometry) return { type: 'FeatureCollection', features: [value] };
    if (value.geojson) return validGeoJSON(value.geojson);
    if (Array.isArray(value.features)) return { type: 'FeatureCollection', features: value.features };
    return emptyGeoJSON();
  };
  const layers = dataLayers?.layers || dataLayers || {};
  const generic = validGeoJSON(layers);
  const flood = validGeoJSON(layers.flood_extent || layers.flood || layers.flood_layer);
  const infrastructure = validGeoJSON(layers.infrastructure || layers.roads || layers.infrastructure_layer);
  const settlements = validGeoJSON(layers.settlements || layers.settlement_layer);
  const isEmpty = (g) => !g.features.length;
  map.getSource('result-flood').setData(!isEmpty(flood) ? flood : (!isEmpty(generic) ? generic : emptyGeoJSON()));
  map.getSource('result-infrastructure').setData(infrastructure);
  map.getSource('result-settlements').setData(settlements);
}

function syncBox(map, bbox) {
  if (!map || !map.getSource('aoi')) return;
  const features = bbox ? [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[bbox[0][0],bbox[0][1]],[bbox[1][0],bbox[0][1]],[bbox[1][0],bbox[1][1]],[bbox[0][0],bbox[1][1]],[bbox[0][0],bbox[0][1]]] ] } }] : [];
  map.getSource('aoi').setData({ type: 'FeatureCollection', features });
}

function AppLayout({ children, active, title, subtitle, action }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [apiConnection, setApiConnection] = useState('checking');
  const { profile, logout } = useApp();
  const navigate = useNavigate();
  const signOut = useCallback(async () => { await logout(); navigate('/login', { replace: true }); }, [logout, navigate]);
  useEffect(() => {
    let active = true;
    api.listAnalyses().then(() => { if (active) setApiConnection('connected'); })
      .catch(() => { if (active) setApiConnection('offline'); });
    return () => { active = false; };
  }, []);
  const navItems = [{ to: '/workspace', icon: 'grid', label: 'Workspace' }, { to: '/workspace?view=analyses', icon: 'clock', label: 'My Analyses' }, { to: '/reports', icon: 'file', label: 'Reports' }];
  const nav = <><div className="sidebar-brand"><Brand/></div><button className="button button-primary sidebar-new" onClick={()=>navigate('/analyze')}><Icon name="plus" size={17}/> New Analysis</button><div className="sidebar-label">WORKSPACE</div><nav className="sidebar-nav">{navItems.map(item=><NavLink key={item.label} to={item.to} className={({isActive})=>`side-link ${((item.label==='Workspace'&&active==='workspace')||(item.label==='My Analyses'&&active==='analyses')||(item.label==='Reports'&&active==='reports'))?'active':''}`}><Icon name={item.icon}/><span>{item.label}</span>{item.label==='My Analyses'&&<span className="nav-count">0</span>}</NavLink>)}</nav><div className="sidebar-spacer"/><div className="sidebar-bottom"><NavLink to="/settings" className={({isActive})=>`side-link ${active==='settings'?'active':''}`}><Icon name="settings"/><span>Settings</span></NavLink><div className="sidebar-user"><div className="user-avatar">{(profile.name||profile.email||'F').slice(0,1).toUpperCase()}</div><div><b>{profile.name || 'FloodSight User'}</b><small>{profile.email || 'Workspace account'}</small></div><button className="icon-button" title="Log out" onClick={signOut}><Icon name="logout" size={16}/></button></div></div></>;
  return <div className="product-layout"><aside className={`sidebar ${mobileOpen?'sidebar-open':''}`}>{nav}</aside>{mobileOpen&&<button className="mobile-scrim" onClick={()=>setMobileOpen(false)} aria-label="Close menu"/>}<div className="product-main"><header className="topbar"><button className="mobile-menu icon-button" onClick={()=>setMobileOpen(!mobileOpen)} aria-label="Toggle menu"><Icon name={mobileOpen?'close':'menu'}/></button><div className="breadcrumb"><span>FLOODSIGHT</span><Icon name="chevron" size={14}/><b>{title}</b></div><div className="topbar-right"><span className={`connection-state connection-${apiConnection}`} title={apiConnection === 'connected' ? 'Analysis backend responded successfully' : apiConnection === 'checking' ? 'Checking analysis backend connection' : 'Analysis backend unavailable; backend-dependent features cannot run'}><i/> {apiConnection === 'connected' ? 'API CONNECTED' : apiConnection === 'checking' ? 'CHECKING API' : 'API NOT CONNECTED'}</span><div className="topbar-avatar">{(profile.name||profile.email||'F').slice(0,1).toUpperCase()}</div></div></header><main className="page-content">{(title||subtitle||action)&&<div className="page-heading"><div><div className="section-kicker">FLOODSIGHT WORKSPACE</div><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>}{children}</main><footer className="product-footer"><span>FLOODSIGHT AI <span className="footer-separator">/</span> FLOOD INTELLIGENCE</span><span>Results are only shown when supplied by the analysis backend.</span></footer></div></div>;
}

function WorkspacePage() {
  const navigate = useNavigate();
  const { draft, setDraft } = useApp();
  const [records, setRecords] = useState([]);
  const [apiState, setApiState] = useState('idle');
  const [apiMessage, setApiMessage] = useState('');
  const location = useLocation();
  const view = new URLSearchParams(location.search).get('view') || 'workspace';
  useEffect(() => {
    let live = true;
    api.listAnalyses().then(data => { if (live) { setRecords(Array.isArray(data) ? data : (data?.items || [])); setApiState('connected'); } })
      .catch(() => { if (live) { setRecords([]); setApiState('offline'); setApiMessage('Analysis records will appear when the FastAPI backend is connected.'); } });
    return () => { live = false; };
  }, []);
  return <AppLayout active={view==='analyses'?'analyses':'workspace'} title={view==='analyses'?'My Analyses':'FloodSight Workspace'} subtitle={view==='analyses'?'Review analysis jobs returned by your connected backend.':'Ready to analyze a flood event? Define an area and flood date to begin satellite-based analysis.'} action={<button className="button button-primary" onClick={()=>navigate('/analyze')}><Icon name="plus" size={17}/> START NEW ANALYSIS</button>}>
    <div className="workspace-meta"><div className="meta-item"><span className="meta-icon"><Icon name="globe"/></span><div><small>DATA SOURCE</small><b>{apiState==='connected'?'Backend connected':'Awaiting backend'}</b></div></div><div className="meta-item"><span className="meta-icon"><Icon name="clock"/></span><div><small>ACTIVE ANALYSIS</small><b>None</b></div></div><div className="meta-item"><span className="meta-icon"><Icon name="layers"/></span><div><small>RESULT LAYERS</small><b>No data loaded</b></div></div><div className="workspace-updated"><span className="status-dot neutral"></span>{apiState==='connected'?'Backend response received':'Waiting for connection'}</div></div>
    {view==='analyses' && <div className="list-panel"><div className="panel-header"><div><h3>Analysis history</h3><p>Records returned by the connected backend</p></div><span className="count-badge">{records.length} records</span></div>{records.length ? records.map((r,i)=><button className="record-row" key={r.id||i} onClick={()=>navigate('/results?id='+encodeURIComponent(r.id||''))}><span className="record-icon"><Icon name="file"/></span><span><b>{r.name||r.location||'Untitled analysis'}</b><small>{r.status||'Status unavailable'} · {r.flood_date||r.date||'Date unavailable'}</small></span><Icon name="chevron"/></button>) : <EmptyState icon="layers" title="No analyses yet" text="Your completed and in-progress analyses will appear here." actionLabel="Start new analysis" onAction={()=>navigate('/analyze')}/>}</div>}
    {view!=='analyses' && <div className="workspace-grid">
      <section className="map-panel"><div className="panel-header map-panel-header"><div><div className="panel-eyebrow">GEOSPATIAL WORKSPACE</div><h3>Area overview</h3><p>Explore the base map or define an area for a new analysis.</p></div><button className="button button-secondary button-small" onClick={()=>navigate('/analyze')}><Icon name="pin" size={15}/> Define area</button></div><div className="workspace-map"><MapView draft={draft} setDraft={setDraft}/><div className="map-empty-overlay"><div className="empty-orbit"><Icon name="layers" size={27}/></div><span className="empty-kicker">NO ACTIVE ANALYSIS</span><h3>Your workspace is ready</h3><p>Your workspace will populate with real results after an analysis is completed.</p><button className="button button-primary" onClick={()=>navigate('/analyze')}>START NEW ANALYSIS <Icon name="arrow" size={16}/></button></div></div><div className="map-legend"><span><i className="legend-square selected"/> Selected area</span><span><i className="legend-square flood"/> Flood extent</span><span><i className="legend-line"/> Infrastructure</span><small>Layers appear when real results are available.</small></div></section>
      <aside className="workspace-aside"><section className="quickstart-card"><div className="quickstart-top"><span className="quickstart-icon"><Icon name="pin" size={20}/></span><span className="step-tag">START HERE</span></div><h3>Start a new analysis</h3><p>Choose your area of interest and the flood event date. FloodSight will check data availability before processing begins.</p><button className="button button-primary button-full" onClick={()=>navigate('/analyze')}>Define area & date <Icon name="arrow" size={16}/></button><div className="quickstart-steps"><span><i>1</i> Define area</span><span><i>2</i> Review inputs</span><span><i>3</i> Check data</span></div></section>
      <section className="empty-facts-card"><div className="panel-eyebrow">IMPACT SUMMARY</div><h3>WHERE / WHAT / WHO</h3><div className="fact-row"><span><b>WHERE</b><small>Flood extent</small></span><strong>—</strong></div><div className="fact-row"><span><b>WHAT</b><small>Affected infrastructure</small></span><strong>—</strong></div><div className="fact-row"><span><b>WHO</b><small>Settlement connectivity</small></span><strong>—</strong></div><div className="facts-note"><Icon name="shield" size={15}/> No result data has been received.</div></section>
      <section className="backend-card"><span className="backend-icon"><Icon name="globe"/></span><div><b>Backend connection</b><p>{apiMessage||'Waiting for analysis service response.'}</p></div><span className={`connection-led ${apiState==='connected'?'led-good':''}`}></span></section></aside>
    </div>}
  </AppLayout>;
}

function AnalyzePage() {
  const { draft, setDraft } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [searchError, setSearchError] = useState('');
  const [lookupBusy, setLookupBusy] = useState(false);
  const mapHandle = useRef(null);
  const doSearch = async (e) => {
    e?.preventDefault(); setSearchError('');
    if (!search.trim()) return;
    setLookupBusy(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(search.trim())}`, { headers: { 'Accept-Language': 'en' } });
      if (!res.ok) throw new Error('Location search is temporarily unavailable.');
      const found = await res.json();
      if (!found.length) throw new Error('No matching location found. Try a more specific place name.');
      const item = found[0], lon = Number(item.lon), lat = Number(item.lat);
      setDraft(prev => ({ ...prev, location: item.display_name, bbox: prev.bbox || null }));
      if (mapHandle.current) mapHandle.current.flyTo({ center: [lon,lat], zoom: 10, essential: true });
    } catch (err) { setSearchError(err.message || 'Could not search this location.'); }
    finally { setLookupBusy(false); }
  };
  const bboxText = draft.bbox ? `${draft.bbox[0][0]}, ${draft.bbox[0][1]}  →  ${draft.bbox[1][0]}, ${draft.bbox[1][1]}` : 'No bounding box drawn';
  return <AppLayout title="New Analysis" subtitle="Define the area of interest and the flood event date." action={<span className="step-progress"><b>STEP 01</b><i></i><span>DEFINE AREA & DATE</span></span>}>
    <div className="analysis-stepper"><div className="step-item current"><span>01</span><div><b>Define area & date</b><small>Set analysis inputs</small></div></div><span className="step-connector"/><div className="step-item"><span>02</span><div><b>Review</b><small>Confirm selection</small></div></div><span className="step-connector"/><div className="step-item"><span>03</span><div><b>Data check</b><small>Check source availability</small></div></div></div>
    <div className="analyze-grid"><section className="setup-panel"><div className="panel-header"><div><h3>Define your area</h3><p>Search for a location, then draw a bounding box on the map.</p></div><span className="required-label">REQUIRED INPUTS</span></div>
      <form className="location-search" onSubmit={doSearch}><label htmlFor="location-search">Location search</label><div className="search-input-wrap"><Icon name="search" size={18}/><input id="location-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search for a place or region"/><button className="button button-secondary button-small" type="submit" disabled={lookupBusy}>{lookupBusy?'Searching…':'Search'}</button></div>{searchError&&<p className="inline-error">{searchError}</p>}</form>
      <div className="map-edit-toolbar"><span><Icon name="map" size={16}/> AREA OF INTEREST</span><div><button className="text-button" onClick={()=>{setDraft(p=>({...p,bbox:null}));}} disabled={!draft.bbox}>Delete box</button><button className="text-button" onClick={()=>{setDraft(p=>({...p,bbox:null}));if(mapHandle.current)mapHandle.current.getCanvas().focus()}} disabled={!draft.bbox}>Redraw box</button></div></div>
      <div className="analysis-map"><MapView draft={draft} setDraft={setDraft} interactive onMapReady={map=>{mapHandle.current=map}}/></div>
      <div className="map-help"><span className="help-icon"><Icon name="alert" size={16}/></span><p><b>How to select an area</b><br/>Click and drag on the map to draw a rectangle. Use the map controls to zoom and pan. Draw again to replace the current bounding box.</p></div>
      <div className="field-grid"><label>Selected location<div className="readonly-field"><Icon name="pin" size={16}/><span>{draft.location||'No location selected'}</span></div></label><label>Flood date<input type="date" value={draft.date} max={new Date().toISOString().slice(0,10)} onChange={e=>setDraft(p=>({...p,date:e.target.value}))}/></label></div>
      <div className="bbox-field"><div><b>Bounding coordinates</b><small>West, South → East, North</small></div><code>{bboxText}</code></div>
      <div className="setup-actions"><button className="button button-secondary" onClick={()=>navigate('/workspace')}>Cancel</button><button className="button button-primary" disabled={!draft.date||!draft.bbox} onClick={()=>navigate('/review')}>Review analysis <Icon name="arrow" size={16}/></button></div>
    </section><aside className="analysis-aside"><div className="aside-card"><span className="aside-icon"><Icon name="calendar" size={20}/></span><h3>Flood event date</h3><p>Select the date of the flood event you want to investigate. Data coverage depends on satellite acquisition schedules.</p><div className="aside-info-row"><span>Flood date</span><b>{draft.date||'Not selected'}</b></div></div><div className="aside-card"><span className="aside-icon"><Icon name="map" size={20}/></span><h3>Area of interest</h3><p>The selected bounding box defines the geographic extent used for data discovery and analysis.</p><div className="aside-info-row"><span>Bounding box</span><b>{draft.bbox?'Defined':'Not defined'}</b></div><div className="aside-info-row"><span>Location label</span><b className="truncate">{draft.location||'Not selected'}</b></div></div><div className="aside-note"><Icon name="shield" size={18}/><p><b>No results are generated in the browser.</b><br/>Flood mapping and impact figures will be supplied by the analysis backend.</p></div></aside></div>
  </AppLayout>;
}

function ReviewPage() {
  const { draft } = useApp();
  const navigate = useNavigate();
  const valid = Boolean(draft.date && draft.bbox);
  return <AppLayout title="Review analysis" subtitle="Confirm the inputs before checking data availability." action={<span className="step-progress"><b>STEP 02</b><i></i><span>REVIEW</span></span>}>
    <div className="analysis-stepper"><div className="step-item complete"><span><Icon name="check" size={15}/></span><div><b>Define area & date</b><small>Inputs captured</small></div></div><span className="step-connector done"/><div className="step-item current"><span>02</span><div><b>Review</b><small>Confirm selection</small></div></div><span className="step-connector"/><div className="step-item"><span>03</span><div><b>Data check</b><small>Check source availability</small></div></div></div>
    <div className="review-layout"><section className="review-main panel"><div className="panel-header"><div><h3>Analysis inputs</h3><p>Review the exact area and date you selected.</p></div><button className="button button-secondary button-small" onClick={()=>navigate('/analyze')}>EDIT INPUTS</button></div>{!valid&&<div className="notice notice-warning"><Icon name="alert" size={18}/><span>Area and flood date are required. Return to setup to complete the missing inputs.</span></div>}<div className="review-fields"><div><small>LOCATION</small><b>{draft.location||'Not specified'}</b></div><div><small>FLOOD DATE</small><b>{draft.date||'Not selected'}</b></div><div><small>SELECTED AREA</small><b>{draft.bbox?'Bounding box defined':'No area selected'}</b></div><div><small>BOUNDING BOX</small><code>{draft.bbox?`${draft.bbox[0][0]}, ${draft.bbox[0][1]} → ${draft.bbox[1][0]}, ${draft.bbox[1][1]}`:'—'}</code></div></div><div className="review-map"><MapView draft={draft} setDraft={()=>{}}/></div><div className="review-actions"><button className="button button-secondary" onClick={()=>navigate('/analyze')}>Back to edit</button><button className="button button-primary" disabled={!valid} onClick={()=>navigate('/data-check')}>RUN ANALYSIS <Icon name="arrow" size={16}/></button></div></section><aside className="review-output panel"><div className="panel-eyebrow">EXPECTED OUTPUTS</div><h3>What FloodSight will produce</h3><p className="muted">Outputs will appear only after a successful backend analysis.</p>{[['WHERE','Flood extent','Map inundation and affected areas.'],['WHAT','Affected infrastructure','Buildings, roads, bridges and possible surface change.'],['WHO','Connectivity','Potentially cut-off settlements and connectivity status.'],['REPORT','Situation report','One-page report based on returned findings.']].map((x,i)=><div className="output-item" key={x[0]}><span className="output-index">0{i+1}</span><div><small>{x[0]}</small><b>{x[1]}</b><p>{x[2]}</p></div></div>)}</aside></div>
  </AppLayout>;
}

function DataCheckPage() {
  const { draft, setAnalysisId } = useApp();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const checks = ['Area validated','Date validated','Sentinel-1 pair found','Sentinel-2 available','DEM available','OSM available'];
  const run = async () => {
    setSubmitting(true); setError('');
    try {
      const payload = { location: draft.location || null, flood_date: draft.date, bbox: draft.bbox };
      const result = await api.createAnalysis(payload);
      if (!result || !(result.id || result.analysis_id)) throw new Error('The backend did not return an analysis identifier.');
      setAnalysisId(String(result.id || result.analysis_id));
      navigate('/analysis');
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Could not connect to the analysis API. No job was created. Check that the FastAPI backend is running and FLOODSIGHT_API_BASE_URL points to it.' : (err.message || 'The analysis could not be started.'));
    } finally { setSubmitting(false); }
  };
  return <AppLayout title="Data availability" subtitle="Check source coverage before processing. Availability is not assumed until the backend confirms it." action={<span className="step-progress"><b>STEP 03</b><i></i><span>DATA CHECK</span></span>}>
    <div className="analysis-stepper"><div className="step-item complete"><span><Icon name="check" size={15}/></span><div><b>Define area & date</b><small>Inputs captured</small></div></div><span className="step-connector done"/><div className="step-item complete"><span><Icon name="check" size={15}/></span><div><b>Review</b><small>Confirmed</small></div></div><span className="step-connector done"/><div className="step-item current"><span>03</span><div><b>Data check</b><small>Backend verification</small></div></div></div>
    <div className="data-check-layout"><section className="panel data-check-panel"><div className="panel-header"><div><h3>Source availability checks</h3><p>These checks are pending until the backend returns real availability results.</p></div><span className="waiting-badge"><i/> NOT CHECKED</span></div>{checks.map((c,i)=><div className="check-row" key={c}><span className="check-icon"><Icon name={i<2?'shield':'layers'} size={17}/></span><div><b>{c}</b><small>{i===0?'Validates the selected area geometry':i===1?'Validates the requested flood date':i===2?'Looks for suitable Sentinel-1 observations':i===3?'Looks for Sentinel-2 imagery coverage':i===4?'Checks elevation data coverage':'Checks OpenStreetMap infrastructure data'}</small></div><span className="check-state">Not checked</span></div>)}<div className="notice notice-info"><Icon name="clock" size={18}/><span>No availability checks have been run because the frontend has not received a backend response.</span></div>{error&&<div className="form-error api-error" role="alert">{error}</div>}<div className="review-actions"><button className="button button-secondary" onClick={()=>navigate('/review')}>Back to review</button><button className="button button-primary" onClick={run} disabled={submitting}>{submitting?'Connecting…':'Submit to backend'} <Icon name="arrow" size={16}/></button></div></section><aside className="data-check-aside panel"><span className="aside-icon"><Icon name="shield" size={21}/></span><h3>Before processing</h3><p>FloodSight will submit the selected inputs to the configured API. Processing starts only if the backend accepts the request and returns an analysis ID.</p><div className="api-contract"><small>API ENDPOINT</small><code>POST /api/analyses</code><small>SUBMISSION STATE</small><b>Awaiting request</b></div><button className="text-button" onClick={()=>navigate('/analysis')}>View processing pipeline <Icon name="arrow" size={14}/></button></aside></div>
  </AppLayout>;
}

function ProcessingPage() {
  const { analysisId, draft } = useApp();
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  useEffect(() => {
    if (!analysisId) return;
    let cancelled = false, timer;
    const poll = async () => {
      try { const data = await api.getStatus(analysisId); if (!cancelled) { setStatus(data); setError(''); } }
      catch (e) { if (!cancelled) setError('Status updates are unavailable until the backend responds.'); }
      if (!cancelled) timer = setTimeout(poll, 5000);
    };
    poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [analysisId]);
  const current = String(status?.status || status?.state || '').toUpperCase();
  const currentIndex = pipeline.indexOf(current);
  return <AppLayout title="Analysis processing" subtitle="Live job state is read from the backend. No progress is simulated." action={<span className="status-pill"><i/> {analysisId?'POLLING STATUS':'NO ACTIVE JOB'}</span>}>
    <div className="processing-layout"><section className="panel processing-panel"><div className="processing-head"><div className="processing-emblem"><Icon name="layers" size={27}/></div><div><div className="panel-eyebrow">ANALYSIS PIPELINE</div><h2>{analysisId ? (current || 'Waiting for status') : 'No active analysis job'}</h2><p>{analysisId ? `Analysis ID: ${analysisId}` : 'Submit an analysis from the data availability page to track a real backend job.'}</p></div></div>{error&&<div className="notice notice-warning"><Icon name="alert" size={17}/>{error}</div>}{!analysisId&&<EmptyState icon="clock" title="No job to track" text="This page will show the current state when an analysis is accepted by the backend." actionLabel="Start an analysis" onAction={()=>navigate('/analyze')}/>}<div className="pipeline-list">{pipeline.map((p,i)=>{const isFailed=current==='FAILED'&&p==='FAILED';const done=current==='COMPLETED'||(currentIndex>=0&&i<currentIndex);const active=currentIndex===i&&current!=='COMPLETED'&&current!=='FAILED';return <div className={`pipeline-step ${done?'done':''} ${active?'active':''} ${isFailed?'failed':''}`} key={p}><span className="pipeline-node">{done?<Icon name="check" size={14}/>:isFailed?<Icon name="close" size={14}/>:String(i+1).padStart(2,'0')}</span><span className="pipeline-name">{p.replaceAll('_',' ')}</span><span className="pipeline-status">{done?'Complete':active?'Current stage':isFailed?'Failed':'Waiting'}</span></div>})}</div><div className="processing-foot"><span><i className={analysisId?'status-dot neutral':'status-dot'}/>{analysisId?'Backend status is authoritative':'Waiting for an analysis ID'}</span><button className="button button-secondary button-small" onClick={()=>navigate('/results')}>View results <Icon name="arrow" size={15}/></button></div></section><aside className="panel processing-side"><div className="panel-eyebrow">JOB DETAILS</div><h3>Current request</h3><div className="aside-info-row"><span>Analysis ID</span><b>{analysisId||'—'}</b></div><div className="aside-info-row"><span>Flood date</span><b>{draft.date||'—'}</b></div><div className="aside-info-row"><span>Area of interest</span><b>{analysisId?'Submitted':'Not submitted'}</b></div><div className="notice notice-info"><Icon name="shield" size={16}/><span>The interface never marks a job complete without backend status.</span></div></aside></div>
  </AppLayout>;
}
function ResultsPage() {
  const { analysisId, setAnalysisId, draft } = useApp();
  const [facts, setFacts] = useState(null);
  const [mapData, setMapData] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  // The workspace history links to /results?id=<uuid>; adopt it as the active analysis.
  const linkedId = new URLSearchParams(useLocation().search).get('id');
  const activeId = linkedId || analysisId;
  useEffect(()=>{ if(linkedId && linkedId!==analysisId) setAnalysisId(linkedId); },[linkedId]);
  useEffect(()=>{if(!activeId)return;let live=true;setError('');Promise.all([api.getFacts(activeId),api.getMap(activeId),api.getStatus(activeId)]).then(([f,m,s])=>{if(live){setFacts(f);setMapData(m);setStatus(s?.status||s?.state||'');}}).catch(e=>{if(live){setFacts(null);setMapData(null);setStatus('');setError('Results are not available from the backend yet.');}});return()=>{live=false}},[activeId]);
  const resultsReady = facts?.results_ready === true;
  return <AppLayout title="Analysis results" subtitle="Only backend-provided facts and geospatial layers are displayed." action={<button className="button button-secondary" onClick={()=>window.print()}><Icon name="file" size={16}/> Print view</button>}>
    {!activeId||!resultsReady?<div className="results-empty panel"><div className="empty-orbit"><Icon name="layers" size={27}/></div><div className="empty-kicker">RESULTS UNAVAILABLE</div><h2>No analysis results yet</h2><p>{error||'A completed analysis with backend-provided facts and map layers will appear here. No flood extent or impact figures have been generated.'}</p><div className="results-empty-actions"><button className="button button-primary" onClick={()=>window.location.assign('/analyze')}>Start new analysis <Icon name="arrow" size={16}/></button><button className="button button-secondary" onClick={()=>window.location.assign('/workspace')}>Back to workspace</button></div></div>:<><div className="results-meta"><span><b>Analysis ID</b> {activeId}</span><span><b>Flood date</b> {draft.date||'Backend value unavailable'}</span><span><b>Status</b> {status||'Not provided'}</span></div><div className="results-map-panel panel"><div className="panel-header"><div><h3>Flood and impact layers</h3><p>Layers are drawn only from returned GeoJSON.</p></div></div><div className="results-map"><MapView draft={draft} setDraft={()=>{}} dataLayers={mapData}/></div></div><div className="results-facts-grid">{Object.entries(facts||{}).map(([key,value])=><div className="fact-result panel" key={key}><small>{key.replaceAll('_',' ').toUpperCase()}</small><b>{typeof value==='object'?JSON.stringify(value):String(value??'—')}</b></div>)}</div><button className="button button-secondary" onClick={()=>window.location.assign('/report?id='+encodeURIComponent(activeId))}>Open report <Icon name="arrow" size={16}/></button></>}
  </AppLayout>;
}

function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{let live=true;api.listAnalyses().then(data=>{const list=Array.isArray(data)?data:(data?.items||[]);if(live)setReports(list.filter(x=>x.report_url||x.report?.url));}).catch(()=>{if(live)setReports([])}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[]);
  return <AppLayout active="reports" title="Reports" subtitle="Situation reports generated by completed analyses."><div className="panel reports-panel">{loading?<div className="loading-state">Checking for reports returned by the backend…</div>:reports.length?<>{reports.map((r,i)=><div className="report-row" key={r.id||i}><span className="report-icon"><Icon name="file" size={20}/></span><div><b>{r.name||r.location||'Situation report'}</b><small>{r.flood_date||r.date||'Date unavailable'} · {r.id||'Analysis ID unavailable'}</small></div><a className="button button-secondary button-small" href={r.report_url||r.report?.url} target="_blank" rel="noreferrer">Open report <Icon name="arrow" size={14}/></a></div>)}</>:<EmptyState icon="file" title="No reports yet" text="Completed analysis reports will appear here."/>}</div></AppLayout>;
}

function ReportPage() {
  const { analysisId, setAnalysisId } = useApp();
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const linkedId = new URLSearchParams(useLocation().search).get('id');
  const activeId = linkedId || analysisId;
  useEffect(()=>{ if(linkedId && linkedId!==analysisId) setAnalysisId(linkedId); },[linkedId]);
  useEffect(()=>{if(!activeId){setReport(null);return;}setError('');api.getReport(activeId).then(payload=>{setReport(payload?.url||payload?.pdf_url?payload:null);if(!payload?.url&&!payload?.pdf_url)setError('A report has not been returned by the backend.');}).catch(()=>{setReport(null);setError('A report has not been returned by the backend.');});},[activeId]);
  return <AppLayout title="Situation report" subtitle="Open or download the report returned for this analysis."><div className="panel report-detail">{report?.url||report?.pdf_url?<><span className="report-icon large"><Icon name="file" size={24}/></span><h2>{report.title||'FloodSight situation report'}</h2><p>{report.description||'Report generated by the analysis backend.'}</p><div className="report-detail-actions"><a className="button button-primary" href={report.url||report.pdf_url} target="_blank" rel="noreferrer">Open PDF <Icon name="arrow" size={16}/></a>{report.geojson_url&&<a className="button button-secondary" href={report.geojson_url} download>Download GeoJSON</a>}</div></>:<EmptyState icon="file" title="No report available" text={error||'A real PDF report will appear here after the backend provides one.'}/>}</div></AppLayout>;
}

function SettingsPage() {
  const { theme, setTheme, profile, setProfile, logout } = useApp();
  const [appearance, setAppearance] = useState('Muted');
  const [mapStyle, setMapStyle] = useState('Standard');
  const [saved, setSaved] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const signOut = useCallback(async () => { await logout(); navigate('/login', { replace: true }); }, [logout, navigate]);
  const save = (e)=>{e.preventDefault();setSaved(true);setTimeout(()=>setSaved(false),2400)};
  return <AppLayout active="settings" title="Settings" subtitle="Personalize your workspace and manage account preferences."><div className="settings-layout"><section className="settings-main">
    <form className="panel settings-panel" onSubmit={save}><div className="settings-section-heading"><span className="settings-icon"><Icon name="layers"/></span><div><h3>General / Personalization</h3><p>Adjust how FloodSight appears on your device.</p></div></div><div className="setting-row"><div><b>Appearance</b><small>Choose your workspace theme.</small></div><div className="segmented"><button type="button" className={theme==='dark'?'selected':''} onClick={()=>setTheme('dark')}>Dark</button><button type="button" className={theme==='light'?'selected':''} onClick={()=>setTheme('light')}>Light</button></div></div><div className="setting-row"><div><b>Map appearance</b><small>Base map presentation.</small></div><select value={mapStyle} onChange={e=>setMapStyle(e.target.value)}><option>Standard</option><option>Muted</option><option>High contrast</option></select></div><div className="setting-row"><div><b>Contrast / Accent</b><small>Choose a restrained interface accent.</small></div><select value={appearance} onChange={e=>setAppearance(e.target.value)}><option>Muted</option><option>Cyan</option><option>Blue</option></select></div><div className="settings-save"><button className="button button-primary" type="submit">Save preferences</button>{saved&&<span className="save-confirm"><Icon name="check" size={15}/> Preferences saved for this session</span>}</div></form>
    <form className="panel settings-panel" onSubmit={save}><div className="settings-section-heading"><span className="settings-icon"><Icon name="globe"/></span><div><h3>Account</h3><p>Update the profile details shown in your workspace.</p></div></div><div className="settings-form-grid"><label>Name<input value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})} placeholder="Full name"/></label><label>Username<input value={profile.username} onChange={e=>setProfile({...profile,username:e.target.value})} placeholder="Username"/></label><label className="span-2">Email<input type="email" value={profile.email} onChange={e=>setProfile({...profile,email:e.target.value})} placeholder="Email address"/></label></div><div className="settings-save"><button className="button button-primary" type="submit">Save Profile</button>{saved&&<span className="save-confirm"><Icon name="check" size={15}/> Profile saved for this session</span>}</div></form>
    <section className="panel settings-panel"><div className="settings-section-heading"><span className="settings-icon"><Icon name="shield"/></span><div><h3>Security & Login</h3><p>Account security controls.</p></div></div><div className="setting-row"><div><b>Verified email</b><small>{profile.email?'Email verification is not implemented in this build.':'No email address on profile.'}</small></div><span className="neutral-chip">Not verified</span></div><div className="setting-row"><div><b>Change password</b><small>Password changes are not available yet.</small></div><button className="button button-secondary button-small" onClick={()=>setShowPassword(!showPassword)}>{showPassword?'Hide':'Change password'}</button></div>{showPassword&&<div className="notice notice-info"><Icon name="alert" size={16}/> Password changes are not available in this build.</div>}<div className="setting-row"><div><b>Active session</b><small>This browser has a verified session with the backend.</small></div><span className="active-chip"><i/> Active</span></div><div className="setting-row"><div><b>Log out all devices</b><small>End the current session on this browser.</small></div><button className="button button-danger-outline button-small" onClick={signOut}>Log out</button></div></section>
  </section><aside className="settings-aside panel"><span className="settings-aside-icon"><Icon name="shield" size={22}/></span><h3>Your workspace, your way</h3><p>These preferences are stored locally in this browser. Account settings are not synced across devices yet.</p><div className="settings-aside-line"/><div className="aside-info-row"><span>Theme</span><b>{theme==='dark'?'Dark':'Light'}</b></div><div className="aside-info-row"><span>Map style</span><b>{mapStyle}</b></div><div className="aside-info-row"><span>Accent</span><b>{appearance}</b></div></aside></div></AppLayout>;
}

function EmptyState({ icon = 'layers', title, text, actionLabel, onAction }) {
  return <div className="empty-state"><div className="empty-state-icon"><Icon name={icon} size={24}/></div><h3>{title}</h3><p>{text}</p>{actionLabel&&<button className="button button-primary" onClick={onAction}>{actionLabel} <Icon name="arrow" size={16}/></button>}</div>;
}