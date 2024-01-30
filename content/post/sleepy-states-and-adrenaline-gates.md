+++
author = "Swapnil Patel"
title = "sleepy states and adrenaline gates"
date = "2023-05-10"
description = ""
tags = [
"cpu",
"bare-metal",
"acpi",
"power",
"frequency"
]

comments = true
+++

Modern datacenter CPUs implement variations of something called- P states and C states, with the basic idea of adjusting CPU performance and power consumption based on demand.

These concepts are part of the Advanced Configuration and Power Interface (ACPI) standard, which is supported by most modern processors and operating systems.

P states, or performance states, control the actual speed of the CPU.
- The lower the P state number, the higher the performance and power usage. It's a trade-off: higher speed for more power consumption.
- P states does so by controlling the CPU's operating frequency (clock speed) and voltage.

Then there are C states, or idle states. 
- When your CPU isn't busy, it can go into these states to save power. 
- The deeper the C state, the less power the CPU uses, but it takes longer to wake up and get back to work. 
- Deeper C states involve more aggressive power-saving measures, such as turning off parts of the CPU.

Let's check:

List all available scaling governors-
```
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_available_governors
performance powersave
```

Seems like we have 2 available governors we can use - 
performance or powersave

#### Check Current Settings

Let's check what scaling_governor our system is using-
```
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor 
performance
```

Check C-state
```
cat /sys/devices/system/cpu/cpu0/cpuidle/state0/name 
POLL
```

The name "POLL" represents a polling or busy-waiting state. In this state, the CPU is not actively trying to save power by entering into deeper sleep modes. Instead, it remains in a state where it is continuously checking for tasks or events to process. This state is more power-hungry than deeper idle states but allows the CPU to respond quickly when there is work to be done.

#### Updating Settings

To change governor between - powersave, performance
```
echo <desired_governor> | sudo tee /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor
```

Switching between "powersave" and "performance" governors using the provided command affects your system as follows:

##### Performance Governor (performance):
- CPU runs at max speed for high performance.
- Increases power usage and heat generation.
- Suitable for demanding tasks like gaming and simulations.

##### Powersave Governor (powersave):
- CPU conserves power by lowering clock speed.
- Reduces power consumption and heat.
- Suitable for power-efficient operation, ideal for laptops and servers when performance isn't a priority.

To change C State:

To adjust the C state to a higher value (e.g., C4) for power savings, use the command:
```
echo 4 > /sys/devices/system/cpu/cpu0/cpuidle/current_driver
```

To set the C state to a lower value (e.g., C0) for better performance, use the command:
```
echo 0 > /sys/devices/system/cpu/cpu0/cpuidle/current_driver
```

> 
> _"With great power comes great responsibility"_
> 

Choose wisely!
