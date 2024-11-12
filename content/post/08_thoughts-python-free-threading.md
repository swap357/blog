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
python's had this GIL(Global Interpreter Lock) thing since '94. 
limits parallel processing. new python interpreter released Oct 2024: 3.13 and 3.13t. 3.13t - free-threaded experimental version finally drops the GIL.

## the backstory
so we've had this global interpreter lock forever. it tells python- "one thread at a time, please" even if you've got cores sitting idle. bit of a bottleneck.

## why gil existed
wasn't actually a bad call back then:
- made memory management pretty straightforward
- single-threaded code ran faster
- didn't need to worry about thread safety internally

but then multi-core processors happened and parallel workloads became a thing.

## workarounds we've been using
few ways we've been dealing with it:

### 1. multiprocessing
when you need actual parallel stuff:

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
when you really need that speed

### how it works now
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

some benchmarks i've been working on to compare interpreter internals:
![output_13_0.png](/images/output_13_0.png)

thread scaling tests:
![output_23_0.png](/images/output_23_0.png)

clearly, single-threaded code is going to be slower. speedups are more pronounced in cpu-bound workloads as we scale the number of threads. using thread local variables show great speedup, with no synchronization overhead.

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
3.13t is cool. about time python evolved and provided something for high perf devs. it's going to be interesting watching the python ecosystem adapt to this. lots of assumptions about thread safety baked into old code that's gonna need reviewing.
probably going to be some fun bug reports in the next few years as people discover their code, and innumerable packages weren't actually thread-safe, they were just GIL-safe.
