
import React from 'react';

interface ChatLayoutProps {
    sidebar: React.ReactNode;
    children: React.ReactNode; // The Chat Window
}

export function ChatLayout({ sidebar, children }: ChatLayoutProps) {
    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] bg-white dark:bg-slate-950 overflow-hidden">
            {/* Mobile Sidebar (Conditional or Drawer - for now stick to responsive split) */}
            {/* On mobile, we might need to toggle between list and chat. 
            For this implementation, let's assume md+ split. 
            Mobile logic will be handled by hiding one or the other.
        */}

            <div className="w-full md:w-80 lg:w-96 border-r border-neutral-200 dark:border-neutral-800 flex flex-col bg-white dark:bg-slate-900 h-full">
                {sidebar}
            </div>

            <div className="flex-1 flex flex-col min-w-0 bg-neutral-50 dark:bg-slate-950 h-full relative">
                {children}
            </div>
        </div>
    );
}
