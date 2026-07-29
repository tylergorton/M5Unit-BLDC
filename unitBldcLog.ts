namespace unitBldcLog {
    function isSimulator(): boolean {
        return control.deviceName() === "sim-"
    }

    function simLog(msg: string): void {
        if (isSimulator()) console.log(msg)
    }

    /**
     * Holds one motor's worth of simulator-only state privately - each
     * BldcMotor owns its own instance, so there's no shared dictionary between
     * motors (no key collisions possible) and no shared global namespace state
     * that another extension's own code could ever collide with.
     */
    export class InstanceLog {
        private state: { [key: string]: any } = {}
        private moniker: string

        /**
         * @param moniker optional label prefixed onto every log line from this
         * instance, e.g. "Motor 101", so multiple instances' output stays easy
         * to tell apart in the Console/data view.
         */
        constructor(moniker: string = "") {
            this.moniker = moniker
        }

        private prefixed(msg: string): string {
            return this.moniker ? this.moniker + ": " + msg : msg
        }

        /**
         * Update the moniker after construction - used when a motor's I2C
         * address changes, so log lines keep reflecting the current address.
         */
        setMoniker(moniker: string): void {
            this.moniker = moniker
        }

        /**
         * Log a one-off text message not tied to any single stored key (e.g. an
         * address change, a flash save, a bootloader jump). Only actually
         * prints when running in the simulator. Returns true when logging IS
         * active (i.e. we're in the simulator), so a caller can use the return
         * value as an early-exit guard:
         * if (this.log.log("...")) return
         * <real I2C call, only reached when NOT in the simulator>
         */
        log(message: string): boolean {
            simLog(this.prefixed(`[DEBUG] ${message}`))
            return isSimulator()
        }

        /**
         * Set a named state value. Only actually prints when running in the
         * simulator, but the value itself is stored either way. Returns true
         * when logging IS active, same as log() above, so a setter can write:
         * if (this.log.set(key, value)) return
         * <real I2C write, only reached when NOT in the simulator>
         */
        set(key: string, value: any): boolean {
            this.state[key] = value
            simLog(this.prefixed(`[STATE] ${key} = ${value}`))
            return isSimulator()
        }

        /**
         * Get a named state value, or a fallback if it hasn't been set yet -
         * but only when actually running in the simulator. Returns undefined
         * outright when not in the simulator, so a single ternary at the call
         * site can flow cleanly: key value -> fallback value -> real read,
         * distinguishing all three outcomes from one return value instead of
         * needing a separate isSimulator() check.
         */
        get(key: string, fallback: any): any {
            if (!isSimulator()) {
                return undefined
            }
            if (key in this.state) {
                let val = this.state[key]
                simLog(this.prefixed(`[GET] ${key} => ${val}`))
                return val
            }
            simLog(this.prefixed(`[DEFAULT] ${key} => ${fallback}`))
            return fallback
        }

        reportState(): void {
            simLog(this.prefixed("=== STATE REPORT ==="))
            for (let k in this.state) {
                simLog(this.prefixed(`${k} = ${this.state[k]}`))
            }
            simLog(this.prefixed("========================"))
        }
    }
}
