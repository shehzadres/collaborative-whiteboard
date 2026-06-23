"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Stage, Layer, Line, Rect, Ellipse } from "react-konva";
import { socket } from "@/lib/socket";
import { KonvaEventObject } from "konva/lib/Node";
import Konva from "konva";
import { Stroke, Tool } from "@/types/whiteboard";
import { getUserId } from "@/lib/user";

// Height consumed by Navbar (48px) + Toolbar (52px)
const CHROME_HEIGHT = 100;

// Stable per-session color for remote cursors (hashed from userId)
function cursorColor(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 60%)`;
}

type CanvasProps = {
    roomId: string;
    selectedTool: Tool;
    color: string;
    strokeWidth: number;
    onlineUsersChange?: (count: number) => void;
    stageRef: React.RefObject<Konva.Stage | null>;
};

export default function Canvas({
    roomId,
    selectedTool,
    color,
    strokeWidth,
    onlineUsersChange,
    stageRef,
}: CanvasProps) {
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [selectedStrokeIds, setSelectedStrokeIds] = useState<string[]>([]);
    const [selectionBox, setSelectionBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
    const isSelectingRef = useRef(false);
    const justBoxSelectedRef = useRef(false);
    const [cursors, setCursors] = useState<Record<string, { x: number; y: number }>>({});
    const [size, setSize] = useState({ width: 0, height: 0 });

    const socketBound = useRef(false);
    const startPointRef = useRef<{ x: number; y: number } | null>(null);

    // Stable userId: never re-derived mid-session
    const userId = useRef(getUserId()).current;

    // =========================
    // CANVAS SIZE — excludes chrome height precisely
    // =========================
    useEffect(() => {
        const updateSize = () => {
            setSize({
                width: window.innerWidth,
                height: window.innerHeight - CHROME_HEIGHT,
            });
        };
        updateSize();
        window.addEventListener("resize", updateSize);
        return () => window.removeEventListener("resize", updateSize);
    }, []);

    // =========================
    // SOCKET EVENTS — bound once per roomId
    // =========================
    useEffect(() => {
        socket.emit("join-room", roomId);

        if (socketBound.current) return;
        socketBound.current = true;

        const handleDraw = (stroke: Stroke) => {
            setStrokes((prev) => {
                if (prev.some((s) => s.id === stroke.id)) return prev;
                return [...prev, stroke];
            });
        };

        const handleHistory = (history: Stroke[]) => setStrokes(history);

        const handleOnlineUsers = (count: number) => {
            onlineUsersChange?.(count);
        };

        const handleCursorUpdate = ({
            userId: remoteId,
            x,
            y,
        }: {
            userId: string;
            x: number;
            y: number;
        }) => {
            // Filter own cursor at the source
            if (remoteId === userId) return;
            setCursors((prev) => ({ ...prev, [remoteId]: { x, y } }));
        };

        const handleStrokeMoved = ({
            strokeId,
            x,
            y,
        }: {
            strokeId: string;
            x: number;
            y: number;
        }) => {
            setStrokes((prev) =>
                prev.map((s) => (s.id === strokeId ? { ...s, x, y } : s))
            );
        };

        const handleStrokeDeleted = ({ strokeId }: { strokeId: string }) => {
            setStrokes((prev) => prev.filter((s) => s.id !== strokeId));
            setSelectedStrokeIds((prev) => prev.filter((id) => id !== strokeId));
        };

        const handleUndo = (history: Stroke[]) => setStrokes(history);
        const handleRedo = (history: Stroke[]) => setStrokes(history);

        socket.on("draw", handleDraw);
        socket.on("board-history", handleHistory);
        socket.on("online-users", handleOnlineUsers);
        socket.on("cursor-update", handleCursorUpdate);
        socket.on("stroke-moved", handleStrokeMoved);
        socket.on("stroke-deleted", handleStrokeDeleted);
        socket.on("undo-history", handleUndo);
        socket.on("redo-history", handleRedo);

        return () => {
            socket.off("draw", handleDraw);
            socket.off("board-history", handleHistory);
            socket.off("online-users", handleOnlineUsers);
            socket.off("cursor-update", handleCursorUpdate);
            socket.off("stroke-moved", handleStrokeMoved);
            socket.off("stroke-deleted", handleStrokeDeleted);
            socket.off("undo-history", handleUndo);
            socket.off("redo-history", handleRedo);
            socketBound.current = false;
        };
    }, [roomId, userId, onlineUsersChange]);

    // =========================
    // KEYBOARD: UNDO / REDO
    // =========================
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const ctrl = e.ctrlKey || e.metaKey;
            const key = e.key.toLowerCase();
            if (!ctrl) return;
            if (key === "z") {
                e.preventDefault();
                socket.emit("undo-stroke", { roomId, userId });
            }
            if (key === "y") {
                e.preventDefault();
                socket.emit("redo-stroke", { roomId, userId });
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [roomId, userId]);

    // =========================
    // KEYBOARD: DELETE SELECTED
    // =========================
    useEffect(() => {
        const handleDelete = (e: KeyboardEvent) => {
            if (e.key !== "Delete" || selectedStrokeIds.length === 0) return;
            selectedStrokeIds.forEach((strokeId) => {
                socket.emit("delete-stroke", { roomId, strokeId, userId });
            });
            setSelectedStrokeIds([]);
        };
        window.addEventListener("keydown", handleDelete);
        return () => window.removeEventListener("keydown", handleDelete);
    }, [selectedStrokeIds, roomId, userId]);

    // =========================
    // CURSOR BROADCAST — throttled to 30ms
    // =========================
    useEffect(() => {
        let lastSent = 0;
        const handleMouseMove = (e: MouseEvent) => {
            const now = Date.now();
            if (now - lastSent < 30) return;
            lastSent = now;
            socket.emit("cursor-move", { roomId, userId, x: e.clientX, y: e.clientY });
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [roomId, userId]);

    // =========================
    // HELPERS
    // =========================
    const getPoint = (e: KonvaEventObject<MouseEvent>) => {
        const pos = e.target.getStage()?.getPointerPosition();
        return { x: pos?.x ?? 0, y: pos?.y ?? 0 };
    };

    // Axis-aligned bounding box for a stroke, accounting for its drag offset.
    // Pen strokes use min/max over all points; rect/circle use their two corner points.
    const strokeBounds = (stroke: Stroke) => {
        const ox = stroke.x ?? 0;
        const oy = stroke.y ?? 0;

        if (stroke.tool === "pen") {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (let i = 0; i < stroke.points.length; i += 2) {
                const px = stroke.points[i];
                const py = stroke.points[i + 1];
                if (px < minX) minX = px;
                if (px > maxX) maxX = px;
                if (py < minY) minY = py;
                if (py > maxY) maxY = py;
            }
            return { minX: minX + ox, minY: minY + oy, maxX: maxX + ox, maxY: maxY + oy };
        }

        // rectangle / circle: points are [x1, y1, x2, y2]
        const [x1, y1, x2, y2] = stroke.points;
        return {
            minX: Math.min(x1, x2) + ox,
            minY: Math.min(y1, y2) + oy,
            maxX: Math.max(x1, x2) + ox,
            maxY: Math.max(y1, y2) + oy,
        };
    };

    const boxesIntersect = (
        a: { minX: number; minY: number; maxX: number; maxY: number },
        b: { x1: number; y1: number; x2: number; y2: number }
    ) => {
        const bx1 = Math.min(b.x1, b.x2);
        const bx2 = Math.max(b.x1, b.x2);
        const by1 = Math.min(b.y1, b.y2);
        const by2 = Math.max(b.y1, b.y2);
        return a.minX <= bx2 && a.maxX >= bx1 && a.minY <= by2 && a.maxY >= by1;
    };

    const toggleSelection = useCallback((strokeId: string) => {
        setSelectedStrokeIds((prev) =>
            prev.includes(strokeId)
                ? prev.filter((id) => id !== strokeId)
                : [...prev, strokeId]
        );
    }, []);

    const deleteStroke = useCallback(
        (strokeId: string) => {
            socket.emit("delete-stroke", { roomId, strokeId, userId });
        },
        [roomId, userId]
    );

    // Applies a delta to every selected stroke, added on top of each
    // stroke's own existing offset — this is what preserves relative
    // positions during a group drag (as opposed to snapping every stroke
    // to the dragged stroke's absolute offset).
    const moveSelectedGroup = useCallback(
        (draggedId: string, deltaX: number, deltaY: number) => {
            if (selectedStrokeIds.length > 1 && selectedStrokeIds.includes(draggedId)) {
                setStrokes((prev) =>
                    prev.map((s) =>
                        selectedStrokeIds.includes(s.id)
                            ? { ...s, x: (s.x ?? 0) + deltaX, y: (s.y ?? 0) + deltaY }
                            : s
                    )
                );
            } else {
                setStrokes((prev) =>
                    prev.map((s) =>
                        s.id === draggedId
                            ? { ...s, x: (s.x ?? 0) + deltaX, y: (s.y ?? 0) + deltaY }
                            : s
                    )
                );
            }
        },
        [selectedStrokeIds]
    );

    // Emits move-stroke for every stroke that moved as part of a group drag
    // (or just the dragged one for single-select), using each stroke's own
    // post-move absolute offset — preserving the existing wire protocol
    // where "move-stroke" carries the stroke's new absolute x/y.
    const emitGroupMove = useCallback(
        (draggedId: string, deltaX: number, deltaY: number) => {
            const groupIds =
                selectedStrokeIds.length > 1 && selectedStrokeIds.includes(draggedId)
                    ? selectedStrokeIds
                    : [draggedId];
            groupIds.forEach((strokeId) => {
                const s = strokes.find((st) => st.id === strokeId);
                const newX = (s?.x ?? 0) + deltaX;
                const newY = (s?.y ?? 0) + deltaY;
                socket.emit("move-stroke", { roomId, strokeId, x: newX, y: newY, userId });
            });
        },
        [selectedStrokeIds, roomId, userId, strokes]
    );

    // =========================
    // STROKE CLICK HANDLER (shared by all shapes)
    // =========================
    const handleShapeClick = useCallback(
        (strokeId: string) => {
            if (selectedTool === "eraser") {
                deleteStroke(strokeId);
                return;
            }
            if (selectedTool === "select") {
                toggleSelection(strokeId);
            }
        },
        [selectedTool, deleteStroke, toggleSelection]
    );

    // =========================
    // DRAW START
    // =========================
    const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
        const point = getPoint(e);
        startPointRef.current = point;

        if (selectedTool === "select") {
            const clickedEmptyStage = e.target === e.target.getStage();
            if (clickedEmptyStage) {
                isSelectingRef.current = true;
                setSelectionBox({ x1: point.x, y1: point.y, x2: point.x, y2: point.y });
            }
            return;
        }

        if (selectedTool === "pen") {
            setCurrentStroke({
                id: crypto.randomUUID(),
                userId,
                tool: "pen",
                color,
                strokeWidth,
                points: [point.x, point.y],
            });
            setIsDrawing(true);
        }

        if (selectedTool === "rectangle") {
            setCurrentStroke({
                id: crypto.randomUUID(),
                userId,
                tool: "rectangle",
                color,
                strokeWidth,
                points: [point.x, point.y, point.x, point.y],
            });
            setIsDrawing(true);
        }

        if (selectedTool === "circle") {
            setCurrentStroke({
                id: crypto.randomUUID(),
                userId,
                tool: "circle",
                color,
                strokeWidth,
                points: [point.x, point.y, point.x, point.y],
            });
            setIsDrawing(true);
        }
    };

    // =========================
    // DRAW MOVE
    // =========================
    const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
        if (isSelectingRef.current) {
            const point = getPoint(e);
            setSelectionBox((prev) => (prev ? { ...prev, x2: point.x, y2: point.y } : prev));
            return;
        }

        if (!isDrawing || !currentStroke) return;
        const point = getPoint(e);
        const start = startPointRef.current;

        if (currentStroke.tool === "pen") {
            setCurrentStroke({
                ...currentStroke,
                points: [...currentStroke.points, point.x, point.y],
            });
            return;
        }

        if (currentStroke.tool === "rectangle" || currentStroke.tool === "circle") {
            if (!start) return;
            setCurrentStroke({
                ...currentStroke,
                points: [start.x, start.y, point.x, point.y],
            });
        }
    };

    // =========================
    // DRAW END
    // =========================
    const finishStroke = () => {
        if (isSelectingRef.current) {
            const box = selectionBox;
            isSelectingRef.current = false;
            setSelectionBox(null);
            if (!box) return;

            // Ignore negligible drags (treat as a click-to-deselect, already handled by Stage onClick)
            if (Math.abs(box.x2 - box.x1) < 4 && Math.abs(box.y2 - box.y1) < 4) return;

            const hitIds = strokes
                .filter((s) => boxesIntersect(strokeBounds(s), box))
                .map((s) => s.id);

            setSelectedStrokeIds(hitIds);
            justBoxSelectedRef.current = true;
            return;
        }

        if (!currentStroke) return;
        const finalized = currentStroke;
        setStrokes((prev) => [...prev, finalized]);
        setCurrentStroke(null);
        setIsDrawing(false);
        startPointRef.current = null;
        socket.emit("draw", { roomId, stroke: finalized });
    };

    // Remote cursors exclude own userId (already filtered in socket handler,
    // but filtering here too as a safety net in case of reconnect races)
    const otherCursors = Object.entries(cursors).filter(
        ([cursorUserId]) => cursorUserId !== userId
    );

    // =========================
    // RENDER HELPERS
    // =========================
    const isSelected = (id: string) => selectedStrokeIds.includes(id);
    const isDraggable = (id: string) =>
        selectedTool === "select" && isSelected(id);

    const selectionStrokeColor = (stroke: Stroke) =>
        isSelected(stroke.id) ? "#6366f1" : stroke.color ?? "#000000";

    const selectionStrokeWidth = (stroke: Stroke) =>
        isSelected(stroke.id) ? (stroke.strokeWidth ?? 2) + 2 : stroke.strokeWidth ?? 2;

    const selectionDash = (stroke: Stroke): number[] | undefined =>
        isSelected(stroke.id) ? [8, 4] : undefined;

    return (
        <div
            style={{
                position: "fixed",
                top: CHROME_HEIGHT,
                left: 0,
                width: "100%",
                height: `calc(100vh - ${CHROME_HEIGHT}px)`,
                overflow: "hidden",
                background: "#f8fafc",
            }}
        >
            {/* Empty state */}
            {strokes.length === 0 && !currentStroke && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        pointerEvents: "none",
                        zIndex: 10,
                    }}
                >
                    <div
                        style={{
                            background: "rgba(15,23,42,0.06)",
                            border: "1px dashed #cbd5e1",
                            padding: "12px 20px",
                            borderRadius: "10px",
                            fontSize: "13px",
                            color: "#64748b",
                        }}
                    >
                        ✏️ Pick a tool and start drawing
                    </div>
                </div>
            )}

            {/* Remote cursors */}
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
                        }}
                    >
                        {/* SVG cursor arrow */}
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill={bgColor}
                            style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
                        >
                            <path d="M0 0 L0 13 L3.5 9.5 L6.5 15 L8.5 14 L5.5 8 L10 8 Z" />
                        </svg>
                        {/* Label */}
                        <div
                            style={{
                                position: "absolute",
                                top: "14px",
                                left: "10px",
                                background: bgColor,
                                color: "#fff",
                                padding: "2px 7px",
                                borderRadius: "999px",
                                fontSize: "11px",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                                boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                            }}
                        >
                            {cursorUserId.slice(0, 6)}
                        </div>
                    </div>
                );
            })}

            {/* Canvas */}
            <Stage
                ref={stageRef}
                width={size.width}
                height={size.height}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={finishStroke}
                onClick={(e) => {
                    // Deselect when clicking stage background — but not the
                    // trailing click that immediately follows a drag-select
                    if (justBoxSelectedRef.current) {
                        justBoxSelectedRef.current = false;
                        return;
                    }
                    if (e.target === e.target.getStage()) {
                        setSelectedStrokeIds([]);
                    }
                }}
                style={{ display: "block" }}
            >
                <Layer>
                    {strokes.map((stroke) => {
                        // ── RECTANGLE ──
                        if (stroke.tool === "rectangle") {
                            const [x1, y1, x2, y2] = stroke.points;
                            const ox = stroke.x ?? 0;
                            const oy = stroke.y ?? 0;

                            return (
                                <Rect
                                    key={stroke.id}
                                    // Apply offset to the normalized top-left corner
                                    x={Math.min(x1, x2) + ox}
                                    y={Math.min(y1, y2) + oy}
                                    width={Math.abs(x2 - x1)}
                                    height={Math.abs(y2 - y1)}
                                    stroke={selectionStrokeColor(stroke)}
                                    strokeWidth={selectionStrokeWidth(stroke)}
                                    dash={selectionDash(stroke)}
                                    fill="transparent"
                                    onClick={() => handleShapeClick(stroke.id)}
                                    draggable={isDraggable(stroke.id)}
                                    onDragMove={(e) => {
                                        // New absolute offset for the dragged rect, converted to a
                                        // delta-since-drag-start (against its own prior ox) so group
                                        // members can apply the same delta on top of their own offsets.
                                        const newX = e.target.x() - Math.min(x1, x2);
                                        const newY = e.target.y() - Math.min(y1, y2);
                                        moveSelectedGroup(stroke.id, newX - ox, newY - oy);
                                    }}
                                    onDragEnd={(e) => {
                                        const newX = e.target.x() - Math.min(x1, x2);
                                        const newY = e.target.y() - Math.min(y1, y2);
                                        const deltaX = newX - ox;
                                        const deltaY = newY - oy;
                                        moveSelectedGroup(stroke.id, deltaX, deltaY);
                                        emitGroupMove(stroke.id, deltaX, deltaY);
                                    }}
                                />
                            );
                        }

                        // ── CIRCLE ──
                        if (stroke.tool === "circle") {
                            const [x1, y1, x2, y2] = stroke.points;
                            const ox = stroke.x ?? 0;
                            const oy = stroke.y ?? 0;
                            const cx = (x1 + x2) / 2;
                            const cy = (y1 + y2) / 2;

                            return (
                                <Ellipse
                                    key={stroke.id}
                                    x={cx + ox}
                                    y={cy + oy}
                                    radiusX={Math.abs(x2 - x1) / 2}
                                    radiusY={Math.abs(y2 - y1) / 2}
                                    stroke={selectionStrokeColor(stroke)}
                                    strokeWidth={selectionStrokeWidth(stroke)}
                                    dash={selectionDash(stroke)}
                                    fill="transparent"
                                    onClick={() => handleShapeClick(stroke.id)}
                                    draggable={isDraggable(stroke.id)}
                                    onDragMove={(e) => {
                                        const newX = e.target.x() - cx;
                                        const newY = e.target.y() - cy;
                                        moveSelectedGroup(stroke.id, newX - ox, newY - oy);
                                    }}
                                    onDragEnd={(e) => {
                                        const newX = e.target.x() - cx;
                                        const newY = e.target.y() - cy;
                                        const deltaX = newX - ox;
                                        const deltaY = newY - oy;
                                        moveSelectedGroup(stroke.id, deltaX, deltaY);
                                        emitGroupMove(stroke.id, deltaX, deltaY);
                                    }}
                                />
                            );
                        }

                        // ── PEN ──
                        return (
                            <Line
                                key={stroke.id}
                                points={stroke.points}
                                stroke={selectionStrokeColor(stroke)}
                                strokeWidth={selectionStrokeWidth(stroke)}
                                dash={selectionDash(stroke)}
                                tension={0.5}
                                lineCap="round"
                                lineJoin="round"
                                fill="transparent"
                                x={stroke.x ?? 0}
                                y={stroke.y ?? 0}
                                onClick={() => handleShapeClick(stroke.id)}
                                draggable={isDraggable(stroke.id)}
                                onDragMove={(e) => {
                                    const newX = e.target.x();
                                    const newY = e.target.y();
                                    moveSelectedGroup(stroke.id, newX - (stroke.x ?? 0), newY - (stroke.y ?? 0));
                                }}
                                onDragEnd={(e) => {
                                    const newX = e.target.x();
                                    const newY = e.target.y();
                                    const deltaX = newX - (stroke.x ?? 0);
                                    const deltaY = newY - (stroke.y ?? 0);
                                    moveSelectedGroup(stroke.id, deltaX, deltaY);
                                    emitGroupMove(stroke.id, deltaX, deltaY);
                                }}
                            />
                        );
                    })}

                    {/* Live pen preview */}
                    {currentStroke?.tool === "pen" && (
                        <Line
                            points={currentStroke.points}
                            stroke={currentStroke.color ?? "#000"}
                            strokeWidth={currentStroke.strokeWidth ?? 2}
                            tension={0.5}
                            lineCap="round"
                            lineJoin="round"
                        />
                    )}

                    {/* Live rectangle preview */}
                    {currentStroke?.tool === "rectangle" && (() => {
                        const [x1, y1, x2, y2] = currentStroke.points;
                        return (
                            <Rect
                                x={Math.min(x1, x2)}
                                y={Math.min(y1, y2)}
                                width={Math.abs(x2 - x1)}
                                height={Math.abs(y2 - y1)}
                                stroke={currentStroke.color ?? "#000"}
                                strokeWidth={currentStroke.strokeWidth ?? 2}
                                fill="transparent"
                            />
                        );
                    })()}

                    {/* Live circle preview */}
                    {currentStroke?.tool === "circle" && (() => {
                        const [x1, y1, x2, y2] = currentStroke.points;
                        return (
                            <Ellipse
                                x={(x1 + x2) / 2}
                                y={(y1 + y2) / 2}
                                radiusX={Math.abs(x2 - x1) / 2}
                                radiusY={Math.abs(y2 - y1) / 2}
                                stroke={currentStroke.color ?? "#000"}
                                strokeWidth={currentStroke.strokeWidth ?? 2}
                                fill="transparent"
                            />
                        );
                    })()}

                    {/* Live selection-box marquee */}
                    {selectionBox && (
                        <Rect
                            x={Math.min(selectionBox.x1, selectionBox.x2)}
                            y={Math.min(selectionBox.y1, selectionBox.y2)}
                            width={Math.abs(selectionBox.x2 - selectionBox.x1)}
                            height={Math.abs(selectionBox.y2 - selectionBox.y1)}
                            fill="rgba(99,102,241,0.12)"
                            stroke="#6366f1"
                            strokeWidth={1}
                            dash={[4, 3]}
                            listening={false}
                        />
                    )}
                </Layer>
            </Stage>
        </div>
    );
}
