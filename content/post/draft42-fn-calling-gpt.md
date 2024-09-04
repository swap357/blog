+++
author = "Swapnil Patel"
title = "draft42: a simple chatbot app using Streamlit with function-calling"
date = "2024-03-04"
description = ""
tags = [
"code",
"gpt",
]

comments = true
+++

I've been working on a simple chatbot app using Streamlit. Sensed a lack of a simple, easy-to-use chatbot, that would allow function-calling with local models, I decided to build my own (learning exercise). This project is intended to serve the following purposes:
- Utilizes Streamlit to create interactive frontend components, providing a seamless user experience.
- Functions within the application are defined as Pydantic models, leveraging the 'instructor' framework for enhanced structure and validation. This helps switch between different GPT models with ease- openAI as well as local models with ollama.
- Experiment with different GPT models and their capabilities to handle choices of tools, function-calling and context-understanding.

The code is quite rough, but wanted to put it out there for feedback and suggestions. I'm looking forward to improving the code and adding more features to it.

Here is a snapshot of bot in action:

![draft42](https://autoscaler.sh/images/draft42.png)

You can find the code on my [github](https://github.com/swap357/draft42).