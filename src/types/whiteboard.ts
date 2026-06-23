export type Tool =
    | "select"
    | "pen"
    | "eraser"
    | "rectangle"
    | "circle";

export type Stroke = {
    id: string;
    userId: string;

    tool: Tool;

    points: number[];

    color?: string;

    strokeWidth?: number;

    x?: number;
    y?: number;
};