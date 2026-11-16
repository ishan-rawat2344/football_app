import { useEffect } from 'react';
import { Link, Route, Router, Switch, useLocation } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { BrandMark, SettingsIcon } from './components/Icons';
import { TabBar } from './components/TabBar';
import { UpdateBanner } from './components/UpdateBanner';
import { Drills } from './screens/Drills';
import { Mind } from './screens/Mind';
import { Plan } from './screens/Plan';
import { Progress } from './screens/Progress';
import { Settings } from './screens/Settings';
import { Today } from './screens/Today';

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
        aria-current={location === '/settings' ? 'page' : undefined}
      >
        <SettingsIcon />
      </Link>
    </header>
  );
}

export function App() {
  // Hash routes (#/plan) work on GitHub Pages without server rewrites and
  // keep the offline cache simple: there's only ever one HTML page.
  return (
    <Router hook={useHashLocation}>
      <div className="app">
        <ScrollToTop />
        <Header />
        <main className="app-main">
          <Switch>
            <Route path="/" component={Today} />
            <Route path="/plan" component={Plan} />
            <Route path="/drills" component={Drills} />
            <Route path="/progress" component={Progress} />
            <Route path="/mind" component={Mind} />
            <Route path="/settings" component={Settings} />
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
        <UpdateBanner />
      </div>
    </Router>
  );
}
