natural-language-commander
==========================

NLC is a tool for connecting natural language commands with callbacks.

To see NLC in action, see the `todo-chat` [live demo](http://whenther.github.io/todo-chat), or check out its [repo](https://github.com/whenther/todo-chat). 

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

###Gather training data 
A system like this, where a human has to think up all possible ways to
say the command, is never going to be perfect and catch every case.
If building really robust natural language bot is your goal,
you're probably going to end up with a machine learning system - which is going
to need a large number of commands to train on. If you build your
Minimum Viable Product with NLC, you can record every command, and what it
matched to (if anything), and use that data to train your machine learning
algorithm later. And even if you're planning on sticking with NLC, logging
unmatched commands is a good way to find utterances you hadn't thought of.

Installation
------------
Install from npm with
```
npm install natural-language-commander --save
```

And use in node with:
```javascript
var NLC = require('natural-language-commander');
var nlc = new NLC();
```
or with TypeScript:
```typescript
import NLC = require('natural-language-commander');
const nlc = new NLC();
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
and is the `{Item}` in `'add {Item} to my todo list'`.
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
- `WORD`: A single word.
- `NUMBER`: A number, which can include commas. Matches will be returned as numbers.
- `DATE`: A string that's either a common date format
like `1/1/2016`, `Jan 1, 2016`, `2016-01-01`, etc., or a word like
`today` or `tomorrow`.
- `SLACK_USER`: A single word that starts with an `@`, like `@user`.
- `SLACK_ROOM`: A single word that starts with an `#` or a `@`, like `#room`. 

Adding Slot Types
-----------------
To add a custom slot type, call `nlc.addSlot`, passing in a SlotType object with the attributes:
- `type` {string} - The name of the slot type, to be used in intents. Note that you cannot add more
than one slot type with the same name.
- `matcher` {string | string[] | RegExp | (value: string) => string} - This determines if a potential slot
value matches.
  - String: The input must match the string exactly (case insensitive).
  - String Array: The input must match one of the strings exactly (case insensitive).
  - Regular Expression: The input must match the expression.
  - Function: The function must return anything but `undefined` to succeed. The intent will be passed the 
  return value, which lets you normalize slot values.
- `baseMatcher?` {String} - Behind the scenes, NLC uses regular expressions to match your utterances.
By default, it replaces slots with `(.+)`, which is a capture group that will will match a string of any
lenght greater than 1. Then it takes the captured string, and checks it against the slot's matcher.
This generally works well if there is some text between slots, like `{Slot1} then {Slot2}`, 
since the regexp uses the text as natural stopping points. But when two slots are next to each other, like
`{Slot1} {Slot2}`, the first slot may end capturing text that the second slot was looking for, resulting
in a failure to match. The baseMatcher lets you fix that by providing an escaped string version of the
regexp the utterance matcher should use. So, if the slot should only be a single word, you could use
`'\\w+'`, which will only match on a single run of characters, without spaces.
Note that, if you use a regular expression for your matcher, it will also be used as the baseMatcher.

###Examples
```javascript
// Add a slot type that matches against the word 'this'
nlc.addSlotType({
  type: 'STRING_TYPE',
  matcher: 'this'
});

// Add a slot type that matches against 'this' or 'that'
nlc.addSlotType({
  type: 'STRING_ARRAY_TYPE',
  matcher: [
    'this',
    'that'
  ]
});

// Add a slot type that matches phone numbers with a regexp.
nlc.addSlotType({
  type: 'PHONE_TYPE',
  matcher: /\d\d\d-\d\d\d-\d\d\d\d/
});

// Add a slot type with a function that matches strings less than 6 characters long,
// and returns the length.
nlc.addSlotType({
  type: 'SMALL_COUNT_TYPE',
  matcher: (slot) => {
    if (slot.length < 6) {
      return slot.length;
    }
  }
});

// Add a slot type with a baseMatcher that only matches against a single word.
nlc.addSlotType({
  type: 'WORD_TYPE',
  matcher: [
    'this',
    'that'
  ],
  baseMatcher: '\\w+'
});
```

Registering Intents
-------------------

To register an intent, call `nlc.registerIntent` with an Intent object with the attributes:
- `intent` {string} - The name of the intent. `nlc.handleCallback` returns this when it matches an intent.
- `slots?` {IIntentSlot[]} - Optional. An array of slots included in the intent, with the attributes:
  - `name` {string} - The name of the slot, to be used in the intent's utterances.
  - `type` {string} - The name of the associated slot type. If this is a custom type, you should add it
  BEFORE registering an intent that uses it.
If `nlc.handleCallback` included some data, that will be the first argument, and the slots will come after.
This lets you pass along other information about the command, like data about the user who issued it. 
NLC checks utterances in order - so if you have a more specific utterance, like `'say {Something} to {Username}'`,
list that before a less specific command like `'say {Something}'`. Also note that an utterance will match 
against the start of the user input - so if the utterance is `'tell me a joke'`, `'tell me a joke!'` will match,
but `'hey tell me a joke'` will not.
- `utterances`: {string[]} - A list of utterances that will match to the intent.
- `callback` {Function} - The callback to run when the intent matches a command. 
Slots (if any) will be passed in as arguments in the order they were listed in the `slots` array.

###Examples
```javascript
// A simple intent without slots.
nlc.registerIntent({
  intent: 'NO_SLOTS',
  utterances: [
    'this is a test'
  ],
  callback: () => {
    console.log(`it's a match!`);
  },
});

// An intent with a couple slots.
nlc.registerIntent({
  intent: 'SLOTS',
  slots: [
    {
      name: 'Thing',
      // The default string slot type.
      type: 'STRING'
    },
    {
      name: 'ThingType',
      // Some custom slot type
      type: 'ThingTypes'
    }
  ],
  utterances: [
    '{Thing} is a {ThingType}'
  ],
  callback: (thing, thingType) => {
    console.log(`${thing} is a ${thingType}!`);
  },
});

// A intent expecting some data.
nlc.registerIntent({
  intent: 'NO_SLOTS',
  slots: [
    {
      name: 'Thing',
      type: 'STRING'
    }
  ],
  utterances: [
    '{Thing} is a test'
  ],
  // In this case we're expecting nlc.handleCallback to have passed a user object in.
  callback: (user, thing) => {
    console.log(`${user.name} thinks that ${thing} is just a test.`);
  },
});
```

Handling Commands
-----------------
Once your intents are set up, you can start handling commands from users. To do that, call
`nlc.handleCommand`, optionally passing in some arbitrary data to pass along to the matching intent,
and then the text of the user's input.

###Examples
```javascript
// Not passing data.
nlc.handleCommand(userInput)
.catch(() => {
  console.log(`${userInput} didn't match :-(`);
})
.then((intentName) => {
  console.log(`${userInput} matched with ${intentName}!`);
})

// Passing data.
nlc.handleCommand(user, userInput)
.catch(() => {
  console.log(`${userInput} didn't match :-(`);
})
.then((intentName) => {
  console.log(`${userInput} matched with ${intentName}!`);
})
```

Full Example
------------
Here's a full example of using NLC to guess a favorite color.

```javascript
const NLC = require('natural-language-commander');

const nlc = new NLC();

const favoriteColor = 'blue';

// Add a custom color slot type.
nlc.addSlotType({
  type: 'Colors',
  matcher: [
    'red',
    'orange',
    'yellow',
    'green',
    'blue',
    'purple'
  ]
});

// Register an intent for guessing if the bot likes a color.
nlc.registerIntent({
  intent: 'FAVORITE_COLOR_GUESS',
  slots: [
    {
      name: 'Color',
      type: 'Color'
    }
  ],
  utterances: [
    'is your favorite color {Color}',
    'is {Color} the best color',
    'do you like {Color}',
    'do you love {Color}',
  ],
  callback: (color) => {
    if (color.toLowerCase() === favoriteColor) {
      console.log(`Correct! ${color} is my favorite color.`);
    } else {
      console.log(`Sorry, I don't really like ${color}.`);
    }
  }
});

/*
 * Test some commands
 */
nlc.handleCommand('is your favorite color Blue?'); // 'Correct! Blue is my favorite color.'
nlc.handleCommand('do you like blue'); // 'Correct! blue is my favorite color.'
nlc.handleCommand('is red the best color?'); // 'Sorry, I don't really like red.'
nlc.handleCommand('do you love Green'); // 'Sorry, I don't really like Green.'
nlc.handleCommand('do you love tacos'); // No match
nlc.handleCommand('do you think blue is pretty?'); // No match
nlc.handleCommand('what is the meaning of life?'); // No match

/*
 * Logging matches
 */
function logMatch(command) {
  nlc.handleCommand(command)
  .then((intentName) => {
    console.log(`Matched ${intentName}`);
  })
  .catch(() => {
    console.log(`No match`);
  });
}

logMatch('is your favorite color green?'); // Matched FAVORITE_COLOR_GUESS
logMatch('do you think blue is pretty?'); // No match
```

Hubot
-----
NLC pairs particularly well with [Hubot](https://hubot.github.com/), GitHub's bot framework.
It's designed to use regular expressions to match callbacks to commands, but it's pretty
simple to use NLC for better matching, while still having access to the Hubot `res` object
for replying and getting data about users and rooms.

In your hubot script files, instead of using:
```
robot.respond(/is your favorite color (.+)/i, (res) => { ... })
```

Register an intent like:
```javascript
nlc.registerIntent({
  intent: 'SOME_COMMAND',
  slots: [
    name: 'Color',
    type: 'Color'
  ],
  utterances: [
    'is your favorite color {Color}',
    'is {Color} the best color',
    'do you like {Color}',
    'do you love {Color}',
  ],
  // The callback is expecting the Hubot res object, which is the same object
  // the original callback was getting.
  callback: (res, color) => { ... })
});
```

Then, somewhere in your scripts directory, add a catch-all that passes any uncaught
messages to NLC for matching:
```javascript
robot.catchAll((res: hubot.Response) => {
  // This returns early if the text didn't start with the robot's name or one of its
  // aliases, so you're not running every message in the chat through NLC.
  if (!text.match(robot.respondPattern(''))) {
    return;
  }
  
  // Pass the message to nlc. Any matching callback should probably respond with
  // res.send() or something.
  nlc.handleCommand(res, message)
  .catch(() => {
    // Send a failure message if the command didn't match.
    res.send(`Sorry, I can't do that ${res.message.user.name}`);
  });
});
```

Sanitizing Data
---------------
NLC is case insensitive, and handles things like removing extra spaces and common misspellings,
so you shouldn't have to do much processing on an input before passing it in.
However, you should be careful to sanitize any slot values before putting them in a database,
displaying them to users, or otherwise evaluating them, since those are still user-generated strings.
It's probably also a good idea to truncate strings to a reasonable character count, to stop users
from passing in a gig of data and slowing down your server. 

Since NLC doesn't know how you're going to be using it (maybe you want users to be able to tell
your bot long stories, who knows), it doesn't handle sanitization for you.
