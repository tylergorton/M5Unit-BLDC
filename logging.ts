namespace logging {
    let state: { [key: string]: any } = {}

    function isSimulator(): boolean {
        return control.deviceDalVersion() === ""
    }

    function simLog(msg: string): void {
        if (isSimulator()) console.log(msg)
    }

    /**
     * Log a one-off text message. Only actually prints when running in the
     * simulator.
     */
    export function log(message: string): void {
        simLog(`[DEBUG] ${message}`)
    }

    /**
     * Set a named state value. Only actually prints when running in the
     * simulator, but the value itself is stored either way.
     */
    export function set(key: string, value: any): void {
        state[key] = value
        simLog(`[STATE] ${key} = ${value}`)
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
