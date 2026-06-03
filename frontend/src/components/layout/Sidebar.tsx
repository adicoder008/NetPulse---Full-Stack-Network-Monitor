import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Network,
  LineChart,
  Bell,
  Server,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

const navItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/topology", label: "Topology", icon: Network },
  { to: "/metrics", label: "Metrics", icon: LineChart },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/services", label: "Services", icon: Server }
];

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex flex-col border-r border-edge bg-surface-raised transition-all duration-200",
        collapsed ? "w-14" : "w-52"
      )}
    >
      <div className={cn("flex items-center border-b border-edge-subtle p-3", collapsed ? "justify-center" : "px-4")}>
        <Logo compact={collapsed} />
      </div>

      <nav className="flex-1 p-2 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-status-activity/10 text-status-activity border border-status-activity/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-surface-overlay"
              )
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={onToggle}
        className="flex items-center justify-center border-t border-edge-subtle p-3 text-slate-500 hover:text-slate-300 transition-colors"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}
