const Docker = require('dockerode');

class DockerService {
    constructor() {
        this.docker = new Docker();
    }

    mapContainer(container) {
        return {
            id: container.Id,
            name: container.Names[0].replace('/', ''),
            image: container.Image,
            state: container.State,
            status: container.Status,
            labels: container.Labels,
            createdAt: container.Created,
            hostPort: container.Ports[0]?.PublicPort
        };
    }

    async connect() {
        try {
            await this.docker.ping();
            const version = await this.docker.version();
            console.log('Connected to Docker');
            console.log(`Docker Engine Version: ${version.Version}`);
            return version;
        } catch (error) {
            throw new Error(`Failed to connect to Docker: ${error.message}`);
        }
    }

    async listContainers() {
        try {
            const containers = await this.docker.listContainers({
                all: true
            });
            return containers.map(container => this.mapContainer(container));
        } catch (error) {
            throw new Error(`Failed to list containers: ${error.message}`);
        }
    }

    async inspectContainer(containerId) {
        try {
            const container = this.docker.getContainer(containerId);
            return await container.inspect();
        } catch (error) {
            throw new Error(`Failed to inspect container ${containerId}: ${error.message}`);
        }
    }

    async startContainer(containerId) {
        try {
            const container = this.docker.getContainer(containerId);
            await container.start();
            console.log(`Started container: ${containerId}`);
        } catch (error) {
            throw new Error(`Failed to start container ${containerId}: ${error.message}`);
        }
    }

    async stopContainer(containerId) {
        try {
            const container = this.docker.getContainer(containerId);
            await container.stop();
            console.log(`Stopped container: ${containerId}`);
        } catch (error) {
            throw new Error(`Failed to stop container ${containerId}: ${error.message}`);
        }
    }

    async restartContainer(containerId) {
        try {
            const container = this.docker.getContainer(containerId);
            await container.restart();
            console.log(`Restarted container: ${containerId}`);
        } catch (error) {
            throw new Error(`Failed to restart container ${containerId}: ${error.message}`);
        }
    }

    async removeContainer(containerId) {
        try {
            const container = this.docker.getContainer(containerId);
            await container.remove({ force: true });
            console.log(`Removed container: ${containerId}`);
        } catch (error) {
            throw new Error(`Failed to remove container ${containerId}: ${error.message}`);
        }
    }

    async createContainer(options) {
        try {
            console.log('Creating container...');
            const container = await this.docker.createContainer(options);
            console.log(`Container created: ${container.id}`);
            await container.start();
            return container;
        } catch (error) {
            throw new Error(`Failed to create container: ${error.message}`);
        }
    }

    getEvents(callback) {
        this.docker.getEvents(callback);
    }
}

module.exports = DockerService;