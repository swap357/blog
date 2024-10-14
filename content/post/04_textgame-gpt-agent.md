+++
author = "Swapnil Patel"
title = "project/ textgame-gpt-agent"
description = ""
tags = [
"code",
"gpt",
]

comments = true
index = 4
+++

I've played text adventure games for years. Remember zork? That was the real deal. No fancy graphics, just pure text and imagination. You'd type commands like "go north" or "take sword" and the game would respond. Simple, but effective.

These games had NPCs with basic scripted responses. Nothing fancy, just if-then logic. You'd ask them something, they'd spit out a pre-written answer. Worked well enough for the time.

The games were complex enough to where you need memory and reasoning, but not so complex that you can't solve them. makes for a good testbed for ai agents.

Large language models trained on massive text datasets can power these NPCs. With the right prompting, they can maintain some semblance of consistent behavior and "personality". 

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

- Functional: The agent demonstrates capability in solving complex puzzles.
- Memory optimization: Efficient memory management is crucial. Insufficient memory leads to cyclic behavior, while excessive memory impacts performance and resource utilization, cost.
- Stochastic exploration: Random action sampling is necessary for state space exploration, similar to epsilon-greedy strategies in reinforcement learning.
- Limitations: The agent exhibits suboptimal decision-making in certain scenarios, resulting in failure states such as termination or environmental hazards.
