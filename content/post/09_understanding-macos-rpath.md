+++
author = "Swapnil Patel"
title = "understanding: macos rpath resolution (wip)"
description = ""
tags = [
"macos",
"rpath",
"dylib",
"cmake",
]
comments = true
index = 9
+++

## tl;dr
macos has a unique approach to runtime library path resolution (RPATH) that differs from Linux. Understanding how RPATH works in macos is crucial for properly distributing applications with dynamic libraries.

## the basics of dylib loading

On macos, dynamic libraries (`.dylib` files) are loaded at runtime using a set of search paths. When your application needs a library, macos follows a specific resolution order:

```ascii
┌─ macos dylib resolution order ─────────────────┐
│ 1. LC_RPATH                                    │
│    ↓                                           │
│ 2. LC_LOAD_DYLIB paths                         │
│    ↓                                           │
│ 3. DYLD_LIBRARY_PATH (if not SIP protected)    │
│    ↓                                           │
│ 4. System paths (/usr/lib, etc.)               │
└───────────────────────────────────────────────┘
```

The key concept here is `@rpath`, which serves as a placeholder for a list of search paths defined by the executable or libraries.
Intention is to provide flexibility and makes your application more portable.

## special path variables

macos provides several special path variables that can be used in RPATH entries:

| Variable | Meaning |
|----------|---------|
| `@executable_path` | Directory of the main executable |
| `@loader_path` | Directory of the file being loaded |
| `@rpath` | Search path list defined by LC_RPATH commands |

## checking rpath information

You can examine RPATH information using these commands:

```bash
otool -L myapp

otool -l myapp | grep -A2 LC_RPATH

install_name_tool -add_rpath @executable_path/../lib myapp
```

## wrap up

Understanding RPATH in macos is essential for creating portable applications. By using `@rpath`, `@executable_path`, and `@loader_path` appropriately, you can ensure your application finds its dynamic dependencies no matter where it's installed.

For a more detailed explanation, the [CMake community wiki](https://gitlab.kitware.com/cmake/community/-/wikis/doc/cmake/RPATH-handling) provides an excellent reference on RPATH handling across different platforms.