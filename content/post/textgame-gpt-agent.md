+++
author = "Swapnil Patel"
title = "zork1 textgame gpt-agent"
date = "2024-04-15"
description = ""
tags = [
"code",
"gpt",
]

comments = true
+++

I've been long-time enthusiast of adventure and strategy games. My distinct memory is playing Poptropica - online adventure game where you can choose one of many islands, each with its own unique story. You interact with NPCs (Non-Player Characters) to understand the story, find clues and solve mystery of the island. 
Other examples - Zelda, Witcher

Traditionally confined to scripted behaviors and limited interactions, have long been the bottleneck to immersive gameplay. 
Now, imagine NPCs that don't just respond, but learn, adapt, and evolve in real-time as they interact with the game world and the player.

LM Agents based on auto-regressive LLMs can be made to act with more intelligence and creativity. 

Some recent references:

- https://github.com/joonspk-research/generative_agents
- https://arxiv.org/pdf/2401.13178v1.pdf
- https://arxiv.org/pdf/2406.06485


One of the projects I worked on recently is a text-based game solver agent. 
The idea is to explore different ways to design agents to solve text-based games.

## Why text-based games?

Text adventures are surprisingly tricky. End to end, the (app+model) needs to:
1. Understand the game's descriptions (nlp)
2. Figure out what's important (information filtering)
3. Come up with good moves (decision making)
4. Remember what happened before (memory)

## How It Works (The Simple Version)

1. **Read the game**: The AI gets the current game context.
3. **Plan**: It comes up with possible actions that make sense.
4. **Choose**: It picks the best action.
5. **Act**: It tells the game what it wants to do, the game responds with observation for taken action, reward and is_game_complete.
6. **Remember**: It keeps track of important info for later.
7. **Repeat**: Back to step 1 until the game is won!

Worked on this project with @bio_bootloader over a hackathon weekend.

https://github.com/biobootloader/text-agent

here is one of the game walkthroughs by agent using claude haiku -

https://github.com/biobootloader/text-agent/blob/main/walkthroughs/history-agentB-haiku.txt

## Observations

- **It actually works!** The agent managed to solve some pretty tricky puzzles.
- **Memory matters**: had to get clever about how the pass and retain info within limited context-langth. Too little memory and gets stuck in a loop, too much and it gets slow (+$$).
- **Exploration is key**: Sometimes the agent needs to try random stuff to discover new things, just like a human player would. think epsilon for RL.
**It's not perfect**: The agent still makes weird choices sometimes like mostly getting eaten or falling off cliff. 
