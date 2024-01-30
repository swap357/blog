+++
author = "Swapnil Patel"
title = "understand your real-estate"
date = "2023-05-06"
description = ""
tags = [
"cpu",
"cloud",
"vm"
]
categories = [
"cloud",
"learnings"
]
comments = true
+++

Recently, I've been trying to understand how VMs on public cloud are prepared for customers. As a frugal user who's squeezed the most out of free cloud tiers, moving to a paid model is a big leap. I'd like to know what exactly I'm paying for.

With a VM instance, you get an apartment but with neighbors, and a lot of them. Some quiet, most noisy, you just hope the walls aren't thin.

Imagine sharing an hourly rental desktop with 100 others and all 100 of them working on it at the same time - it's kind of the same thing. When an VM (ec2 instance) is launched, it's a slice of one giant physical system (AKA bare-metal), just - neatly separated from others. 

Why would one choose such chaos ? because we're too lazy to do it all, and it's a full-time job for someone else-
- keep a system up and running 24*7 * 365 days. (CSP SLA: 99.9% avalaiblity)
- Keep up hardware needs- cpu, memory, storage for users at scale.
- have an internet network to the system that has a dedicated IP (Costs twice as the internet plan) 
- manual maintainence and updates
- Firewall, Anti-malware for protection
- electricity costs

Now, speaking of neatly separated, it's mostly KVM with hardware-assisted virtualization. KVM turns the Linux kernel into a hypervisor, enabling you to run multiple, isolated virtual machines (VMs) on a single physical server.

This might be the first command i run every time i log onto a new system -

```
ubuntu@b2-7-us-west-or-1:~$ lscpu
Architecture:            x86_64
  CPU op-mode(s):        32-bit, 64-bit
  Address sizes:         40 bits physical, 48 bits virtual
  Byte Order:            Little Endian
CPU(s):                  2
  On-line CPU(s) list:   0,1
Vendor ID:               GenuineIntel
  Model name:            Intel Core Processor (Haswell, no TSX)
    CPU family:          6
    Model:               60
    Thread(s) per core:  1
    Core(s) per socket:  1
    Socket(s):           2
    Stepping:            1
    BogoMIPS:            4788.90
Virtualization features: 
  Virtualization:        VT-x
  Hypervisor vendor:     KVM
  Virtualization type:   full
Caches (sum of all):     
  L1d:                   64 KiB (2 instances)
  L1i:                   64 KiB (2 instances)
  L2:                    8 MiB (2 instances)
  L3:                    32 MiB (2 instances)
NUMA:                    
  NUMA node(s):          1
  NUMA node0 CPU(s):     0,1
<redacted>
``` 

#### Observation:

The Virtualization: VT-x line indicates that your CPU supports Intel VT-x, a hardware feature that enhances performance and security of the virtual machines.

Hypervisor vendor: KVM confirms that KVM is the hypervisor being used, providing the layer that allows multiple operating systems to share a single hardware host.

Okay, let's get practical. We need something more - need to understand how of all this is connected - a blueprint of the building- system's topology.

First, update package lists and install `hwloc`:
```
apt update
apt install hwloc
```

Then, generate a visual representation of system's topology:
```
lstopo --of png system_topology.png
```
This command generates a PNG image, giving a visual layout of our system's architecture, including CPUs, memory, caches, and their interconnections.

![systemTopology](https://autoscaler.sh/images/system_topology.jpg)

#### Observation:
Package L#0 and Package L#1, contains a single core (Core L#0 and Core L#1) with one processing unit (PU) each, implying this is a system with two physical CPU cores in total. This aligns with the common configuration of lightweight virtualized environments or entry-level servers, where resources are often minimized to fit specific use cases or workloads that do not require high parallel processing capabilities.

The presence of NUMA (Non-Uniform Memory Access) nodes indicates that the system can optimize memory access patterns based on the proximity of memory to the cores, reducing latency and increasing performance for memory-intensive tasks. The NUMA node L#0 P#0 is associated with a block of memory, likely representing the total accessible RAM for that node.

#### Conclusion
But why should we care about all of this? Well, understanding our VM's environment helps us know what we paid for. No more blindly assigning tasks or resources. We see what's available, plan accordingly, and execute efficiently, optimize for what we have. that simple.