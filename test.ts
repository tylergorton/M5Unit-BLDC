// One-time setup sketch: run this with ONLY ONE motor wired up to change its
// address away from the factory default before wiring both motors together.
// See README.md "Assigning addresses" section.
//
// let setup = unitBldc.connect(0x65)
// setup.setI2CAddress(0x6A)
// setup.saveMotorDataToFlash()


// Main program, run once both motors are wired up with unique addresses.
// If run in the simulator (no real hardware), each motor automatically falls
// back to mock mode and writes its settings to the Console view instead
// (click "Show console device" below the simulator to see them).
let leftMotor = unitBldc.connect(0x65)
let rightMotor = unitBldc.connect(0x6A)

leftMotor.setMode(unitBldc.BldcMode.ClosedLoop)
rightMotor.setMode(unitBldc.BldcMode.ClosedLoop)

leftMotor.setDirection(unitBldc.BldcDirection.Forward)
rightMotor.setDirection(unitBldc.BldcDirection.Backward)

leftMotor.setRPM(1000)
rightMotor.setRPM(1000)

basic.forever(function () {
    basic.showNumber(leftMotor.getRpmReadback())
    basic.pause(300)
    basic.showNumber(rightMotor.getRpmReadback())
    basic.pause(300)
})
