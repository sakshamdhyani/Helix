const express = require("express");
const router = express.Router();

const ServiceConfig = require("../models/service");

router.post("/create-config", async (req, res) => {
    try {
        const {
            name,
            imageName,
            replicas,
            port,
            healthCheckPath,
            managedBy,
        } = req.body;

        // Validation
        if (
            !name ||
            !imageName ||
            !replicas ||
            !port ||
            !healthCheckPath ||
            !managedBy
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required.",
            });
        }

        const service = {
            name,
            image: imageName,
            replicas: Number(replicas),
            port: Number(port),
            healthCheck: {
                path: healthCheckPath,
                timeout: 5000,
            },
            container: {
                labels: {
                    managedBy,
                    service: name,
                },
            },
        };

        // Assuming you maintain a single config document
        let config = await ServiceConfig.findOne();

        if (!config) {
            config = await ServiceConfig.create({
                services: [service],
            });
        } else {
            const exists = config.services.find(
                (s) => s.name === name
            );

            if (exists) {
                return res.status(409).json({
                    success: false,
                    message: "Service already exists.",
                });
            }

            config.services.push(service);
            await config.save();
        }

        return res.status(201).json({
            success: true,
            message: "Service configuration created successfully.",
            data: config,
        });
    } catch (err) {
        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Internal server error.",
            error: err.message,
        });
    }
});

module.exports = router;