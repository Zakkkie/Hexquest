type WallUpdater = (cos: number, sin: number, rot: number) => void;

class WallUpdaterRegistry {
    private updaters = new Set<WallUpdater>();
    public latestCos = 1;
    public latestSin = 0;
    public latestRot = 0;

    add(updater: WallUpdater) {
        this.updaters.add(updater);
    }

    remove(updater: WallUpdater) {
        this.updaters.delete(updater);
    }

    updateAll(rot: number) {
        this.latestRot = rot;
        const angleRad = rot * (Math.PI / 180);
        this.latestCos = Math.cos(angleRad);
        this.latestSin = Math.sin(angleRad);
        for (const updater of this.updaters) {
            updater(this.latestCos, this.latestSin, rot);
        }
    }
}

export const wallUpdaterRegistry = new WallUpdaterRegistry();
