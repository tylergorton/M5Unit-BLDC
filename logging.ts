namespace logging {
    let state: { [key: string]: any } = {}

    function isSimulator(): boolean {
        return control.deviceDalVersion() === ""
    }

    function simLog(msg: string): void {
        if (isSimulator()) console.log(msg)
    }

    // Overloads
    export function log(message: string): void
    export function log(key: string, value: any): void
    export function log(key: string): any
    export function log(arg1: string, arg2?: any): any {
        if (arg2 === undefined && !(arg1 in state)) {
            simLog(`[DEBUG] ${arg1}`)
            return
        }
        if (arg2 !== undefined) {
            state[arg1] = arg2
            simLog(`[STATE] ${arg1} = ${arg2}`)
            return
        }
        let val = state[arg1]
        simLog(`[GET] ${arg1} => ${val}`)
        return val
    }

    export function reportState(): void {
        simLog("=== STATE REPORT ===")
        for (let k in state) {
            simLog(`${k} = ${state[k]}`)
        }
        simLog("========================")
    }
}
