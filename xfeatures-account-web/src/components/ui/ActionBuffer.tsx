import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';

export const ActionBuffer = () => {
    const { logs, addLog } = useStore();
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        const handleSystemLog = (e: Event) => {
            const customEvent = e as CustomEvent;
            addLog(customEvent.detail.type, customEvent.detail.msg);
        };

        window.addEventListener('system_log', handleSystemLog);
        return () => window.removeEventListener('system_log', handleSystemLog);
    }, [addLog]);

    useEffect(() => {
        if (logs.length > 0) {
            document.documentElement.style.setProperty('--buffer-height', isExpanded ? '12rem' : '3rem');
        } else {
            document.documentElement.style.setProperty('--buffer-height', '0px');
        }

        return () => {
            document.documentElement.style.removeProperty('--buffer-height');
        };
    }, [isExpanded, logs.length]);

    if (logs.length === 0) return null;

    const latestLog = logs[0];

    return (
        <div
            className={cn(
                "fixed bottom-0 left-0 w-full bg-[#000000] border-t border-[#222222] font-mono text-[10px] sm:text-xs z-[100] transition-all duration-300 ease-out cursor-pointer",
                isExpanded ? "h-48 overflow-y-auto custom-scrollbar" : "h-12 overflow-hidden"
            )}
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <div className="flex flex-col p-1.5 gap-1 h-full">
                {isExpanded ? (
                    <div className="flex flex-col h-full gap-1 p-2">
                        <div className="flex justify-between items-center px-2 mb-2 border-b border-[#222222] pb-2 text-[#666666] tracking-widest uppercase">
                            <span>SYSTEM TERMINAL</span>
                            <span className="hover:text-white transition-colors font-semibold">CLICK TO COLLAPSE</span>
                        </div>
                        {logs.map((log) => (
                            <div key={log.id} className="flex gap-4 hover:bg-[#111111] px-2 py-1.5 transition-colors rounded-md">
                                <span className="text-[#555555] select-none shrink-0">[{log.timestamp}]</span>
                                <span className={cn(
                                    log.type === 'error' && "text-[#FF453A]",
                                    log.type === 'success' && "text-[#32D74B]",
                                    log.type === 'warning' && "text-[#FF9F0A]",
                                    log.type === 'info' && "text-[#EDEDED]"
                                )}>
                                    {log.message}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center gap-3 px-4 h-full truncate">
                        <span className="text-[#555555] shrink-0">[{latestLog.timestamp}]</span>
                        <span className={cn(
                            "truncate text-sm tracking-wide",
                            latestLog.type === 'error' && "text-[#FF453A]",
                            latestLog.type === 'success' && "text-[#32D74B]",
                            latestLog.type === 'warning' && "text-[#FF9F0A]",
                            latestLog.type === 'info' && "text-[#EDEDED]"
                        )}>
                            {latestLog.message}
                        </span>
                        <span className="ml-auto text-[#666666] animate-pulse shrink-0 tracking-widest font-semibold uppercase">
                            _ EXPAND
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};