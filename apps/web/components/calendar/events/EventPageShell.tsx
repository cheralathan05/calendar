'use client';

export function EventPageShell({ children }: { title: string; children: React.ReactNode }) {
  
  return (
    <div className="flex min-h-screen flex-col bg-[#F0F4F9] dark:bg-gray-950">
      {/* Content */}
      <div className="w-full flex-1 px-4 py-6">{children}</div>
    </div>
  );
}
