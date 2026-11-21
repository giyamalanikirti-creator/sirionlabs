import { Sidebar } from '@/components/sirion/Sidebar';
import { TopBar } from '@/components/sirion/TopBar';

export default function SirionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ds-scope flex h-full min-h-0 bg-page">
      <Sidebar />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="thin-scroll min-h-0 flex-1 overflow-y-auto px-6 pb-24 pt-6 xl:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
