import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/pages/DashboardPage";
import { TopologyPage } from "@/pages/TopologyPage";
import { MetricsPage } from "@/pages/MetricsPage";
import { AlertsPage } from "@/pages/AlertsPage";
import { NodeDetailPage } from "@/pages/NodeDetailPage";
import { ServicesPage } from "@/pages/ServicesPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="topology" element={<TopologyPage />} />
          <Route path="metrics" element={<MetricsPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="nodes/:id" element={<NodeDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
