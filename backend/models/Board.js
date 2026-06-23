import mongoose from "mongoose";

const EventSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            required: true,
            enum: ["draw", "undo", "redo", "delete", "move"],
        },

        stroke: {
            type: Object,
            default: null,
        },

        strokeId: {
            type: String,
            default: null,
        },

        x: {
            type: Number,
            default: null,
        },

        y: {
            type: Number,
            default: null,
        },

        userId: {
            type: String,
            required: true,
        },
    },
    { _id: false }
);

const BoardSchema = new mongoose.Schema(
    {
        roomId: {
            type: String,
            required: true,
            unique: true,
        },

        eventLog: [EventSchema],
    },
    { timestamps: true }
);

export default mongoose.model("Board", BoardSchema);