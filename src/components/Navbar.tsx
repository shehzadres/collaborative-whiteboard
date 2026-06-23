"use client";

type NavbarProps = {
    roomId: string;
    onlineUsers?: number;
};

export default function Navbar({
    roomId,
    onlineUsers,
}: NavbarProps) {
    const id = Array.isArray(roomId)
        ? roomId[0]
        : roomId;

    return (
        <div
            style={{
                position: "fixed",
                top: "20px",
                left: "20px",
                zIndex: 999,
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: "rgba(21,24,31,0.72)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "12px",
                padding: "8px 14px 8px 10px",
                boxShadow: "0 8px 28px rgba(0,0,0,0.32)",
                color: "#E2E4E9",
            }}
        >
            {/* ICON */}
            <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#818cf8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>

            {/* TITLE */}
            <span
                style={{
                    fontWeight: 600,
                    fontSize: "13px",
                    letterSpacing: "0.01em",
                }}
            >
                Whiteboard
            </span>

            {/* ROOM ID */}
            {id && (
                <>
                    <div
                        style={{
                            width: "1px",
                            height: "14px",
                            background: "rgba(255,255,255,0.12)",
                        }}
                    />
                    <span
                        style={{
                            fontSize: "11px",
                            color: "#6b7280",
                            fontFamily: "monospace",
                        }}
                    >
                        {id.slice(0, 8)}…
                    </span>
                </>
            )}

            {/* ONLINE USERS (FIXED + SAFE) */}
            {typeof onlineUsers === "number" && (
                <>
                    <div
                        style={{
                            width: "1px",
                            height: "14px",
                            background: "rgba(255,255,255,0.12)",
                        }}
                    />
                    <span
                        style={{
                            fontSize: "11px",
                            color:
                                onlineUsers > 1
                                    ? "#22c55e"
                                    : "#6b7280",
                            fontFamily: "monospace",
                        }}
                    >
                        👥 {onlineUsers}
                    </span>
                </>
            )}
        </div>
    );
}