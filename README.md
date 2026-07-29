# Unit BLDC

MakeCode blocks for the [M5Stack Unit BLDC](https://docs.m5stack.com/en/unit/bldc) brushless DC motor
driver. Ported from the original `M5UnitBLDC.cpp` / `M5UnitBLDC.h` Arduino library, which is MIT
licensed by M5Stack Technology CO LTD. Communication uses the same I2C register map as the C++ driver.

Each physical motor unit is represented as a `BldcMotor` object, so you can control any number of
motors independently, as long as each has a unique I2C address.

## Assigning addresses (do this first if using more than one motor)

Every Unit BLDC ships from the factory at the same default address, `0x65`. Two devices can't share an
address on the same bus and be addressed individually, so before wiring multiple motors together you
need to give each one a unique address, **one motor at a time**:

1. Wire up **only one** motor to your micro:bit.
2. Flash a small one-time setup program:
   ```typescript
   let setup = unitBldc.connect(0x65)
   setup.setI2CAddress(0x6A)
   setup.saveMotorDataToFlash()
   ```
3. Power cycle the motor unit, then confirm the new address stuck, e.g. by changing the setup
   program to `unitBldc.connect(0x6A)` and checking `setup.isConnected()`.
4. Repeat for any additional motors, giving each a different address (or leave one motor at the
   default `0x65` and only reassign the others).
5. Once every motor has a unique address, wire them all together on the bus and flash your real
   program using those addresses.

> **Flash persistence (confirmed from M5Stack's official I2C protocol doc):** writing `1` to the
> flash-writeback register (triggered by `saveMotorDataToFlash()`) persists three things across a power
> cycle: the **I2C address**, the **PID values**, and the **motor model / pole pairs**. So both
> `setI2CAddress()` and `setPID()` need a follow-up call to `saveMotorDataToFlash()` if you want those
> settings to survive a reboot - everything else (mode, direction, PWM, target RPM) is not persisted and
> needs to be re-set each time your program starts.

## Simulator support

There's no real motor to talk to in the browser simulator. Every hardware-facing operation in `main.ts`
is a small module-level function tagged `//% shim=unitBldcSim::xxx` - on a real board that's just an
annotation with no effect, and the plain TypeScript body underneath (an ordinary I2C read/write) is what
actually runs. In the simulator, MakeCode instead uses the alternate implementation registered in
`simulator.ts`, which is only ever compiled into the simulator bundle (see `simFiles` in `pxt.json`,
never shipped to the real board).

`simulator.ts` keeps a shadow of every motor's settings (keyed by I2C address) and writes a line to the
Console/data view for each change, using the same `board().writeSerial(...)` call that `serial.writeLine`
itself uses on a real board - so no separate viewer is needed, just click **Show console device** (or
**Show data**) below the simulator panel. Reading a setting back (`target RPM`, `PID values`, `motor
model`, etc.) returns whatever was last set, so you can confirm your program's logic before ever touching
real hardware. Sensor-style readbacks that aren't user-set (`RPM readback`, `frequency readback`,
`status`) are approximated from the current setpoint rather than fabricated - `frequency readback` in
particular uses the same relationship as the real device (`RPM = frequency * 60 / pole pairs`), just
solved the other way around.

This is plain TypeScript - no native C++ anywhere. The `shim`/`simFiles` mechanism only requires C++ when
the hardware side itself needs a *different* implementation than what's written in `main.ts` (e.g. a
sensor needing low-level native access); since our hardware implementation is the same ordinary TypeScript
either way, the plain body serves as the real hardware code, and `simFiles` only supplies an alternate
implementation for the browser.

## Usage

```blocks
let leftMotor = unitBldc.connect(0x65)
let rightMotor = unitBldc.connect(0x6A)

leftMotor.setMode(unitBldc.BldcMode.ClosedLoop)
rightMotor.setMode(unitBldc.BldcMode.ClosedLoop)

leftMotor.setDirection(unitBldc.BldcDirection.Forward)
rightMotor.setDirection(unitBldc.BldcDirection.Backward)

leftMotor.setRPM(1000)
rightMotor.setRPM(1000)
```

## Blocks

`unitBldc.connect(address)` creates a motor object (`BldcMotor`) for a given I2C address. All other
blocks are called on that object, e.g. `leftMotor.setRPM(1000)`.

- **is connected** – test whether this motor responds on the bus
- **set control mode / control mode** – switch between open loop (direct PWM) and closed loop (RPM/PID) control
- **set direction / direction** – forward / backward
- **set PWM duty / PWM duty** – 0-2047, used in open loop mode
- **set target RPM / target RPM** – used in closed loop mode
- **RPM readback / frequency readback (Hz)** – live sensor readback as numbers
- **RPM readback text / frequency readback text** – live sensor readback as strings, straight from the device
- **set PID / PID values** – closed loop PID tuning; `PID values` returns an array `[Kp, Ki, Kd]`.
  Call `save motor config to flash` afterward if you want these values to survive a power cycle.
- **PID Kp / PID Ki / PID Kd** – convenience blocks to read back a single term (each just indexes
  into `PID values`); handy since PID is normally set by the user and read back only to confirm
- **status** – standby / running / error
- **set motor model / motor model** – low speed / high speed
- **set motor pole pairs / motor pole pairs** – motor configuration
- **save motor config to flash** – persist I2C address, PID values, and motor model/pole pairs (see
  flash persistence note above)
- **firmware version** – read the device firmware version
- **set I2C address** – change this motor's I2C address (see "Assigning addresses" above)

`motor.jumpBootloader()` is available in JavaScript but is not exposed as a block, since it's a
firmware-update-only operation not meant for normal block programs.

## Notes on the port

- The original C++ `begin(TwoWire*, addr, sda, scl, speed)` took an I2C bus and pin configuration; on
  micro:bit-family boards I2C pins are fixed, so `connect` only takes the device address.
- The original library used one global device handle. This port instead uses a `BldcMotor` class, one
  instance per physical motor, so multiple motors can be controlled independently on the same bus.
- Floats are encoded/decoded with `Buffer.getNumber/setNumber(NumberFormat.Float32LE, ...)`, matching the
  `union { float; uint8_t[4]; }` trick used in the original `bytes_to_float`/`float_to_bytes`.
- `getPID(float*, float*, float*)` returned three values by pointer in C++. The block version returns a
  `number[]` array `[Kp, Ki, Kd]`, plus three small convenience blocks (`PID Kp`/`Ki`/`Kd`) for reading
  back a single term.
- Mock mode (see above) is new behavior not present in the original driver, added so the extension is
  usable in the browser simulator without real hardware attached.

## License

MIT

## Supported targets

* for PXT/microbit
