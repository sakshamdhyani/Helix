class ClusterState {

    constructor() {
        this.containers = new Map();
    }

    setContainer(container) {
        this.containers.set(container.id, container);
    }

    getContainer(containerId) {
        return this.containers.get(containerId);
    }

    getAllContainers() {
        return [...this.containers.values()];
    }

    clear() {
        this.containers.clear();
    }

}

module.exports = ClusterState;