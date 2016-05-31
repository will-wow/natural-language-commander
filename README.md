natural-language-commander
==========================

NLC is a tool for connecting natural language commands with callbacks.

It's somewhat inspired by Amazon's [Alexa interface](https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/defining-the-voice-interface#h2_sample_utterances) -
so if you've integrated an app with the Amazon Echo, you should
feel right at home.

###Say the same thing in different ways

It's targeted to the case where you're building a bot, and want
users to be able to ask the same question in a bunch of different ways.
Say your bot keeps a todo list for users, and your user needs to buy
some milk. You've got some logic for adding items to their list,
so maybe you use a regular expression like `/put (.+) on my todo list/`
to match the command string with your `addToList` function.
That works great, until your first user tells your bot,
`"add buy milk to my todo list"`, or `"remind me to buy milk"`,
 it fails, and they say, "your bot isn't very smart." Ouch.

NLC helps you solve that problem, by connecting `addToList` to
a bunch of potential ways of saying the same command 
(called utterances), like:
```
[
  'put {Item} on my todo list',
  'add {Item} to my todo list',
  'remind me to {Item}',
  'put {Item} on my list',
  'add {Item} to my list',
  'put {Item} on the list',
  'add {Item} to the list',
  ...
]
``` 

###More specific matching
Besides just having a bunch utterances, NLC also lets you only
count a slot (like `{Item}`) as matching if it meets certain criteria, 
like being in a list of words, looking like a date,
matching a regular expression, or matching an arbitrary function. 
This lets you match `"what's today look like"` with a weather
checker function, and `"what's a sloth look like"` with an image
search function.

###Common Misspellings
NLC knows about common misspellings, like definitely/definately,
and will handle checking for them - so as long as you spell 
your utterances correctly, of course!

Installation
------------
```
npm install natural-language-commander --save
```

NLC is written in TypeScript, and comes with its d.ts definition
file - so you don't have to worry about doing a `typings install`.

Basics
------
NLC has four basic components - Intents, Utterances, Slots, 
and Slot Types.

### Intents
An *intent* is a collection of utterances, slots, and a callback
that collectively describe a single conceptual command, like "add
an item to my todo list."

### Utterances
An *utterance* is a specific way of giving a command, like
`'add {Item}to my todo list'`, or '`remind me to {Item}'`. Each
intent will have many of these.

### Slots
A *slot* is essentially an argument for an intent, which you expect
to show up in a certain place in an utterance. It's often a noun,
and is the `{Item}` in `'add {Item}to my todo list'`.
Checking for slots part of matching a command to an utterance,
and the data in the slot gets passed along to the callback.

### Slot Types
A *slot type* is how you say "for a given slot, only look for these
words or patterns". NLC comes with some common defaults, and you
can add your own.
  

Default Slot Types
------------------
The default slot types are:
- `STRING`: Any string of any length.
- `DATE`: A string that's either a common date format
like `1/1/2016`, `Jan 1, 2016`, `2016-01-01`, etc., or a word like
`today` or `tomorrow`.
- `SLACK_USER`: A single word that starts with an `@`, like `@user`.
- `SLACK_ROOM`: A single word that starts with an `#` or a `@`, like `#user`. 

Adding Slot Types
-----------------


Registering Intents
-------------------


Handling Commands
-----------------

Full Example
------------


Hubot
-----
NLC pairs particularly well with [Hubot](), GitHub's bot framework.