import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  useRouterState
} from "@tanstack/react-router";
import { Feather } from "lucide-react";
import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { AppIcon } from "./components/AppIcon";
import { GlobalHardwareListener } from "./components/GlobalHardwareListener";
import { LandingPage } from "./pages/LandingPage";

const AssessmentPage = lazy(() =>
  import("./pages/AssessmentPage").then((module) => ({ default: module.AssessmentPage }))
);
const HomePage = lazy(() =>
  import("./pages/DigitalLifeExperiencePage").then((module) => ({
    default: module.DigitalLifeExperiencePage
  }))
);
const GamePage = lazy(() =>
  import("./pages/GamePage").then((module) => ({ default: module.GamePage }))
);
const InventoryPage = lazy(() =>
  import("./pages/InventoryPage").then((module) => ({ default: module.InventoryPage }))
);
const CompanionPage = lazy(() =>
  import("./pages/CompanionPage").then((module) => ({ default: module.CompanionPage }))
);
const SignalsPage = lazy(() =>
  import("./pages/SignalsPage").then((module) => ({ default: module.SignalsPage }))
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((module) => ({ default: module.SettingsPage }))
);
const LegalPage = lazy(() =>
  import("./pages/LegalPage").then((module) => ({ default: module.LegalPage }))
);
const MemoriesPage = lazy(() =>
  import("./pages/MemoriesPage").then((module) => ({ default: module.MemoriesPage }))
);
const ResultPage = lazy(() =>
  import("./pages/ResultPage").then((module) => ({ default: module.ResultPage }))
);
const LifePage = lazy(() =>
  import("./pages/LifePage").then((module) => ({ default: module.LifePage }))
);
const FriendsPage = lazy(() =>
  import("./pages/FriendsPage").then((module) => ({ default: module.FriendsPage }))
);
const IntentPage = lazy(() =>
  import("./pages/IntentPage").then((module) => ({ default: module.IntentPage }))
);

const ROUTE_TITLES: Record<string, string> = {
  "/": "你是什么牛马",
  "/assessment": "测测此刻的你",
  "/result": "我的飞升报告",
  "/home": "来来的草原",
  "/game": "接住今天的补给",
  "/inventory": "来来的背包",
  "/companion": "和来来说说话",
  "/signals": "状态线索",
  "/settings": "设置与边界",
  "/privacy": "隐私说明",
  "/terms": "用户协议",
  "/ai-notice": "AI 使用说明",
  "/memories": "长期记忆",
  "/life": "私密生活簿",
  "/friends": "密友小圈",
  "/intent": "把来来带回家"
};

function RouteEffects() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const pageTitle = ROUTE_TITLES[pathname] ?? "页面未找到";
    document.title = `${pageTitle} · 牛马飞升`;
    setAnnouncement(`已进入${pageTitle}`);
  }, [pathname]);

  useEffect(() => {
    const ownerDocument = document;
    const ownerWindow = ownerDocument.defaultView;
    if (!ownerWindow) return;
    const previousMain = ownerDocument.querySelector("main");
    const focusHeading = () => {
      const heading = ownerDocument.querySelector<HTMLElement>("main h1");
      if (!heading) return;
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    };
    const observer = new ownerWindow.MutationObserver(() => {
      if (ownerDocument.querySelector("main") === previousMain) return;
      observer.disconnect();
      ownerWindow.setTimeout(focusHeading, 0);
    });
    observer.observe(ownerDocument.getElementById("root") ?? ownerDocument.body, {
      childList: true,
      subtree: true
    });
    const timer = ownerWindow.setTimeout(() => {
      observer.disconnect();
      focusHeading();
    }, 300);
    return () => {
      observer.disconnect();
      ownerWindow.clearTimeout(timer);
    };
  }, [pathname]);

  return (
    <p className="route-announcer" aria-live="polite" aria-atomic="true">
      {announcement}
    </p>
  );
}

class RouteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    if (this.state.failed)
      return (
        <main className="centered-page">
          <section className="empty-state" role="alert">
            <h1>这一页暂时没有打开</h1>
            <p>可能是网络刚刚中断了。你的本机记录没有被清除，可以重新加载后继续。</p>
            <button className="ui-button ui-button--primary" onClick={() => location.reload()}>
              重新加载
            </button>
            <a className="quiet-link" href="/">
              回到首页
            </a>
          </section>
        </main>
      );
    return this.props.children;
  }
}

function RouteLoading() {
  return (
    <main className="centered-page" aria-busy="true">
      <section className="empty-state" role="status">
        <span className="typing-dots" aria-hidden="true">
          •••
        </span>
        <p>草原正在延伸过来…</p>
      </section>
    </main>
  );
}

function RootLayout() {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<RouteLoading />}>
        <Outlet />
        <RouteEffects />
        <GlobalHardwareListener />
      </Suspense>
    </RouteErrorBoundary>
  );
}

function NotFoundPage() {
  return (
    <main className="centered-page">
      <section className="empty-state">
        <span className="empty-state__icon" aria-hidden="true">
          <AppIcon icon={Feather} size={42} />
        </span>
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
  validateSearch: (search: Record<string, unknown>): { from?: "home" | "companion" } => {
    if (search.from === "home" || search.from === "companion") return { from: search.from };
    return {};
  },
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
const friendsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/friends",
  validateSearch: (search: Record<string, unknown>): { from?: string } => {
    const from = typeof search.from === "string" ? search.from : undefined;
    return from ? { from } : {};
  },
  component: FriendsPage
});
const intentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/intent",
  component: IntentPage
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
  lifeRoute,
  friendsRoute,
  intentRoute
]);

export const router = createRouter({ routeTree, defaultPreload: "intent" });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
