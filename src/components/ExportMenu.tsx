"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Download, ChevronDown } from "lucide-react";

type ExportMenuProps = {
    onExportPNG: () => void;
    onExportJPG: () => void;
    /** "up" for bottom-dock mobile layout, "down" for desktop/tablet */
    direction?: "up" | "down";
};

export default function ExportMenu({
    onExportPNG,
    onExportJPG,
    direction = "down",
}: ExportMenuProps) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const wrapRef = useRef<HTMLDivElement>(null);
    const btnRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            const onTrigger = wrapRef.current?.contains(target);
            const onMenu = (e.target as HTMLElement).closest("[data-export-menu]");
            if (!onTrigger && !onMenu) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    useEffect(() => {
        if (!open) return;
        const updatePos = () => {
            const rect = btnRef.current?.getBoundingClientRect();
            if (!rect) return;
            if (direction === "up") {
                setPos({ top: rect.top - 8, left: rect.left });
            } else {
                setPos({ top: rect.bottom + 8, left: rect.left });
            }
        };
        updatePos();
        window.addEventListener("resize", updatePos);
        window.addEventListener("scroll", updatePos, true);
        return () => {
            window.removeEventListener("resize", updatePos);
            window.removeEventListener("scroll", updatePos, true);
        };
    }, [open, direction]);

    const toggle = () => {
        if (!open && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setPos(
                direction === "up"
                    ? { top: rect.top - 8, left: rect.left }
                    : { top: rect.bottom + 8, left: rect.left }
            );
        }
        setOpen((v) => !v);
    };

    const items = [
        { label: "Export as PNG", action: onExportPNG },
        { label: "Export as JPG", action: onExportJPG },
    ];

    return (
        <div ref={wrapRef} style={{ position: "relative" }}>
            <button
                ref={btnRef}
                onClick={toggle}
                aria-haspopup="menu"
                aria-expanded={open}
                title="Export"
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    height: "40px",
                    padding: "0 14px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: open ? "rgba(99,102,241,0.16)" : "rgba(255,255,255,0.04)",
                    color: open ? "#A5B4FC" : "#9aa3b2",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    transition: "background 0.15s ease, color 0.15s ease",
                }}
            >
                <Download size={15} strokeWidth={2} />
                <span>Export</span>
                <ChevronDown
                    size={12}
                    strokeWidth={2}
                    style={{
                        transform: open ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.18s ease",
                    }}
                />
            </button>

            {open &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        data-export-menu
                        role="menu"
                        style={{
                            position: "fixed",
                            top: direction === "up" ? undefined : pos.top,
                            bottom:
                                direction === "up"
                                    ? `calc(100vh - ${pos.top}px)`
                                    : undefined,
                            left: pos.left,
                            background: "rgba(21,24,31,0.92)",
                            backdropFilter: "blur(20px)",
                            WebkitBackdropFilter: "blur(20px)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "12px",
                            boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
                            overflow: "hidden",
                            minWidth: "160px",
                            zIndex: 10000,
                            padding: "6px",
                            transformOrigin: direction === "up" ? "bottom left" : "top left",
                            animation: "exportMenuIn 0.14s ease forwards",
                        }}
                    >
                        <style>{`
                            @keyframes exportMenuIn {
                                from { opacity: 0; transform: scale(0.96) translateY(${direction === "up" ? "4px" : "-4px"}); }
                                to { opacity: 1; transform: scale(1) translateY(0); }
                            }
                        `}</style>
                        {items.map(({ label, action }) => (
                            <button
                                key={label}
                                role="menuitem"
                                onClick={() => {
                                    action();
                                    setOpen(false);
                                }}
                                style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "9px 12px",
                                    textAlign: "left",
                                    border: "none",
                                    borderRadius: "8px",
                                    background: "transparent",
                                    color: "#c4c9d4",
                                    fontSize: "13px",
                                    fontWeight: 500,
                                    cursor: "pointer",
                                    transition: "background 0.1s ease, color 0.1s ease",
                                }}
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.background =
                                        "rgba(99,102,241,0.16)";
                                    (e.currentTarget as HTMLButtonElement).style.color = "#E2E4E9";
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.background =
                                        "transparent";
                                    (e.currentTarget as HTMLButtonElement).style.color = "#c4c9d4";
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>,
                    document.body
                )}
        </div>
    );
}
