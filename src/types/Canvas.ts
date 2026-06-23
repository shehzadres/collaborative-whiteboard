export type Tool = "pen" | "rect" | "circle";

export type Point = {
    x: number;
    y: number;
};
export type PenStroke = {
    id: string;
    type: "pen";
    points: number[];
};

export type RectangleShape = {
    id: string;
    type: "rect";
    x: number;
    y: number;
    width: number;
    height: number;
};

export type CircleShape = {
    id: string;
    type: "circle";
    x: number;
    y: number;
    radius: number;
};
