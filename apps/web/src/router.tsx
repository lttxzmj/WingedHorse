import { createRootRoute, createRoute, createRouter, Link, Outlet } from "@tanstack/react-router";
import { Feather } from "lucide-react";
import { AppIcon } from "./components/AppIcon";
import { AssessmentPage } from "./pages/AssessmentPage";
import { HomePage } from "./pages/HomePage";
import { GamePage } from "./pages/GamePage";
import { InventoryPage } from "./pages/InventoryPage";
import { CompanionPage } from "./pages/CompanionPage";
import { SignalsPage } from "./pages/SignalsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { LegalPage } from "./pages/LegalPage";
import { MemoriesPage } from "./pages/MemoriesPage";
import { LandingPage } from "./pages/LandingPage";
import { ResultPage } from "./pages/ResultPage";
import { LifePage } from "./pages/LifePage";

function RootLayout() {
  return <Outlet />;
}

function NotFoundPage() {
  return (
    <main className="centered-page">
      <section className="empty-state">
        <span className="empty-state__icon" aria-hidden="true"><AppIcon icon={Feather} size={42} /></span>
        <h1>这片草原还没延伸到这里</h1>
        <p>回到起点，我们换一条路继续。</p>
        <Link className="ui-button ui-button--primary inline-link-button" to="/">
          回到首页
        </Link>
      </section>
    </main>
  );
}

const rootRoute = createRootRoute({ component: RootLayout, notFoundComponent: NotFoundPage });
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LandingPage
});
const assessmentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/assessment",
  component: AssessmentPage
});
const resultRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/result",
  component: ResultPage
});
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/home",
  component: HomePage
});
const gameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/game",
  component: GamePage
});
const inventoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/inventory",
  component: InventoryPage
});
const companionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/companion",
  component: CompanionPage
});
const signalsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signals",
  component: SignalsPage
});
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage
});
const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/privacy",
  component: () => <LegalPage kind="privacy" />
});
const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/terms",
  component: () => <LegalPage kind="terms" />
});
const aiNoticeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ai-notice",
  component: () => <LegalPage kind="ai" />
});
const memoriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/memories",
  component: MemoriesPage
});
const lifeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/life",
  component: LifePage
});
const routeTree = rootRoute.addChildren([
  indexRoute,
  assessmentRoute,
  resultRoute,
  homeRoute,
  gameRoute,
  inventoryRoute,
  companionRoute,
  signalsRoute,
  settingsRoute,
  privacyRoute,
  termsRoute,
  aiNoticeRoute,
  memoriesRoute,
  lifeRoute
]);

export const router = createRouter({ routeTree, defaultPreload: "intent" });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
