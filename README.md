# Unit BLDC

MakeCode blocks for the [M5Stack Unit BLDC](https://docs.m5stack.com/en/unit/bldc) brushless DC motor
driver. Ported from the original `M5UnitBLDC.cpp` / `M5UnitBLDC.h` Arduino library, which is MIT
licensed by M5Stack Technology CO LTD. Communication uses the same I2C register map as the C++ driver.

## Usage

```blocks
unitBldc.connect(0x65)
unitBldc.setMode(unitBldc.BldcMode.ClosedLoop)
unitBldc.setDirection(unitBldc.BldcDirection.Forward)
unitBldc.setPID(2, 0.5, 0)
unitBldc.setRPM(1500)
basic.forever(function () {
    basic.showNumber(unitBldc.getRpmReadback())
    basic.pause(500)
})
```

Call `connect` once at the start of your program with the device's I2C address (default `0x65`).

## Blocks

- **connect** – open the I2C connection to the device
- **set control mode / control mode** – switch between open loop (direct PWM) and closed loop (RPM/PID) control
- **set direction / direction** – forward / backward
- **set PWM duty / PWM duty** – 0-2047, used in open loop mode
- **set target RPM / target RPM** – used in closed loop mode
- **RPM readback / frequency readback (Hz)** – live sensor readback as numbers
- **RPM readback text / frequency readback text** – live sensor readback as strings, straight from the device
- **set PID / PID values** – closed loop PID tuning; `PID values` returns an array `[Kp, Ki, Kd]`
- **PID Kp / PID Ki / PID Kd** – convenience blocks to read back a single term (each just indexes
  into `PID values`); handy since PID is normally set by the user and read back only to confirm
- **motor status** – standby / running / error
- **set motor model / motor model** – low speed / high speed
- **set motor pole pairs / motor pole pairs** – motor configuration
- **save motor config to flash** – persist motor model + pole pairs
- **firmware version** – read the device firmware version
- **set I2C address** – change the device's I2C address

`jumpBootloader()` is available in JavaScript (`unitBldc.jumpBootloader()`) but is not exposed as a
block, since it's a firmware-update-only operation not meant for normal block programs.

## Notes on the port

- The original C++ `begin(TwoWire*, addr, sda, scl, speed)` took an I2C bus and pin configuration; on
  micro:bit-family boards I2C pins are fixed, so `connect` only takes the device address.
- Floats are encoded/decoded with `Buffer.getNumber/setNumber(NumberFormat.Float32LE, ...)`, matching the
  `union { float; uint8_t[4]; }` trick used in the original `bytes_to_float`/`float_to_bytes`.
- `getPID(float*, float*, float*)` returned three values by pointer in C++. The block version returns a
  single `number[]` array `[Kp, Ki, Kd]`, which you can index in blocks (e.g. `array[0]` for Kp).

## License

MIT

## Supported targets

* for PXT/microbit
