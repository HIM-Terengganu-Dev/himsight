import Sidebar from './Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-indigo-600 to-blue-800 p-4 gap-4">
      <Sidebar />
      <main className="flex-1 h-full overflow-hidden rounded-2xl">
        <div className="h-full w-full overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
