export function getUserId() {
    if (typeof window === "undefined") {
        return "";
    }

    let userId =
        localStorage.getItem("whiteboard-user-id");

    if (!userId) {
        userId = crypto.randomUUID();

        localStorage.setItem(
            "whiteboard-user-id",
            userId
        );
    }

    return userId;
}