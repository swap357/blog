+++
author = "Swapnil Patel"
title = "understanding/ cpu-states"
description = ""
tags = [
"cpu",
"bare-metal",
"acpi",
"power",
"frequency"
]

comments = true
index = 6
+++

CPUs in datacenters use P states and C states to manage performance and power use.

ACPI defines these states. Most CPUs and OSes support it.

### P States

P states control CPU speed and power:
- Lower P number = faster CPU, more power used
- Changes clock speed and voltage

### C States 

C states save power when CPU is idle:
- Deeper C state = more power saved, longer wakeup time
- Can turn off CPU parts to save more power

just ways to balance speed and power use.

### Checking Current CPU Settings

#### Available Scaling Governors

To see which scaling governors are available on your system:

```bash
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_available_governors
performance powersave
```

In this case, two governors are available: `performance` and `powersave`.

#### Current Governor and C State

Check the current scaling governor:
```
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor 
performance
```

Check the current C state:
```
cat /sys/devices/system/cpu/cpu0/cpuidle/state0/name 
POLL
```

The name "POLL" represents a polling or busy-waiting state. In this state, the CPU is not actively trying to save power by entering into deeper sleep modes. Instead, it remains in a state where it is continuously checking for tasks or events to process. This state is more power-hungry than deeper idle states but allows the CPU to respond quickly when there is work to be done.

### Updating CPU Settings

#### Changing the Governor

To switch between `powersave` and `performance` governors:

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
#### Adjusting C State

To set a deeper C state (e.g., C4) for greater power savings:

```
echo 4 > /sys/devices/system/cpu/cpu0/cpuidle/current_driver
```

To set a shallower C state (e.g., C0) for better performance:
```
echo 0 > /sys/devices/system/cpu/cpu0/cpuidle/current_driver
```

Understanding and managing CPU states allows for better optimization of performance and power usage in modern datacenter environments. Make informed choices to balance efficiency and performance based on your specific requirements.

## Toolbox

Here are some handy commands to keep in your back pocket:

```bash
# Check CPU frequency
cat /proc/cpuinfo | grep MHz

# Monitor CPU frequency in real-time
watch -n1 "cat /proc/cpuinfo | grep MHz"

# Check available frequencies
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_available_frequencies

# Monitor temperature (if you have lm-sensors installed)
sensors

# Check current P-state
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq
```

## Why Should You Care?

- **Performance Tuning**: Optimize your code's execution environment.
- **Thermal Management**: Keep those racks cool in the data center.
- **Cost Savings**: Lower power consumption = lower bills.
## Tips

- **Profile Before Optimizing**: Use tools like `perf` to understand your workload before tweaking CPU states.
- **Test Thoroughly**: CPU state changes can have unexpected effects on application performance.
- **Consider Automation**: Look into tools like `cpupower` for dynamic CPU management.
- **Mind the Context**: What's good for a server might not be ideal for a desktop or mobile device.

