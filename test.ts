unitBldc.connect(0x65)
unitBldc.setMode(unitBldc.BldcMode.ClosedLoop)
unitBldc.setDirection(unitBldc.BldcDirection.Forward)
unitBldc.setPID(2, 0.5, 0)
unitBldc.setRPM(1500)

let pid = unitBldc.getPID()
basic.showString("Kp=" + pid[0] + " Ki=" + pid[1] + " Kd=" + pid[2])

// or read a single term when you just want to confirm one value
basic.showNumber(unitBldc.getKp())

basic.forever(function () {
    basic.showNumber(unitBldc.getRpmReadback())
    basic.pause(500)
})
