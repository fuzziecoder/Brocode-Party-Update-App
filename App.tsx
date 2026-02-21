import React, { Suspense, lazy } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";
import { NotificationsProvider } from "./contexts/NotificationsContext";
import { ChatProvider } from "./contexts/ChatContext";
import { PaymentProvider } from "./contexts/PaymentContext";

const SplashPage = lazy(() => import("./pages/SplashPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const PaymentPage = lazy(() => import("./pages/PaymentPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const DrinksPage = lazy(() => import("./pages/DrinksPage"));

const DashboardLayout = lazy(() => import("./components/layout/DashboardLayout"));
const ProtectedRoute = lazy(() => import("./components/auth/ProtectedRoute"));
const TargetCursor = lazy(() => import("./components/common/TargetCursor"));

const RouteFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] text-white">
    Loading...
  </div>
);

const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <PaymentProvider>
          <ChatProvider>
            <Suspense fallback={<RouteFallback />}>
              <TargetCursor
                spinDuration={2}
                hideDefaultCursor
                parallaxOn
                hoverDuration={0.2}
              />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<SplashPage />} />
                  <Route path="/login" element={<LoginPage />} />

                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Navigate to="home" replace />} />
                    <Route path="home" element={<HomePage />} />
                    <Route path="payment" element={<PaymentPage />} />
                    <Route path="drinks" element={<DrinksPage />} />
                    <Route path="history" element={<HistoryPage />} />
                    <Route path="notifications" element={<NotificationsPage />} />
                    <Route path="chat" element={<ChatPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="profile/:userId" element={<ProfilePage />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </BrowserRouter>
            </Suspense>
          </ChatProvider>
        </PaymentProvider>
      </NotificationsProvider>
    </AuthProvider>
  );
};

export default App;
