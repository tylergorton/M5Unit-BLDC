/**
 * MakeCode blocks for the M5Stack Unit BLDC (brushless DC motor driver).
 *
 * Ported from M5UnitBLDC.cpp / M5UnitBLDC.h (Arduino library)
 * Original: SPDX-FileCopyrightText: 2024 M5Stack Technology CO LTD, SPDX-License-Identifier: MIT
 *
 * Communicates over I2C using the same register map as the original C++ driver.
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

    let address = DEFAULT_ADDR

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

    function writeBytes(reg: number, data: number[]): boolean {
        let out = pins.createBuffer(data.length + 1)
        out.setNumber(NumberFormat.UInt8LE, 0, reg)
        for (let i = 0; i < data.length; i++) {
            out.setNumber(NumberFormat.UInt8LE, i + 1, data[i])
        }
        return pins.i2cWriteBuffer(address, out, false) == 0
    }

    function writeFloat(reg: number, value: number): boolean {
        let out = pins.createBuffer(5)
        out.setNumber(NumberFormat.UInt8LE, 0, reg)
        out.setNumber(NumberFormat.Float32LE, 1, value)
        return pins.i2cWriteBuffer(address, out, false) == 0
    }

    function readBytes(reg: number, length: number): Buffer {
        pins.i2cWriteBuffer(address, pins.createBufferFromArray([reg]), true)
        return pins.i2cReadBuffer(address, length, false)
    }

    function readFloat(reg: number): number {
        let buf = readBytes(reg, 4)
        return buf.getNumber(NumberFormat.Float32LE, 0)
    }

    function bufferToString(buf: Buffer): string {
        let s = ""
        for (let i = 0; i < buf.length; i++) {
            let c = buf.getNumber(NumberFormat.UInt8LE, i)
            if (c == 0) break
            s += String.fromCharCode(c)
        }
        return s
    }

    /**
     * Connect to the Unit BLDC over I2C. Call this once at the start of your program.
     * @param addr the I2C address of the device, eg: 0x65
     */
    //% blockId=unitbldc_connect
    //% block="connect Unit BLDC at address %addr"
    //% addr.defl=0x65
    //% weight=100
    export function connect(addr: number = DEFAULT_ADDR): boolean {
        address = addr
        return pins.i2cWriteBuffer(address, pins.createBuffer(0), false) == 0
    }

    /**
     * Set the control mode (open loop or closed loop).
     */
    //% blockId=unitbldc_set_mode
    //% block="set control mode to %mode"
    //% weight=95
    export function setMode(mode: BldcMode): void {
        writeBytes(REG_MODE, [mode])
    }

    /**
     * Get the current control mode.
     */
    //% blockId=unitbldc_get_mode
    //% block="control mode"
    //% weight=94
    export function getMode(): BldcMode {
        let buf = readBytes(REG_MODE, 1)
        return buf.getNumber(NumberFormat.UInt8LE, 0) as BldcMode
    }

    /**
     * Set the motor spin direction.
     */
    //% blockId=unitbldc_set_direction
    //% block="set direction to %dir"
    //% weight=93
    export function setDirection(dir: BldcDirection): void {
        writeBytes(REG_DIR, [dir])
    }

    /**
     * Get the motor spin direction.
     */
    //% blockId=unitbldc_get_direction
    //% block="direction"
    //% weight=92
    export function getDirection(): BldcDirection {
        let buf = readBytes(REG_DIR, 1)
        return buf.getNumber(NumberFormat.UInt8LE, 0) as BldcDirection
    }

    /**
     * Set the PWM duty cycle directly (open loop mode).
     * @param duty PWM duty, eg: 1000
     */
    //% blockId=unitbldc_set_pwm
    //% block="set PWM duty %duty"
    //% duty.min=0 duty.max=2047 duty.defl=0
    //% weight=90
    export function setPWM(duty: number): void {
        duty = clamp(0, 2047, duty)
        let out = pins.createBuffer(3)
        out.setNumber(NumberFormat.UInt8LE, 0, REG_PWM)
        out.setNumber(NumberFormat.UInt16LE, 1, duty)
        pins.i2cWriteBuffer(address, out, false)
    }

    /**
     * Get the current PWM duty cycle (0-2047).
     */
    //% blockId=unitbldc_get_pwm
    //% block="PWM duty"
    //% weight=89
    export function getPWM(): number {
        let buf = readBytes(REG_PWM, 2)
        return buf.getNumber(NumberFormat.UInt16LE, 0)
    }

    /**
     * Set the target RPM (closed loop mode).
     * @param rpm target speed in RPM, eg: 1000
     */
    //% blockId=unitbldc_set_rpm
    //% block="set target RPM to %rpm"
    //% weight=88
    export function setRPM(rpm: number): void {
        writeFloat(REG_SET_RPM, rpm)
    }

    /**
     * Get the current target RPM setting.
     */
    //% blockId=unitbldc_get_rpm
    //% block="target RPM"
    //% weight=87
    export function getRPM(): number {
        return readFloat(REG_SET_RPM)
    }

    /**
     * Get the real time RPM readback from the motor.
     */
    //% blockId=unitbldc_get_rpm_readback
    //% block="RPM readback"
    //% weight=86
    export function getRpmReadback(): number {
        return readFloat(REG_READBACK_RPM)
    }

    /**
     * Get the real time frequency readback from the motor (Hz).
     */
    //% blockId=unitbldc_get_freq_readback
    //% block="frequency readback (Hz)"
    //% weight=85
    export function getFreqReadback(): number {
        return readFloat(REG_READBACK_FREQ)
    }

    /**
     * Get the real time RPM readback as text.
     */
    //% blockId=unitbldc_get_rpm_readback_string
    //% block="RPM readback text"
    //% weight=84
    export function getRpmReadbackString(): string {
        let buf = readBytes(REG_READBACK_RPM_STRING, 16)
        return bufferToString(buf)
    }

    /**
     * Get the real time frequency readback as text.
     */
    //% blockId=unitbldc_get_freq_readback_string
    //% block="frequency readback text"
    //% weight=83
    export function getFreqReadbackString(): string {
        let buf = readBytes(REG_READBACK_FREQ_STRING, 16)
        return bufferToString(buf)
    }

    /**
     * Set the PID parameters used in closed loop mode.
     */
    //% blockId=unitbldc_set_pid
    //% block="set PID Kp %p|Ki %i|Kd %d"
    //% weight=80
    export function setPID(p: number, i: number, d: number): void {
        let out = pins.createBuffer(13)
        out.setNumber(NumberFormat.UInt8LE, 0, REG_PID)
        out.setNumber(NumberFormat.Int32LE, 1, Math.round(p * 100))
        out.setNumber(NumberFormat.Int32LE, 5, Math.round(i * 100))
        out.setNumber(NumberFormat.Int32LE, 9, Math.round(d * 100))
        pins.i2cWriteBuffer(address, out, false)
    }

    /**
     * Get the current PID parameters as an array: [Kp, Ki, Kd].
     */
    //% blockId=unitbldc_get_pid
    //% block="PID values"
    //% weight=79
    export function getPID(): number[] {
        let buf = readBytes(REG_PID, 12)
        let p = buf.getNumber(NumberFormat.Int32LE, 0) / 100.0
        let i = buf.getNumber(NumberFormat.Int32LE, 4) / 100.0
        let d = buf.getNumber(NumberFormat.Int32LE, 8) / 100.0
        return [p, i, d]
    }

    /**
     * Get the current Kp (proportional) PID term. For confirming a value you've set;
     * use "PID values" instead if you need all three terms at once.
     */
    //% blockId=unitbldc_get_kp
    //% block="PID Kp"
    //% weight=78
    export function getKp(): number {
        return getPID()[0]
    }

    /**
     * Get the current Ki (integral) PID term. For confirming a value you've set;
     * use "PID values" instead if you need all three terms at once.
     */
    //% blockId=unitbldc_get_ki
    //% block="PID Ki"
    //% weight=77
    export function getKi(): number {
        return getPID()[1]
    }

    /**
     * Get the current Kd (derivative) PID term. For confirming a value you've set;
     * use "PID values" instead if you need all three terms at once.
     */
    //% blockId=unitbldc_get_kd
    //% block="PID Kd"
    //% weight=76
    export function getKd(): number {
        return getPID()[2]
    }

    /**
     * Get the current motor status.
     */
    //% blockId=unitbldc_get_motor_status
    //% block="motor status"
    //% weight=75
    export function getMotorStatus(): BldcMotorStatus {
        let buf = readBytes(REG_MOTOR_STATUS, 1)
        return buf.getNumber(NumberFormat.UInt8LE, 0) as BldcMotorStatus
    }

    /**
     * Set the motor model (low speed / high speed).
     */
    //% blockId=unitbldc_set_motor_model
    //% block="set motor model to %model"
    //% weight=70
    export function setMotorModel(model: BldcMotorModel): void {
        writeBytes(REG_MOTOR_CONFIG, [model])
    }

    /**
     * Get the motor model.
     */
    //% blockId=unitbldc_get_motor_model
    //% block="motor model"
    //% weight=69
    export function getMotorModel(): BldcMotorModel {
        let buf = readBytes(REG_MOTOR_CONFIG, 1)
        return buf.getNumber(NumberFormat.UInt8LE, 0) as BldcMotorModel
    }

    /**
     * Set the number of motor pole pairs.
     * @param pairs number of pole pairs, eg: 7
     */
    //% blockId=unitbldc_set_pole_pairs
    //% block="set motor pole pairs to %pairs"
    //% pairs.min=1 pairs.max=255 pairs.defl=7
    //% weight=68
    export function setMotorPolePairs(pairs: number): void {
        writeBytes(REG_MOTOR_CONFIG + 1, [pairs])
    }

    /**
     * Get the number of motor pole pairs.
     */
    //% blockId=unitbldc_get_pole_pairs
    //% block="motor pole pairs"
    //% weight=67
    export function getMotorPolePairs(): number {
        let buf = readBytes(REG_MOTOR_CONFIG + 1, 1)
        return buf.getNumber(NumberFormat.UInt8LE, 0)
    }

    /**
     * Save the motor model and pole pairs configuration to onboard flash.
     */
    //% blockId=unitbldc_save_flash
    //% block="save motor config to flash"
    //% weight=60
    export function saveMotorDataToFlash(): void {
        writeBytes(REG_SAVE_TO_FLASH, [1])
    }

    /**
     * Get the firmware version of the Unit BLDC.
     */
    //% blockId=unitbldc_get_firmware_version
    //% block="firmware version"
    //% weight=50
    export function getFirmwareVersion(): number {
        let buf = readBytes(REG_FIRMWARE_VERSION, 1)
        return buf.getNumber(NumberFormat.UInt8LE, 0)
    }

    /**
     * Change the I2C address of the Unit BLDC.
     * @param addr the new I2C address, eg: 0x65
     */
    //% blockId=unitbldc_set_i2c_address
    //% block="set I2C address to %addr"
    //% weight=40
    export function setI2CAddress(addr: number): boolean {
        if (writeBytes(REG_I2C_ADDRESS, [addr])) {
            address = addr
            return true
        }
        return false
    }

    /**
     * Jump to bootloader mode (for firmware update). Not exposed as a block;
     * call via JavaScript if needed: unitBldc.jumpBootloader()
     */
    export function jumpBootloader(): void {
        writeBytes(REG_JUMP_BOOTLOADER, [1])
    }
}
