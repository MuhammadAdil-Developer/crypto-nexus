import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface AdminLayoutProps {
  children: React.ReactNode;
  breadcrumbs: { label: string; href?: string }[];
}

export function AdminLayout({ children, breadcrumbs }: AdminLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden dark">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header breadcrumbs={breadcrumbs} />
        {children}
      </div>
    </div>
  );
}
