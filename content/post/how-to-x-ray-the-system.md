+++
author = "Swapnil Patel"
title = "how to x-ray system with flamescope"
date = "2023-10-01"
description = ""
tags = [
"blog"
]
categories = [
"blog"
]
+++

It's important to understand how efficiently our system is utilizing its CPU cycles. 

The first step is to collect performance data using Linux perf.

Install perf using -
```
sudo apt install -y linux-tools-$(uname -r) linux-cloud-tools-$(uname -r)
```

Collecting profile system-wide for 60 secs-
```
$ sudo perf record -F 49 -a -g -- sleep 60

```
- '-F 49' specifies the frequency of events to collect
- The '-a' flag collects data across all processes, and 
- '-g' collects call-graph information

Once you've collected your data you'll have perf.data, it's time to generate a readable profile for us to parse. Run the following command:

```
$ sudo perf script --header > /tmp/profiles/stacks.myproductionapp.stack1
```
You can choose to gzip the file for easier storage and transportation.
```
gzip stacks.myproductionapp.stack1
```

Let's run flamescope to visualize this now. I've it all containerized.
```
$ docker run --rm -it -d -v /tmp/profiles:/profiles:ro -p 5000:5000 swap357/flamescope
```

The web dashboard should be up and running on <serverIP>:5000. 

!(flamescope-fig1)[https://autoscaler.sh/images/flamegraph-a.png]
!(flamescope-fig2)[https://autoscaler.sh/images/flamegraph-b.png]
!(flamescope-fig3)[https://autoscaler.sh/images/flamegraph-c.png]

Enjoy and until next time!