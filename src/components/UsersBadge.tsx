"use client";

type UsersBadgeProps = {
    count: number;
};

export default function UsersBadge({ count }: UsersBadgeProps) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                background: "rgba(21,24,31,0.72)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "999px",
                padding: "7px 14px 7px 10px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.24)",
            }}
        >
            <span
                style={{
                    display: "inline-block",
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: "#22c55e",
                    boxShadow: "0 0 0 3px rgba(34,197,94,0.18)",
                }}
            />
            <span
                style={{
                    fontSize: "12px",
                    color: "#E2E4E9",
                    fontWeight: 500,
                    fontVariantNumeric: "tabular-nums",
                }}
            >
                {count} online
            </span>
        </div>
    );
}
