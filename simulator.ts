/**
 * Simulator-only implementation for unitBldc (see main.ts). Only ever compiled
 * into the browser simulator bundle - see "simFiles" in pxt.json. Never shipped
 * to a real board, and never referenced from anywhere except the shim
 * annotations in main.ts.
 *
 * Keeps a shadow of every motor's settings (by I2C address, since that's the
 * only identifier main.ts passes across the shim boundary - main.ts's BldcMotor
 * objects and this state live in two separate JS execution contexts and can't
 * see each other's variables directly).
 */
namespace pxsim.unitBldcSim {

    interface MotorState {
        mode: number
        direction: number
        pwm: number
        rpm: number
        pid: number[]
        motorModel: number
        polePairs: number
        // Index into the visual widget's fixed slots, or -1 if none available.
        slot: number
    }

    const MAX_VISUAL_SLOTS = 2

    let motors: { [address: number]: MotorState } = {}
    let slotCount = 0
    let animationActive = false
    let angles: { [address: number]: number } = {}

    function state(address: number): MotorState {
        let m = motors[address]
        if (!m) {
            m = {
                mode: 0,
                direction: 0,
                pwm: 0,
                rpm: 0,
                pid: [0, 0, 0],
                motorModel: 0,
                polePairs: 7,
                slot: slotCount < MAX_VISUAL_SLOTS ? slotCount++ : -1
            }
            motors[address] = m
        }
        return m
    }

    // Console logging, in addition to the live widget text below. Falls back to
    // the browser DevTools console if the Console/data view isn't open.
    function log(address: number, message: string): void {
        console.log("Motor " + address + ": " + message)
    }

    function updateWidget(address: number, m: MotorState): void {
        if (m.slot < 0) return
        const textEl = document.getElementById("unitbldc-text-" + m.slot)
        if (textEl) {
            textEl.textContent =
                "#" + address + "  RPM:" + m.rpm + "  PWM:" + m.pwm
        }
        ensureAnimating()
    }

    function ensureAnimating(): void {
        if (animationActive) return
        animationActive = true
        requestAnimationFrame(animate)
    }

    function animate(): void {
        for (let key in motors) {
            const address = parseInt(key)
            const m = motors[address]
            if (m.slot < 0) continue
            const magnitude = m.pwm > 0
                ? m.pwm / 2047
                : (m.rpm != 0 ? Math.min(Math.abs(m.rpm) / 3000, 1) : 0)
            angles[address] = ((angles[address] || 0) + magnitude * 6) % 360
            const wheel = document.getElementById("unitbldc-wheel-" + m.slot)
            if (wheel) {
                wheel.setAttribute("transform", "rotate(" + angles[address] + " 40 45)")
            }
        }
        requestAnimationFrame(animate)
    }

    export function isConnected(address: number): boolean {
        state(address) // register this address so it gets a widget slot
        return false // no physical device exists in the simulator
    }

    export function setMode(address: number, mode: number): void {
        state(address).mode = mode
        log(address, "control mode was set to " + (mode == 1 ? "closed loop" : "open loop"))
    }

    export function getMode(address: number): number {
        return state(address).mode
    }

    export function setDirection(address: number, dir: number): void {
        state(address).direction = dir
        log(address, "direction was set to " + (dir == 1 ? "backward" : "forward"))
    }

    export function getDirection(address: number): number {
        return state(address).direction
    }

    export function setPWM(address: number, duty: number): void {
        const m = state(address)
        m.pwm = duty
        log(address, "PWM duty was set to " + duty)
        updateWidget(address, m)
    }

    export function getPWM(address: number): number {
        return state(address).pwm
    }

    export function setRPM(address: number, rpm: number): void {
        const m = state(address)
        m.rpm = rpm
        log(address, "RPM was set to " + rpm)
        updateWidget(address, m)
    }

    export function getRPM(address: number): number {
        return state(address).rpm
    }

    export function getRpmReadback(address: number): number {
        return state(address).rpm
    }

    export function getFreqReadback(address: number): number {
        const m = state(address)
        return (m.rpm * m.polePairs) / 60
    }

    export function getRpmReadbackString(address: number): string {
        return "" + state(address).rpm
    }

    export function getFreqReadbackString(address: number): string {
        return "" + getFreqReadback(address)
    }

    export function setPID(address: number, p: number, i: number, d: number): void {
        state(address).pid = [p, i, d]
        log(address, "PID was set to Kp=" + p + ", Ki=" + i + ", Kd=" + d)
    }

    export function getPID(address: number): number[] {
        return state(address).pid
    }

    export function getMotorStatus(address: number): number {
        const m = state(address)
        return (m.pwm > 0 || m.rpm != 0) ? 1 : 0
    }

    export function setMotorModel(address: number, model: number): void {
        state(address).motorModel = model
        log(address, "motor model was set to " + (model == 1 ? "high speed" : "low speed"))
    }

    export function getMotorModel(address: number): number {
        return state(address).motorModel
    }

    export function setMotorPolePairs(address: number, pairs: number): void {
        state(address).polePairs = pairs
        log(address, "pole pairs was set to " + pairs)
    }

    export function getMotorPolePairs(address: number): number {
        return state(address).polePairs
    }

    export function saveMotorDataToFlash(address: number): void {
        log(address, "config save to flash was requested (no effect in the simulator)")
    }

    export function getFirmwareVersion(address: number): number {
        return 0
    }

    export function setI2CAddress(address: number, newAddr: number): boolean {
        const m = motors[address]
        if (m) {
            delete motors[address]
            motors[newAddr] = m
        }
        log(newAddr, "I2C address was set to " + newAddr)
        return true
    }

    export function jumpBootloader(address: number): void {
        log(address, "bootloader jump was requested (no effect in the simulator)")
    }
}

/**
 * NOTE ON THE VISUAL WIDGET BELOW: this part is adapted directly from a working
 * VisualControlView example, but the exact mechanism that registers/mounts a
 * custom control view onto the simulator board isn't something confirmed here -
 * it may need adjustment once you actually try building this. The state-tracking
 * and Console logging above (pxsim.unitBldcSim) don't depend on this part working
 * and will function regardless.
 */
namespace pxsim {
    export class UnitBldcVisualControlView extends pxsim.VisualControlView {
        internalCreateSVG(): string {
            return `<svg viewBox="0 0 220 100" width="100%" height="100%">
                <g transform="translate(10, 10)">
                    <rect x="0" y="20" width="80" height="50" fill="#2c3e50" rx="4"/>
                    <circle cx="40" cy="45" r="8" fill="#7f8c8d"/>
                    <g id="unitbldc-wheel-0" style="transform-origin: 40px 45px;">
                        <circle cx="40" cy="45" r="20" fill="#e74c3c" opacity="0.8"/>
                        <line x1="20" y1="45" x2="60" y2="45" stroke="#fff" stroke-width="4"/>
                        <line x1="40" y1="25" x2="40" y2="65" stroke="#fff" stroke-width="4"/>
                    </g>
                    <text id="unitbldc-text-0" x="5" y="85" fill="#2ecc71" font-size="10" font-family="monospace">no motor yet</text>
                </g>
                <g transform="translate(120, 10)">
                    <rect x="0" y="20" width="80" height="50" fill="#2c3e50" rx="4"/>
                    <circle cx="40" cy="45" r="8" fill="#7f8c8d"/>
                    <g id="unitbldc-wheel-1" style="transform-origin: 40px 45px;">
                        <circle cx="40" cy="45" r="20" fill="#3498db" opacity="0.8"/>
                        <line x1="20" y1="45" x2="60" y2="45" stroke="#fff" stroke-width="4"/>
                        <line x1="40" y1="25" x2="40" y2="65" stroke="#fff" stroke-width="4"/>
                    </g>
                    <text id="unitbldc-text-1" x="5" y="85" fill="#2ecc71" font-size="10" font-family="monospace">no motor yet</text>
                </g>
            </svg>`
        }
    }
}
