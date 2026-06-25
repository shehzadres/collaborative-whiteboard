import { redirect } from "next/navigation";

function generateRoomId(): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 12; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

export default function Home() {
    redirect(`/board/${generateRoomId()}`);
}
