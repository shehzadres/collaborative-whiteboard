"use client";

import {
    MousePointer2,
    Pencil,
    Eraser,
    Square,
    Circle,
    Link,
} from "lucide-react";
import toast from "react-hot-toast";
import { Tool } from "@/types/whiteboard";
import ExportMenu from "./ExportMenu";

type ToolbarProps = {
    roomId: string;
    selectedTool: Tool;
    setSelectedTool: (tool: Tool) => void;
    color: string;
    setColor: (color: string) => void;
    strokeWidth: number;
    setStrokeWidth: (size: number) => void;
    onExportPNG: () => void;
    onExportJPG: () => void;
};

const TOOLS: { id: Tool; label: string; Icon: React.ElementType }[] = [
    { id: "select", label: "Select", Icon: MousePointer2 },
    { id: "pen", label: "Pen", Icon: Pencil },
    { id: "eraser", label: "Eraser", Icon: Eraser },
    { id: "rectangle", label: "Rectangle", Icon: Square },
    { id: "circle", label: "Circle", Icon: Circle },
];

// Shared capsule chrome — desktop rail, tablet rail, mobile dock all reuse this
const capsuleStyle: React.CSSProperties = {
    background: "rgba(21,24,31,0.72)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 8px 28px rgba(0,0,0,0.32)",
};

export default function Toolbar({
    roomId,
    selectedTool,
    setSelectedTool,
    color,
    setColor,
    strokeWidth,
    setStrokeWidth,
    onExportPNG,
    onExportJPG,
}: ToolbarProps) {
    const copyRoomLink = async () => {
        try {
            const id = Array.isArray(roomId) ? roomId[0] : roomId;
            const roomLink = `${window.location.origin}/board/${encodeURIComponent(id)}`;
            await navigator.clipboard.writeText(roomLink);
            toast.success("Room link copied!");
        } catch {
            toast.error("Failed to copy link");
        }
    };

    const toolButton = (id: Tool, label: string, Icon: React.ElementType, size = 18) => {
        const active = selectedTool === id;
        return (
            <button
                key={id}
                onClick={() => setSelectedTool(id)}
                title={label}
                aria-label={label}
                aria-pressed={active}
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "44px",
                    height: "44px",
                    borderRadius: "10px",
                    border: "1px solid transparent",
                    background: active ? "rgba(99,102,241,0.18)" : "transparent",
                    color: active ? "#A5B4FC" : "#8a93a3",
                    cursor: "pointer",
                    flexShrink: 0,
                    transition: "background 0.15s ease, color 0.15s ease, transform 0.1s ease",
                }}
                onMouseEnter={(e) => {
                    if (!active) {
                        (e.currentTarget as HTMLButtonElement).style.background =
                            "rgba(255,255,255,0.06)";
                        (e.currentTarget as HTMLButtonElement).style.color = "#cbd2dc";
                    }
                }}
                onMouseLeave={(e) => {
                    if (!active) {
                        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                        (e.currentTarget as HTMLButtonElement).style.color = "#8a93a3";
                    }
                }}
                onMouseDown={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.92)";
                }}
                onMouseUp={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                }}
            >
                <Icon size={size} strokeWidth={2} />
            </button>
        );
    };

    return (
        <>
            {/* ============ DESKTOP / TABLET — floating left rail ============ */}
            <nav
                aria-label="Drawing tools"
                className="wb-rail"
                style={{
                    ...capsuleStyle,
                    position: "fixed",
                    top: "50%",
                    left: "20px",
                    transform: "translateY(-50%)",
                    zIndex: 999,
                    borderRadius: "16px",
                    padding: "10px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                }}
            >
                {TOOLS.map(({ id, label, Icon }) => toolButton(id, label, Icon))}

                <div
                    style={{
                        width: "28px",
                        height: "1px",
                        background: "rgba(255,255,255,0.08)",
                        margin: "6px 0",
                    }}
                />

                {/* Color swatch */}
                <label
                    title="Color"
                    style={{
                        display: "block",
                        width: "30px",
                        height: "30px",
                        borderRadius: "9px",
                        border: "2px solid rgba(255,255,255,0.14)",
                        background: color,
                        cursor: "pointer",
                        overflow: "hidden",
                        position: "relative",
                        flexShrink: 0,
                    }}
                >
                    <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        aria-label="Stroke color"
                        style={{
                            position: "absolute",
                            opacity: 0,
                            width: "100%",
                            height: "100%",
                            cursor: "pointer",
                            padding: 0,
                            border: 0,
                        }}
                    />
                </label>

                {/* Stroke width — vertical slider */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "4px",
                        padding: "8px 0 2px",
                    }}
                >
                    <input
                        type="range"
                        min={1}
                        max={20}
                        value={strokeWidth}
                        onChange={(e) => setStrokeWidth(Number(e.target.value))}
                        aria-label="Stroke width"
                        style={{
                            width: "70px",
                            accentColor: "#6366f1",
                            cursor: "pointer",
                            transform: "rotate(-90deg)",
                            margin: "26px -18px",
                        }}
                    />
                    <span
                        style={{
                            fontSize: "10px",
                            color: "#6b7280",
                            fontWeight: 600,
                            fontVariantNumeric: "tabular-nums",
                        }}
                    >
                        {strokeWidth}px
                    </span>
                </div>
            </nav>

            {/* ============ DESKTOP / TABLET — floating top-right cluster ============ */}
            <div
                className="wb-top-cluster"
                style={{
                    position: "fixed",
                    top: "20px",
                    right: "20px",
                    zIndex: 999,
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                }}
            >
                <div
                    style={{
                        ...capsuleStyle,
                        borderRadius: "10px",
                        height: "40px",
                        display: "flex",
                        alignItems: "center",
                        padding: "0 4px",
                        gap: "4px",
                    }}
                >
                    <ExportMenu onExportPNG={onExportPNG} onExportJPG={onExportJPG} direction="down" />
                </div>

                <button
                    onClick={copyRoomLink}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        height: "40px",
                        padding: "0 16px",
                        borderRadius: "10px",
                        border: "1px solid rgba(99,102,241,0.35)",
                        background: "rgba(99,102,241,0.16)",
                        color: "#A5B4FC",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background =
                            "rgba(99,102,241,0.26)";
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background =
                            "rgba(99,102,241,0.16)";
                    }}
                >
                    <Link size={14} strokeWidth={2} />
                    <span>Share</span>
                </button>
            </div>

            {/* ============ MOBILE — bottom dock ============ */}
            <nav
                aria-label="Drawing tools"
                className="wb-dock"
                style={{
                    ...capsuleStyle,
                    position: "fixed",
                    left: "12px",
                    right: "12px",
                    bottom: "14px",
                    zIndex: 999,
                    borderRadius: "18px",
                    padding: "8px 10px",
                    display: "none",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "4px",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "2px", overflowX: "auto" }}>
                    {TOOLS.map(({ id, label, Icon }) => toolButton(id, label, Icon, 17))}
                </div>

                <div
                    style={{
                        width: "1px",
                        height: "26px",
                        background: "rgba(255,255,255,0.1)",
                        flexShrink: 0,
                        margin: "0 4px",
                    }}
                />

                <label
                    title="Color"
                    style={{
                        display: "block",
                        width: "30px",
                        height: "30px",
                        borderRadius: "9px",
                        border: "2px solid rgba(255,255,255,0.14)",
                        background: color,
                        cursor: "pointer",
                        overflow: "hidden",
                        position: "relative",
                        flexShrink: 0,
                    }}
                >
                    <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        aria-label="Stroke color"
                        style={{
                            position: "absolute",
                            opacity: 0,
                            width: "100%",
                            height: "100%",
                            cursor: "pointer",
                            padding: 0,
                            border: 0,
                        }}
                    />
                </label>

                <div style={{ flexShrink: 0 }}>
                    <ExportMenu onExportPNG={onExportPNG} onExportJPG={onExportJPG} direction="up" />
                </div>
            </nav>

            {/* Responsive breakpoints — rail/cluster on desktop+tablet, dock on mobile */}
            <style>{`
                @media (max-width: 767px) {
                    .wb-rail { display: none !important; }
                    .wb-top-cluster { 
                        top: 14px !important; 
                        right: 12px !important; 
                    }
                    .wb-top-cluster button span { display: none; }
                    .wb-top-cluster button { padding: 0 12px !important; }
                    .wb-dock { display: flex !important; }
                }
                @media (min-width: 768px) and (max-width: 1023px) {
                    .wb-rail { padding: 8px !important; left: 12px !important; }
                }
            `}</style>
        </>
    );
}
