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
    }

    let motors: { [address: number]: MotorState } = {}

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
                polePairs: 7
            }
            motors[address] = m
        }
        return m
    }

    // Writes to the same Console/data view that serial.writeLine() uses on a
    // real board - confirmed via pxt-microbit's own sim/state/serial.ts, where
    // pxsim.serial.writeString just calls board().writeSerial(s). Needs a
    // trailing newline, since writeSerial buffers until it sees one.
    function log(address: number, message: string): void {
        board().writeSerial("Motor " + address + ": " + message + "\n")
    }

    export function isConnected(address: number): boolean {
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
        state(address).pwm = duty
        log(address, "PWM duty was set to " + duty)
    }

    export function getPWM(address: number): number {
        return state(address).pwm
    }

    export function setRPM(address: number, rpm: number): void {
        state(address).rpm = rpm
        log(address, "RPM was set to " + rpm)
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
