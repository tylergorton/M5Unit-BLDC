namespace unitBldcLog {
    /**
     * Holds one motor's worth of simulator-only state privately - each
     * BldcMotor owns its own instance, so there's no shared dictionary between
     * motors (no key collisions possible) and no shared global namespace state
     * that another extension's own code could ever collide with.
     */
    export class Logger {
        private suppressed: boolean
        private state: { [key: string]: any } = {}
        private moniker: string

        /**
         * @param monikeal  onto every log line from this
         * instance, e.g. "Motor 101", so multiple instances' output stays easy
         * to tell apart in the Console/data view.
         */
        constructor(moniker: string = "") {
            this.moniker = moniker
            this.suppressed = control.deviceName() === "sim-"
        }

        private log(msg: string): void {
            console.log(this.moniker ? this.moniker + ": " + msg : msg)
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
         * if (this.log.msg("...")) return
         * <real I2C call, only reached when NOT in the simulator>
         */
        msg(message: string): boolean {
            if (this.suppressed) return false
            this.log(`[DEBUG] ${message}`)
            return true
        }

        /**
         * Set a named state value. Only actually prints when running in the
         * simulator, but the value itself is stored either way. Returns true
         * when logging IS active, same as log() above, so a setter can write:
         * if (this.log.set(key, value)) return
         * <real I2C write, only reached when NOT in the simulator>
         */
        set(key: string, value: any): boolean {
            if (this.suppressed) return false
            this.state[key] = value
            this.log(`[STATE] ${key} = ${value}`)
            return true
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
            if (this.suppressed) return undefined
            
            if (this.state[key] !== undefined) {
                let val = this.state[key]
                this.log(`[GET] ${key} => ${val}`)
                return val
            }
            this.log(`[DEFAULT] ${key} => ${fallback}`)
            return fallback
        }

        reportState(): void {
            if (this.suppressed) return
            this.log("=== STATE REPORT ===")
            let keys = Object.keys(this.state)
            for (let idx = 0; idx < keys.length; idx++) {
                let k = keys[idx]
                this.log(`${k} = ${this.state[k]}`)
            }
            this.log("========================")
        }
    }
}