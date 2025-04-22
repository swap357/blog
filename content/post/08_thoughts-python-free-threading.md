+++
author = "Swapnil Patel"
title = "thoughts: python3.13t- gil situation"
description = ""
tags = [
"python",
"free-threading",
"perf",
"linux",
]
comments = true
index = 8
+++

## tl;dr
all new python 3.13t release finally drops the GIL.
adds ~40% overhead to single-threaded code.
on the bright side, multithreading is now truly parallel. adds its own thread-safety, mgmt overhead.

## backstory
python have had GIL(Global Interpreter Lock) since '94.

```ascii
Python Threading Evolution:
[1991]────[1994]────────[2024]────>
  │         │             │
Python    GIL          py3.13t
Created   Added
```

GIL makes life a little easier for python language devs, helps single-threaded code run faster, makes memory management easier, but prevents true parallelism.
this is what happens when you try running multiple threads using python:

```ascii
┌─ Python Process (PID:1234) ──────────┐
│ gil_locked=1  owner=0x7fff1234       │
│ T1[0x7fff1234] → RUNNING  [eval]     │
│ T2[0x7fff5678] → WAITING  [gil_held] │
│ T3[0x7fff9012] → WAITING  [gil_held] │
└─────────────────────────────────────-┘
```
only one thread can run at a time.

and for this very reason, Oct 2024 marks a major event in python history when 3.13 was released.
it was accompanied by a new experimental version, 3.13t, which finally drops the GIL.


### The promise of free-threading
as a workaround to the GIL, python devs have been using multiprocessing. however, this comes with its own overheads. and finally 3.13t aims to change that.

```ascii
┌─ Threading:             ┌─ True Parallelism(3.13t):
|                         | [Proc1]
│ [GIL]                   │ [Thread1][Thread2][Thread3]
│   ↓                     │    ↓        ↓        ↓
│ One thread at a time    │ Direct CPU core access
│                         │
└─ Multiprocessing:       └─
  [Proc1]   [Proc2]   [Proc3]
     ↓        ↓        ↓
   CPU cores
```

| Multiprocessing | True Parallelism |
|----------------|------------------|
| High process start costs | No process overhead |
| High memory overhead | Shared memory |
| IPC overhead | Lower latency |
|  | Efficient scaling |

- [PEP](https://peps.python.org/pep-0703/)
- [how-to](https://docs.python.org/3/howto/free-threading-python.html)

multi-core processors happened and parallel workloads became a thing, more modern languages challenged python's approach. workarounds were no longer good enough.

### 1. multiprocessing

```python
import multiprocessing

def worker(num):
    return num * num  # cpu stuff here

if __name__ == "__main__":
    with multiprocessing.Pool(processes=4) as pool:
        results = pool.map(worker, range(10))
        print(results)
```

### 2. asyncio
for io-bound tasks:

```python
import asyncio

async def worker(num):
    return num * num  # io stuff here
```

### 3. c extensions
c extensions can release the GIL by explicitly releasing it during computation:
```python
Py_BEGIN_ALLOW_THREADS
/* Compute-intensive C code here */
Py_END_ALLOW_THREADS
```

### how it works now with 3.13t
actual parallel execution:

```python
import threading
import time

def cpu_intensive():
    # properly parallel now
    result = 0
    for i in range(10**7):
        result += i
    return result

threads = [
    threading.Thread(target=cpu_intensive)
    for _ in range(4)
]

for t in threads:
    t.start()
```

## performance
cpu-bound code can actually use all cores now.

thread scaling tests:
![output_23_0.png](/images/output_23_0.png)

clearly, single-threaded code is going to be slower. speedups are more pronounced in cpu-bound workloads as we scale the number of threads. using thread local variables show great speedup, with no synchronization overhead.

thread-spawn overhead here(take numbers with a grain of salt, good enough for relative comparison):

Python 3.13 (with GIL):

| Operation       | Percentage | Time (µs) |
|----------------|------------|-----------|
| TLS Setup      | 73.9%      | 249.96    |
| Memory Barriers| 14.1%      | 47.69     |
| RefCount Setup | 12.0%      | 40.11     |

Total per thread: 337.76 µs

Python 3.13t (no-GIL):

| Operation       | Percentage | Time (µs) |
|----------------|------------|-----------|
| TLS Setup      | 70.5%      | 242.25    |
| Memory Barriers| 17.7%      | 60.98     |
| RefCount Setup | 11.8%      | 40.45     |

Total per thread: 343.68 µs

## things to watch out for

### 1. thread safety
- code that was "thread safe" might not be anymore
- race conditions are real now
- might need proper synchronization

### 2. memory handling
- shared memory between threads
- better than copying everything
- need to think about memory access

## wrap up
it's going to be interesting watching the python ecosystem adapt to this. lots of assumptions about thread safety baked into old code that's gonna need reviewing.
probably going to be some fun bug reports in the next few years as people discover their code, and innumerable packages weren't actually thread-safe, they were just GIL-safe.

> "Simple things should be simple, complex things should be possible." - Alan Kay