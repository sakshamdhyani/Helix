const mongoose = require("mongoose");

const ServiceConfigSchema = new mongoose.Schema(
    {
        services: [
            {
                name: {
                    type: String,
                    required: true,
                    unique: true,
                },
                image: {
                    type: String,
                    required: true,
                },
                replicas: {
                    type: Number,
                    required: true,
                    min: 1,
                },
                port: {
                    type: Number,
                    required: true,
                },
                healthCheck: {
                    path: {
                        type: String,
                        required: true,
                    },
                    timeout: {
                        type: Number,
                        default: 5000
                    },
                },
                container: {
                    type: Map,
                    of: mongoose.Schema.Types.Mixed,
                    default: {},
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("ServiceConfig", ServiceConfigSchema);