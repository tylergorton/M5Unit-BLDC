/**
 * MakeCode blocks for the M5Stack Unit BLDC (brushless DC motor driver).
 *
 * Ported from M5UnitBLDC.cpp / M5UnitBLDC.h (Arduino library)
 * Original: SPDX-FileCopyrightText: 2024 M5Stack Technology CO LTD, SPDX-License-Identifier: MIT
 *
 * Communicates over I2C using the same register map as the original C++ driver.
 *
 * Each physical Unit BLDC is represented as a BldcMotor object, so multiple motors
 * (each with its own I2C address) can be controlled independently on the same bus.
 *
 * MOCK MODE: since there's no real motor to talk to in the browser simulator, each
 * BldcMotor checks once (on first use) whether it's actually getting an I2C ACK. If
 * not, it stops attempting real I2C transactions and instead keeps an in-memory
 * shadow of every setting, writing a line to the serial/Console view on each write
 * and returning the shadow value on every read - so block programs behave sensibly
 * (and visibly) when run in the simulator, with no separate simulator extension
 * required.
 */

//% color="#AA278D" icon="\uf085" block="Unit BLDC" weight=100
namespace unitBldc {

    const DEFAULT_ADDR = 0x65

    const REG_MODE = 0x00
    const REG_PWM = 0x10
    const REG_READBACK_RPM = 0x20
    const REG_READBACK_FREQ = 0x30
    const REG_SET_RPM = 0x40
    const REG_PID = 0x50
    const REG_DIR = 0x60
    const REG_MOTOR_CONFIG = 0x70
    const REG_MOTOR_STATUS = 0x80
    const REG_READBACK_RPM_STRING = 0xB0
    const REG_READBACK_FREQ_STRING = 0xC0
    const REG_SAVE_TO_FLASH = 0xF0
    const REG_JUMP_BOOTLOADER = 0xFD
    const REG_FIRMWARE_VERSION = 0xFE
    const REG_I2C_ADDRESS = 0xFF

    export enum BldcMode {
        //% block="open loop"
        OpenLoop = 0,
        //% block="closed loop"
        ClosedLoop = 1
    }

    export enum BldcDirection {
        //% block="forward"
        Forward = 0,
        //% block="backward"
        Backward = 1
    }

    export enum BldcMotorStatus {
        //% block="standby"
        Standby = 0,
        //% block="running"
        Running = 1,
        //% block="error"
        Error = 2
    }

    export enum BldcMotorModel {
        //% block="low speed"
        LowSpeed = 0,
        //% block="high speed"
        HighSpeed = 1
    }

    function clamp(lo: number, hi: number, v: number): number {
        if (v < lo) return lo
        if (v > hi) return hi
        return v
    }

    function modeLabel(mode: BldcMode): string {
        return mode == BldcMode.ClosedLoop ? "closed loop" : "open loop"
    }

    function directionLabel(dir: BldcDirection): string {
        return dir == BldcDirection.Backward ? "backward" : "forward"
    }

    function motorModelLabel(model: BldcMotorModel): string {
        return model == BldcMotorModel.HighSpeed ? "high speed" : "low speed"
    }

    /**
     * A single Unit BLDC motor, identified by its I2C address. Create one instance
     * per physical motor unit on the bus (see unitBldc.connect).
     */
    export class BldcMotor {
        private address: number

        // Cached result of the one-time "is real hardware actually there" probe.
        private hwChecked = false
        private hwPresent = false

        // Shadow state used only in mock mode (no hardware detected).
        private simMode: BldcMode = BldcMode.OpenLoop
        private simDirection: BldcDirection = BldcDirection.Forward
        private simPwm: number = 0
        private simRpm: number = 0
        private simPid: number[] = [0, 0, 0]
        private simMotorModel: BldcMotorModel = BldcMotorModel.LowSpeed
        private simPolePairs: number = 7

        constructor(addr: number) {
            this.address = addr
        }

        private writeBytes(reg: number, data: number[]): boolean {
            let out = pins.createBuffer(data.length + 1)
            out.setNumber(NumberFormat.UInt8LE, 0, reg)
            for (let i = 0; i < data.length; i++) {
                out.setNumber(NumberFormat.UInt8LE, i + 1, data[i])
            }
            return pins.i2cWriteBuffer(this.address, out, false) == 0
        }

        private writeFloat(reg: number, value: number): boolean {
            let out = pins.createBuffer(5)
            out.setNumber(NumberFormat.UInt8LE, 0, reg)
            out.setNumber(NumberFormat.Float32LE, 1, value)
            return pins.i2cWriteBuffer(this.address, out, false) == 0
        }

        private readBytes(reg: number, length: number): Buffer {
            pins.i2cWriteBuffer(this.address, pins.createBufferFromArray([reg]), true)
            return pins.i2cReadBuffer(this.address, length, false)
        }

        private readFloat(reg: number): number {
            let buf = this.readBytes(reg, 4)
            return buf.getNumber(NumberFormat.Float32LE, 0)
        }

        private bufferToString(buf: Buffer): string {
            let s = ""
            for (let i = 0; i < buf.length; i++) {
                let c = buf.getNumber(NumberFormat.UInt8LE, i)
                if (c == 0) break
                s += String.fromCharCode(c)
            }
            return s
        }

        private log(message: string): void {
            serial.writeLine("Motor " + this.address + ": " + message)
        }

        // Lazily probes the bus once, caches the result, and announces mock mode
        // the first time it's entered. Reset (see setI2CAddress) if the address changes.
        private hardwarePresent(): boolean {
            if (!this.hwChecked) {
                this.hwPresent = this.isConnected()
                this.hwChecked = true
                if (!this.hwPresent) {
                    this.log("no physical device detected, running in mock mode")
                }
            }
            return this.hwPresent
        }

        /**
         * Test whether this motor responds on the I2C bus at its current address.
         */
        //% blockId=unitbldc_is_connected
        //% block="%motor|is connected"
        //% weight=100
        //% group="Setup"
        isConnected(): boolean {
            return pins.i2cWriteBuffer(this.address, pins.createBuffer(0), false) == 0
        }

        /**
         * Set the control mode (open loop or closed loop).
         */
        //% blockId=unitbldc_set_mode
        //% block="%motor|set control mode to %mode"
        //% weight=95
        //% group="Motor Control"
        setMode(mode: BldcMode): void {
            this.simMode = mode
            if (this.hardwarePresent()) {
                this.writeBytes(REG_MODE, [mode])
            } else {
                this.log("control mode was set to " + modeLabel(mode))
            }
        }

        /**
         * Get the current control mode.
         */
        //% blockId=unitbldc_get_mode
        //% block="%motor|control mode"
        //% weight=94
        //% group="Motor Control"
        getMode(): BldcMode {
            if (this.hardwarePresent()) {
                let buf = this.readBytes(REG_MODE, 1)
                return buf.getNumber(NumberFormat.UInt8LE, 0) as BldcMode
            }
            return this.simMode
        }

        /**
         * Set the motor spin direction.
         */
        //% blockId=unitbldc_set_direction
        //% block="%motor|set direction to %dir"
        //% weight=93
        //% group="Motor Control"
        setDirection(dir: BldcDirection): void {
            this.simDirection = dir
            if (this.hardwarePresent()) {
                this.writeBytes(REG_DIR, [dir])
            } else {
                this.log("direction was set to " + directionLabel(dir))
            }
        }

        /**
         * Get the motor spin direction.
         */
        //% blockId=unitbldc_get_direction
        //% block="%motor|direction"
        //% weight=92
        //% group="Motor Control"
        getDirection(): BldcDirection {
            if (this.hardwarePresent()) {
                let buf = this.readBytes(REG_DIR, 1)
                return buf.getNumber(NumberFormat.UInt8LE, 0) as BldcDirection
            }
            return this.simDirection
        }

        /**
         * Set the PWM duty cycle directly (open loop mode).
         * @param duty PWM duty, eg: 1000
         */
        //% blockId=unitbldc_set_pwm
        //% block="%motor|set PWM duty %duty"
        //% duty.min=0 duty.max=2047 duty.defl=0
        //% weight=90
        //% group="Motor Control"
        setPWM(duty: number): void {
            duty = clamp(0, 2047, duty)
            this.simPwm = duty
            if (this.hardwarePresent()) {
                let out = pins.createBuffer(3)
                out.setNumber(NumberFormat.UInt8LE, 0, REG_PWM)
                out.setNumber(NumberFormat.UInt16LE, 1, duty)
                pins.i2cWriteBuffer(this.address, out, false)
            } else {
                this.log("PWM duty was set to " + duty)
            }
        }

        /**
         * Get the current PWM duty cycle (0-2047).
         */
        //% blockId=unitbldc_get_pwm
        //% block="%motor|PWM duty"
        //% weight=89
        //% group="Motor Control"
        getPWM(): number {
            if (this.hardwarePresent()) {
                let buf = this.readBytes(REG_PWM, 2)
                return buf.getNumber(NumberFormat.UInt16LE, 0)
            }
            return this.simPwm
        }

        /**
         * Set the target RPM (closed loop mode).
         * @param rpm target speed in RPM, eg: 1000
         */
        //% blockId=unitbldc_set_rpm
        //% block="%motor|set target RPM to %rpm"
        //% weight=88
        //% group="Motor Control"
        setRPM(rpm: number): void {
            this.simRpm = rpm
            if (this.hardwarePresent()) {
                this.writeFloat(REG_SET_RPM, rpm)
            } else {
                this.log("RPM was set to " + rpm)
            }
        }

        /**
         * Get the current target RPM setting.
         */
        //% blockId=unitbldc_get_rpm
        //% block="%motor|target RPM"
        //% weight=87
        //% group="Motor Control"
        getRPM(): number {
            if (this.hardwarePresent()) {
                return this.readFloat(REG_SET_RPM)
            }
            return this.simRpm
        }

        /**
         * Get the real time RPM readback from the motor. In mock mode this mirrors
         * the target RPM, since there's no physical motor to measure.
         */
        //% blockId=unitbldc_get_rpm_readback
        //% block="%motor|RPM readback"
        //% weight=86
        //% group="Readings"
        getRpmReadback(): number {
            if (this.hardwarePresent()) {
                return this.readFloat(REG_READBACK_RPM)
            }
            return this.simRpm
        }

        /**
         * Get the real time frequency readback from the motor (Hz). In mock mode
         * this is derived from the target RPM and pole pairs, using the same
         * relationship as the real device: RPM = frequency * 60 / pole pairs.
         */
        //% blockId=unitbldc_get_freq_readback
        //% block="%motor|frequency readback (Hz)"
        //% weight=85
        //% group="Readings"
        getFreqReadback(): number {
            if (this.hardwarePresent()) {
                return this.readFloat(REG_READBACK_FREQ)
            }
            return (this.simRpm * this.simPolePairs) / 60
        }

        /**
         * Get the real time RPM readback as text.
         */
        //% blockId=unitbldc_get_rpm_readback_string
        //% block="%motor|RPM readback text"
        //% weight=84
        //% group="Readings"
        getRpmReadbackString(): string {
            if (this.hardwarePresent()) {
                let buf = this.readBytes(REG_READBACK_RPM_STRING, 16)
                return this.bufferToString(buf)
            }
            return "" + this.simRpm
        }

        /**
         * Get the real time frequency readback as text.
         */
        //% blockId=unitbldc_get_freq_readback_string
        //% block="%motor|frequency readback text"
        //% weight=83
        //% group="Readings"
        getFreqReadbackString(): string {
            if (this.hardwarePresent()) {
                let buf = this.readBytes(REG_READBACK_FREQ_STRING, 16)
                return this.bufferToString(buf)
            }
            return "" + this.getFreqReadback()
        }

        /**
         * Set the PID parameters used in closed loop mode. Not persisted across a
         * power cycle by itself - call saveMotorDataToFlash() afterward if you
         * want these values to stick.
         */
        //% blockId=unitbldc_set_pid
        //% block="%motor|set PID Kp %p|Ki %i|Kd %d"
        //% weight=80
        //% group="PID Tuning"
        setPID(p: number, i: number, d: number): void {
            this.simPid = [p, i, d]
            if (this.hardwarePresent()) {
                let out = pins.createBuffer(13)
                out.setNumber(NumberFormat.UInt8LE, 0, REG_PID)
                out.setNumber(NumberFormat.Int32LE, 1, Math.round(p * 100))
                out.setNumber(NumberFormat.Int32LE, 5, Math.round(i * 100))
                out.setNumber(NumberFormat.Int32LE, 9, Math.round(d * 100))
                pins.i2cWriteBuffer(this.address, out, false)
            } else {
                this.log("PID was set to Kp=" + p + ", Ki=" + i + ", Kd=" + d)
            }
        }

        /**
         * Get the current PID parameters as an array: [Kp, Ki, Kd].
         */
        //% blockId=unitbldc_get_pid
        //% block="%motor|PID values"
        //% weight=79
        //% group="PID Tuning"
        getPID(): number[] {
            if (this.hardwarePresent()) {
                let buf = this.readBytes(REG_PID, 12)
                let p = buf.getNumber(NumberFormat.Int32LE, 0) / 100.0
                let i = buf.getNumber(NumberFormat.Int32LE, 4) / 100.0
                let d = buf.getNumber(NumberFormat.Int32LE, 8) / 100.0
                return [p, i, d]
            }
            return this.simPid
        }

        /**
         * Get the current Kp (proportional) PID term. For confirming a value you've
         * set; use "PID values" instead if you need all three terms at once.
         */
        //% blockId=unitbldc_get_kp
        //% block="%motor|PID Kp"
        //% weight=78
        //% group="PID Tuning"
        getKp(): number {
            return this.getPID()[0]
        }

        /**
         * Get the current Ki (integral) PID term. For confirming a value you've
         * set; use "PID values" instead if you need all three terms at once.
         */
        //% blockId=unitbldc_get_ki
        //% block="%motor|PID Ki"
        //% weight=77
        //% group="PID Tuning"
        getKi(): number {
            return this.getPID()[1]
        }

        /**
         * Get the current Kd (derivative) PID term. For confirming a value you've
         * set; use "PID values" instead if you need all three terms at once.
         */
        //% blockId=unitbldc_get_kd
        //% block="%motor|PID Kd"
        //% weight=76
        //% group="PID Tuning"
        getKd(): number {
            return this.getPID()[2]
        }

        /**
         * Get the current motor status. In mock mode this is derived from whether
         * a nonzero PWM duty or target RPM is currently set.
         */
        //% blockId=unitbldc_get_motor_status
        //% block="%motor|status"
        //% weight=75
        //% group="Readings"
        getMotorStatus(): BldcMotorStatus {
            if (this.hardwarePresent()) {
                let buf = this.readBytes(REG_MOTOR_STATUS, 1)
                return buf.getNumber(NumberFormat.UInt8LE, 0) as BldcMotorStatus
            }
            if (this.simPwm > 0 || this.simRpm != 0) {
                return BldcMotorStatus.Running
            }
            return BldcMotorStatus.Standby
        }

        /**
         * Set the motor model (low speed / high speed).
         */
        //% blockId=unitbldc_set_motor_model
        //% block="%motor|set motor model to %model"
        //% weight=70
        //% group="Configuration"
        setMotorModel(model: BldcMotorModel): void {
            this.simMotorModel = model
            if (this.hardwarePresent()) {
                this.writeBytes(REG_MOTOR_CONFIG, [model])
            } else {
                this.log("motor model was set to " + motorModelLabel(model))
            }
        }

        /**
         * Get the motor model.
         */
        //% blockId=unitbldc_get_motor_model
        //% block="%motor|motor model"
        //% weight=69
        //% group="Configuration"
        getMotorModel(): BldcMotorModel {
            if (this.hardwarePresent()) {
                let buf = this.readBytes(REG_MOTOR_CONFIG, 1)
                return buf.getNumber(NumberFormat.UInt8LE, 0) as BldcMotorModel
            }
            return this.simMotorModel
        }

        /**
         * Set the number of motor pole pairs.
         * @param pairs number of pole pairs, eg: 7
         */
        //% blockId=unitbldc_set_pole_pairs
        //% block="%motor|set motor pole pairs to %pairs"
        //% pairs.min=1 pairs.max=255 pairs.defl=7
        //% weight=68
        //% group="Configuration"
        setMotorPolePairs(pairs: number): void {
            this.simPolePairs = pairs
            if (this.hardwarePresent()) {
                this.writeBytes(REG_MOTOR_CONFIG + 1, [pairs])
            } else {
                this.log("pole pairs was set to " + pairs)
            }
        }

        /**
         * Get the number of motor pole pairs.
         */
        //% blockId=unitbldc_get_pole_pairs
        //% block="%motor|motor pole pairs"
        //% weight=67
        //% group="Configuration"
        getMotorPolePairs(): number {
            if (this.hardwarePresent()) {
                let buf = this.readBytes(REG_MOTOR_CONFIG + 1, 1)
                return buf.getNumber(NumberFormat.UInt8LE, 0)
            }
            return this.simPolePairs
        }

        /**
         * Save the motor model, pole pairs, PID values, and I2C address to onboard
         * flash. Has no persistent effect in mock mode.
         */
        //% blockId=unitbldc_save_flash
        //% block="%motor|save motor config to flash"
        //% weight=60
        //% group="Configuration"
        saveMotorDataToFlash(): void {
            if (this.hardwarePresent()) {
                this.writeBytes(REG_SAVE_TO_FLASH, [1])
            } else {
                this.log("config save to flash was requested (no effect in the simulator)")
            }
        }

        /**
         * Get the firmware version of this Unit BLDC.
         */
        //% blockId=unitbldc_get_firmware_version
        //% block="%motor|firmware version"
        //% weight=50
        //% group="Setup"
        getFirmwareVersion(): number {
            if (this.hardwarePresent()) {
                let buf = this.readBytes(REG_FIRMWARE_VERSION, 1)
                return buf.getNumber(NumberFormat.UInt8LE, 0)
            }
            return 0
        }

        /**
         * Change this motor's I2C address (valid range 1~127). Only wire up ONE
         * motor at a time on the bus when doing this - if two motors share an
         * address you can't tell them apart to address only one. Follow with
         * saveMotorDataToFlash() so the new address survives a power cycle.
         * @param addr the new I2C address, eg: 0x6A
         */
        //% blockId=unitbldc_set_i2c_address
        //% block="%motor|set I2C address to %addr"
        //% weight=40
        //% group="Setup"
        setI2CAddress(addr: number): boolean {
            let ok = true
            if (this.hardwarePresent()) {
                ok = this.writeBytes(REG_I2C_ADDRESS, [addr])
            } else {
                this.log("I2C address was set to " + addr)
            }
            if (ok) {
                this.address = addr
                // address changed - force a fresh hardware-presence check next time
                this.hwChecked = false
            }
            return ok
        }

        /**
         * Jump to bootloader mode (for firmware update). Not exposed as a block;
         * call via JavaScript if needed: motor.jumpBootloader()
         */
        jumpBootloader(): void {
            if (this.hardwarePresent()) {
                this.writeBytes(REG_JUMP_BOOTLOADER, [1])
            } else {
                this.log("bootloader jump was requested (no effect in the simulator)")
            }
        }
    }

    /**
     * Connect to a Unit BLDC over I2C. Create one of these per physical motor, each
     * with its own (unique) I2C address. If no physical device responds, the motor
     * automatically switches to mock mode (see the file header comment).
     * @param addr the I2C address of the device, eg: 0x65
     */
    //% blockId=unitbldc_create
    //% block="connect BLDC motor at address %addr"
    //% addr.defl=0x65
    //% weight=100
    //% blockSetVariable=motor
    export function connect(addr: number = DEFAULT_ADDR): BldcMotor {
        return new BldcMotor(addr)
    }
}
