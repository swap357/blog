+++
author = "Swapnil Patel"
title = "understanding: rented (linux) VMs"
date = "2023-05-06"
description = ""
tags = [
"cpu",
"cloud",
"linux",
"unix",
"vm"
]

comments = true
+++

Recently, I've been trying to understand how VMs on public cloud are prepared for customers. As a frugal user who's squeezed the most out of free cloud tiers, moving to a paid model is a big leap. I'd like to know what exactly I'm paying for.

When an VM (ec2 instance) is launched, it's a slice of one giant physical system (AKA bare-metal), just - "neatly" separated from others. 
You get an apartment but with neighbors, and a lot of them. Some quiet, most noisy, you just hope the walls aren't thin.

Why would one choose such chaos ? because we're too lazy to do it all, and it's a full-time job for someone else-
- keep a system up and running 24*7 * 365 days. (CSP SLA: 99.9% avalaiblity)
- Keep up hardware needs- cpu, memory, storage for users at scale.
- have an internet network to the system that has a dedicated IP (Costs twice as the internet plan) 
- manual maintainence and updates
- Firewall, Anti-malware for protection
- electricity costs

Now, speaking of neatly separated, it's mostly KVM with hardware-assisted virtualization. KVM turns the Linux kernel into a hypervisor, enabling you to run multiple, isolated virtual machines (VMs) on a single physical server.

To make the most of a VM, you need to understand its allocated resources—CPU, memory, storage, and virtualization technology. A good starting point is to check the basic system information right after provisioning.

#### Key Command: `lscpu`

Run `lscpu` to get a detailed overview of the CPU and virtualization features:

```bash
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
...some more
``` 

#### Observations:

- **Virtualization Technology:** The line `Virtualization: VT-x` indicates the CPU supports Intel VT-x, a hardware feature that enhances virtualization performance.
- **Hypervisor:** `Hypervisor vendor: KVM` confirms that KVM (Kernel-based Virtual Machine) is the underlying hypervisor, managing multiple VMs on a single physical server.
- **NUMA Configuration:** The presence of NUMA (Non-Uniform Memory Access) nodes suggests optimized memory allocation based on proximity to CPU cores, improving performance for memory-intensive tasks.

First, update package lists and install `hwloc`:
```bash
apt update
apt install hwloc
```

Then, generate a visual representation of system's topology:
```bash
lstopo --of png system_topology.png
```
   This command creates a visual layout showing the arrangement of CPUs, caches, and memory.

![systemTopology](https://autoscaler.sh/images/system_topology.jpg)

#### Observations:

Package L#0 and Package L#1, contains a single core (Core L#0 and Core L#1) with one processing unit (PU) each, implying this is a system with two physical CPU cores in total. This aligns with the common configuration of lightweight virtualized environments or entry-level servers, where resources are often minimized to fit specific use cases or workloads that do not require high parallel processing capabilities.

The presence of NUMA (Non-Uniform Memory Access) nodes indicates that the system can optimize memory access patterns based on the proximity of memory to the cores, reducing latency and increasing performance for memory-intensive tasks. The NUMA node L#0 P#0 is associated with a block of memory, likely representing the total accessible RAM for that node.

#### Conclusion
But why should we care about all of this? Well, understanding our VM's environment helps us know what we paid for. No more blindly assigning tasks or resources. We see what's available, plan accordingly, and execute efficiently, optimize for what we have.

---

### Cheat Sheet

some essential commands to help get to know your system better:

**System Information:**
- `lscpu` - CPU details
- `lsblk` - Block devices
- `lshw` - Hardware configuration
- `free -h` - Memory usage
- `dmidecode` - DMI table contents
- `numactl --hardware` - NUMA topology

**Storage:**
- `df -h` - Disk space usage
- `du -sh /path/to/directory` - Directory size
- `fdisk -l` - Disk partitions
- `mount | column -t` - Mounted filesystems

**Network:**
- `ip a` - Network interfaces
- `ip route` - Routing table
- `ss -tuln` - Listening ports
- `ping <hostname>` - Connectivity test
- `traceroute <hostname>` - Path trace
- `netstat -s` - Network stats
- `ethtool <interface>` - Ethernet settings

**Performance:**
- `top` / `htop` - Process monitoring
- `iostat -xz 1` - I/O stats
- `vmstat 1` - Virtual memory stats
- `free -m` - Memory usage in MB
- `sar -u 1 3` - System activity
- `nmon` - Performance monitoring

**Security:**
- `uname -a` - System info
- `ps aux --sort=-%mem` - Processes sorted by memory usage
- `dmesg | tail` - Kernel messages
- `journalctl -xe` - System logs
- `chkconfig --list` - Service run-level info
- `ufw status` - Firewall status