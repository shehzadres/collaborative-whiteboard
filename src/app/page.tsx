// app/board/[id]/page.tsx  — or wherever your board route lives
"use client";

import { useParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import Konva from "konva";
import Navbar from "@/components/Navbar";
import Toolbar from "@/components/Toolbar";
import Canvas from "@/components/Canvas";
import { Tool } from "@/types/whiteboard";

export default function BoardPage() {
    const { id: roomId } = useParams<{ id: string }>();

    const [selectedTool, setSelectedTool] = useState<Tool>("pen");
    const [color, setColor] = useState("#000000");
    const [strokeWidth, setStrokeWidth] = useState(3);
    const [onlineUsers, setOnlineUsers] = useState(1);

    // stageRef lives here so Toolbar can call export without Canvas exposing internals
    const stageRef = useRef<Konva.Stage | null>(null);

    const exportPNG = useCallback(() => {
        if (!stageRef.current) return;
        const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
        const link = document.createElement("a");
        link.download = `whiteboard-${Date.now()}.png`;
        link.href = uri;
        link.click();
    }, []);

    const exportJPG = useCallback(() => {
        if (!stageRef.current) return;
        const uri = stageRef.current.toDataURL({ mimeType: "image/jpeg", quality: 1, pixelRatio: 2 });
        const link = document.createElement("a");
        link.download = `whiteboard-${Date.now()}.jpg`;
        link.href = uri;
        link.click();
    }, []);

    return (
        <>
            <Navbar roomId={roomId} onlineUsers={onlineUsers} />

            <Toolbar
                roomId={roomId}
                selectedTool={selectedTool}
                setSelectedTool={setSelectedTool}
                color={color}
                setColor={setColor}
                strokeWidth={strokeWidth}
                setStrokeWidth={setStrokeWidth}
                onExportPNG={exportPNG}
                onExportJPG={exportJPG}
            />

            <Canvas
                roomId={roomId}
                selectedTool={selectedTool}
                color={color}
                strokeWidth={strokeWidth}
                onlineUsersChange={setOnlineUsers}
                stageRef={stageRef}
            />
        </>
    );
}
