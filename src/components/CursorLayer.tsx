"use client";

// Stable per-session color for remote cursors (hashed from userId)
function cursorColor(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 60%)`;
}

type CursorLayerProps = {
    cursors: Record<string, { x: number; y: number }>;
    selfId: string;
};

export default function CursorLayer({ cursors, selfId }: CursorLayerProps) {
    const otherCursors = Object.entries(cursors).filter(
        ([cursorUserId]) => cursorUserId !== selfId
    );

    if (otherCursors.length === 0) return null;

    return (
        <>
            {otherCursors.map(([cursorUserId, pos]) => {
                const bgColor = cursorColor(cursorUserId);
                return (
                    <div
                        key={cursorUserId}
                        style={{
                            position: "fixed",
                            left: pos.x,
                            top: pos.y,
                            pointerEvents: "none",
                            zIndex: 9999,
                            transform: "translate(4px, 4px)",
                            transition: "left 0.05s linear, top 0.05s linear",
                        }}
                    >
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 16 16"
                            fill={bgColor}
                            style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.45))" }}
                        >
                            <path d="M0 0 L0 13 L3.5 9.5 L6.5 15 L8.5 14 L5.5 8 L10 8 Z" />
                        </svg>
                        <div
                            style={{
                                position: "absolute",
                                top: "16px",
                                left: "12px",
                                background: bgColor,
                                color: "#fff",
                                padding: "3px 8px",
                                borderRadius: "999px",
                                fontSize: "11px",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                                boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
                            }}
                        >
                            {cursorUserId.slice(0, 6)}
                        </div>
                    </div>
                );
            })}
        </>
    );
}
