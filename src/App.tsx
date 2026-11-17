import { useEffect } from 'react';
import { Link, Route, Router, Switch, useLocation } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { BrandMark, SettingsIcon } from './components/Icons';
import { TabBar } from './components/TabBar';
import { ToastHost } from './components/Toast';
import { UpdateBanner } from './components/UpdateBanner';
import { DataScreen } from './screens/DataScreen';
import { DrillDetail } from './screens/DrillDetail';
import { SessionMode } from './screens/session/SessionMode';
import { Drills } from './screens/Drills';
import { Mind } from './screens/Mind';
import { Plan } from './screens/Plan';
import { ProfileEdit } from './screens/profile/ProfileEdit';
import { ProfileOverview } from './screens/profile/ProfileOverview';
import { Progress } from './screens/Progress';
import { Ratings } from './screens/Ratings';
import { Settings } from './screens/Settings';
import { Today } from './screens/Today';

/** Screens reached from Settings: the settings icon stays highlighted on them. */
const SETTINGS_AREA = ['/settings', '/profile', '/ratings', '/data'];

/** Dev-only: open #/__crash to check the crash screen works. */
function Crash(): never {
  throw new Error('Test crash (dev only)');
}

/** Start each screen at the top, like a native app. */
function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    // Block body on purpose: newer browsers return a Promise from scrollTo(),
    // and React would treat that as a cleanup function and crash.
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

function Header() {
  const [location] = useLocation();
  return (
    <header className="app-header">
      <Link href="/" className="app-header__brand" aria-label="Touchline home">
        <BrandMark className="brand-mark" />
        Touchline
      </Link>
      <Link
        href="/settings"
        className="icon-button"
        aria-label="Settings"
        aria-current={
          SETTINGS_AREA.some((p) => location === p || location.startsWith(p + '/')) ? 'page' : undefined
        }
      >
        <SettingsIcon />
      </Link>
    </header>
  );
}

/** Session mode takes the whole screen: no header or tab bar. */
function Shell() {
  const [location] = useLocation();
  if (location.startsWith('/session/')) {
    return (
      <div className="app app--full">
        <ScrollToTop />
        <Switch>
          <Route path="/session/:date/log" component={SessionMode} />
          <Route path="/session/:date" component={SessionMode} />
        </Switch>
      </div>
    );
  }
  return (
      <div className="app">
        <ScrollToTop />
        <Header />
        <main className="app-main">
          <Switch>
            <Route path="/" component={Today} />
            <Route path="/plan" component={Plan} />
            <Route path="/drills" component={Drills} />
            <Route path="/drills/:id" component={DrillDetail} />
            <Route path="/progress" component={Progress} />
            <Route path="/mind" component={Mind} />
            <Route path="/settings" component={Settings} />
            <Route path="/profile" component={ProfileOverview} />
            <Route path="/profile/edit/:section" component={ProfileEdit} />
            <Route path="/ratings" component={Ratings} />
            <Route path="/data" component={DataScreen} />
            {import.meta.env.DEV && <Route path="/__crash" component={Crash} />}
            <Route>
              <h1 className="page-title">Not found</h1>
              <p className="page-lede">
                <Link href="/">Back to Today</Link>
              </p>
            </Route>
          </Switch>
        </main>
        <TabBar />
      </div>
  );
}

export function App() {
  // Hash routes (#/plan) work on GitHub Pages without server rewrites and
  // keep the offline cache simple: there's only ever one HTML page.
  return (
    <Router hook={useHashLocation}>
      <Shell />
      {/* Outside the layouts, so a toast survives leaving session mode. */}
      <UpdateBanner />
      <ToastHost />
    </Router>
  );
}
