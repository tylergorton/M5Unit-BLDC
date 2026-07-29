namespace logging {
    let state: { [key: string]: any } = {}

    function isSimulator(): boolean {
        return control.deviceName() == "sim-"
    }

    function simLog(msg: string): void {
        if (isSimulator()) console.log(msg)
    }

    /**
     * Log a one-off text message. Only actually prints when running in the
     * simulator. Returns true when logging IS active (i.e. we're in the
     * simulator), so a caller can use the return value as an early-exit guard:
     * if (logging.log("...")) return
     * <real I2C call, only reached when NOT in the simulator>
     */
    export function log(message: string): boolean {
        simLog(`[DEBUG] ${message}`)
        return isSimulator()
    }
 
    /**
     * Set a named state value. Only actually prints when running in the
     * simulator, but the value itself is stored either way. Returns true when
     * logging IS active, same as log() above, so a setter can write:
     * if (logging.set(key, value)) return
     * <real I2C write, only reached when NOT in the simulator>
     */
    export function set(key: string, value: any): boolean {
        state[key] = value
        simLog(`[STATE] ${key} = ${value}`)
        return isSimulator()
    }
 
    /**
     * Get a named state value, or a fallback if it hasn't been set yet - but only
     * when actually running in the simulator. Returns undefined outright when not
     * in the simulator, so a single ternary at the call site can flow cleanly:
     * key value -> fallback value -> real read, distinguishing all three outcomes
     * from one return value instead of needing a separate isSimulator() check.
     */
    export function get(key: string, fallback: any): any {
        if (!isSimulator()) {
            return undefined
        }
        if (key in state) {
            let val = state[key]
            simLog(`[GET] ${key} => ${val}`)
            return val
        }
        simLog(`[DEFAULT] ${key} => ${fallback}`)
        return fallback
    }
 
    export function reportState(): void {
        simLog("=== STATE REPORT ===")
        for (let k in state) {
            simLog(`${k} = ${state[k]}`)
        }
        simLog("========================")
    }
}